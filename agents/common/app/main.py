"""
FastAPI application for the common agent framework.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from .models import (
    AgentInfo,
    AgentStatus,
    BackendType,
    Event,
    EventType,
    HealthStatus,
    TaskRequest,
    TaskState,
    TaskStatus,
)
from .observability import StructuredLogger, track_task_metrics
from .security import verify_api_key
from .settings import settings

# Initialize FastAPI app
app = FastAPI(
    title="Agent API",
    description="Standardized API for robotics agents",
    version=settings.AGENT_VERSION,
)

# Initialize logger
logger = StructuredLogger(__name__, settings.LOG_LEVEL)

# In-memory task storage (replace with database in production)
tasks: Dict[str, TaskStatus] = {}

# Event stream subscribers (in production, use Redis pub/sub or similar)
event_streams: Dict[str, asyncio.Queue] = {}


def get_default_backend_type() -> BackendType:
    """Get default backend type from settings."""
    try:
        return BackendType(settings.BACKEND_DEFAULT)
    except ValueError:
        return BackendType.AIM


@app.get("/v1/agent/info", response_model=AgentInfo)
async def get_agent_info():
    """
    Get agent identity and capabilities.
    
    Returns:
        AgentInfo: Agent information
    """
    return AgentInfo(
        robot_id=settings.AGENT_ID,
        robot_type=settings.ROBOT_TYPE,
        capabilities=[],  # To be overridden by specific agents
        version=settings.AGENT_VERSION,
        backend_default=get_default_backend_type(),
    )


@app.get("/v1/agent/health", response_model=HealthStatus)
async def get_agent_health():
    """
    Get agent health status.
    
    Returns:
        HealthStatus: Current health status
    """
    # Basic health check - to be enhanced by specific agents
    return HealthStatus(
        status=AgentStatus.ONLINE,
        last_seen=datetime.now(timezone.utc),
        sensors_ok=True,
        actuators_ok=True,
        backend_available=None,  # To be checked by specific agents
    )


@app.post("/v1/tasks", response_model=TaskStatus, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_request: TaskRequest,
    authenticated: bool = Depends(verify_api_key),
):
    """
    Submit a new task for execution.
    
    Args:
        task_request: Task request with type, input, routing, policy, and trace
        authenticated: Authentication dependency
        
    Returns:
        TaskStatus: Initial task status
    """
    task_id = str(uuid.uuid4())
    
    # Get policy defaults
    e2e_slo_ms = (
        task_request.policy.e2e_slo_ms
        if task_request.policy
        else settings.E2E_SLO_MS_DEFAULT
    )
    timeout_ms = (
        task_request.policy.timeout_ms
        if task_request.policy
        else settings.TIMEOUT_MS_DEFAULT
    )
    
    # Create task status
    task_status = TaskStatus(
        task_id=task_id,
        state=TaskState.PENDING,
        progress=0.0,
        e2e_slo_ms=e2e_slo_ms,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    tasks[task_id] = task_status
    
    # Emit task_created event
    await emit_event(Event(
        event=EventType.TASK_CREATED,
        task_id=task_id,
        data={
            "task_type": task_request.task_type,
            "input": task_request.input,
        },
    ))
    
    # Log task creation
    logger.log_task(
        "info",
        "Task created",
        task_id=task_id,
        task_type=task_request.task_type,
        robot_type=settings.ROBOT_TYPE,
        request_id=task_request.trace.request_id if task_request.trace else None,
        session_id=task_request.trace.session_id if task_request.trace else None,
    )
    
    # Start task execution in background (to be implemented by specific agents)
    # For now, just mark as acknowledged
    task_status.state = TaskState.ACKNOWLEDGED
    task_status.updated_at = datetime.now(timezone.utc)
    
    await emit_event(Event(
        event=EventType.ACK_SENT,
        task_id=task_id,
        data={},
    ))
    
    return task_status


@app.get("/v1/tasks/{task_id}", response_model=TaskStatus)
async def get_task_status(
    task_id: str,
    authenticated: bool = Depends(verify_api_key),
):
    """
    Get task execution status.
    
    Args:
        task_id: Task identifier
        authenticated: Authentication dependency
        
    Returns:
        TaskStatus: Current task status
        
    Raises:
        HTTPException: If task not found
    """
    if task_id not in tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    
    return tasks[task_id]


@app.get("/v1/metrics")
async def get_metrics(authenticated: bool = Depends(verify_api_key)):
    """
    Get Prometheus metrics.
    
    Args:
        authenticated: Authentication dependency
        
    Returns:
        Response: Prometheus metrics in text format
    """
    from fastapi import Response
    from .observability import get_metrics
    
    metrics_text = get_metrics()
    return Response(content=metrics_text, media_type="text/plain; version=0.0.4; charset=utf-8")


@app.get("/v1/events")
async def stream_events(
    request: Request,
    authenticated: bool = Depends(verify_api_key),
):
    """
    Stream Server-Sent Events (SSE) for real-time updates.
    
    Args:
        request: FastAPI request object
        authenticated: Authentication dependency
        
    Yields:
        EventSourceResponse: SSE event stream
    """
    stream_id = str(uuid.uuid4())
    event_queue = asyncio.Queue()
    event_streams[stream_id] = event_queue
    
    async def event_generator():
        """Generate SSE events from queue."""
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for event with timeout
                    event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
                    yield {
                        "event": event.event.value,
                        "data": event.model_dump_json(),
                    }
                except asyncio.TimeoutError:
                    # Send heartbeat
                    yield {
                        "event": "heartbeat",
                        "data": '{"timestamp": "' + datetime.now(timezone.utc).isoformat() + '"}',
                    }
        finally:
            # Clean up
            if stream_id in event_streams:
                del event_streams[stream_id]
    
    return EventSourceResponse(event_generator())


async def emit_event(event: Event):
    """
    Emit event to all connected SSE streams.
    
    Args:
        event: Event to emit
    """
    for queue in event_streams.values():
        try:
            await queue.put(event)
        except Exception as e:
            logger.error(f"Failed to emit event: {e}")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Agent API",
        "version": settings.AGENT_VERSION,
        "robot_id": settings.AGENT_ID,
        "robot_type": settings.ROBOT_TYPE,
        "endpoints": {
            "info": "/v1/agent/info",
            "health": "/v1/agent/health",
            "tasks": "/v1/tasks",
            "metrics": "/v1/metrics",
            "events": "/v1/events",
        },
    }


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}

