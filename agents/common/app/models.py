"""
Pydantic models for the Agent API.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BackendType(str, Enum):
    """Backend inference provider type."""
    LOCAL = "local"
    AIM = "aim"


class TaskState(str, Enum):
    """Task execution state."""
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentStatus(str, Enum):
    """Agent health status."""
    ONLINE = "online"
    DEGRADED = "degraded"
    OFFLINE = "offline"


class RoutingConfig(BaseModel):
    """Backend routing configuration."""
    backend: BackendType = Field(..., description="Backend provider type")
    base_url: str = Field(..., description="Base URL for the backend API")
    api_key: Optional[str] = Field(None, description="API key for authentication")


class PolicyConfig(BaseModel):
    """Task execution policy configuration."""
    e2e_slo_ms: int = Field(2500, description="End-to-end SLO in milliseconds", ge=0)
    timeout_ms: int = Field(2200, description="Task timeout in milliseconds", ge=0)


class TraceConfig(BaseModel):
    """Request tracing configuration."""
    session_id: Optional[str] = Field(None, description="Session identifier")
    request_id: Optional[str] = Field(None, description="Request identifier")


class TaskRequest(BaseModel):
    """Task submission request."""
    task_type: str = Field(..., description="Type of task to execute")
    input: Dict[str, Any] = Field(..., description="Task input parameters")
    routing: Optional[RoutingConfig] = Field(None, description="Backend routing override")
    policy: Optional[PolicyConfig] = Field(None, description="Task execution policy")
    trace: Optional[TraceConfig] = Field(None, description="Request tracing information")


class TaskStatus(BaseModel):
    """Task execution status."""
    task_id: str = Field(..., description="Unique task identifier")
    state: TaskState = Field(..., description="Current task state")
    progress: float = Field(0.0, description="Task progress (0.0 to 1.0)", ge=0.0, le=1.0)
    latency_ms: Optional[int] = Field(None, description="Task latency in milliseconds")
    aim_latency_ms: Optional[int] = Field(None, description="AIM backend latency in milliseconds")
    e2e_ms: Optional[int] = Field(None, description="End-to-end latency in milliseconds")
    e2e_slo_ms: Optional[int] = Field(None, description="End-to-end SLO in milliseconds")
    slo_pass: Optional[bool] = Field(None, description="Whether SLO was met")
    result: Optional[Dict[str, Any]] = Field(None, description="Task result")
    error: Optional[str] = Field(None, description="Error message if task failed")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Task creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp")


class AgentInfo(BaseModel):
    """Agent identity and capabilities."""
    robot_id: str = Field(..., description="Unique robot identifier")
    robot_type: str = Field(..., description="Type of robot (e.g., 'reachy', 'lekiwi', 'so101')")
    capabilities: List[str] = Field(default_factory=list, description="List of supported capabilities")
    version: str = Field(..., description="Agent version")
    backend_default: Optional[BackendType] = Field(None, description="Default backend type")


class HealthStatus(BaseModel):
    """Agent health status."""
    status: AgentStatus = Field(..., description="Current health status")
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last health check timestamp")
    sensors_ok: bool = Field(True, description="Whether sensors are operational")
    actuators_ok: bool = Field(True, description="Whether actuators are operational")
    backend_available: Optional[bool] = Field(None, description="Whether backend is available")
    uptime_seconds: Optional[float] = Field(None, description="Agent uptime in seconds")


class EventType(str, Enum):
    """SSE event types."""
    TASK_CREATED = "task_created"
    ACK_SENT = "ack_sent"
    INFERENCE_STARTED = "inference_started"
    INFERENCE_DONE = "inference_done"
    GESTURE_DONE = "gesture_done"
    TASK_DONE = "task_done"
    TASK_FAILED = "task_failed"
    PROGRESS_UPDATE = "progress_update"


class Event(BaseModel):
    """Server-Sent Event (SSE) event."""
    event: EventType = Field(..., description="Event type")
    task_id: Optional[str] = Field(None, description="Associated task ID")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Event timestamp")

