"""
Reachy Agent - Main application extending common framework.
Implements DevOps copilot scenario with gesture feedback.
"""
import sys
import os
import uuid
from pathlib import Path

# Module initialization - debug output can be removed in production
import sys
if os.getenv("DEBUG", "false").lower() == "true":
    sys.stderr.write("=" * 80 + "\n")
    sys.stderr.write("REACHY AGENT MAIN.PY IS BEING LOADED\n")
    sys.stderr.write("=" * 80 + "\n")
    sys.stderr.flush()

# CRITICAL: Import common framework
# We calculate the path explicitly to ensure it works in uvicorn subprocess
# Get absolute path to common framework
_this_file = Path(__file__).resolve()
common_parent = _this_file.parent.parent.parent / "common"
common_parent_str = str(common_parent.resolve())

# Debug output (can be removed later)
import logging
_logger = logging.getLogger(__name__)
_logger.debug(f"Loading reachy-agent: __file__={_this_file}, common={common_parent_str}")

# Verify the path exists
if not common_parent.exists():
    error_msg = (
        f"Common framework not found at {common_parent_str}. "
        f"Current file: {_this_file}, Calculated path: {common_parent}, "
        f"CWD: {os.getcwd()}, PYTHONPATH: {os.environ.get('PYTHONPATH', 'NOT SET')}"
    )
    raise ImportError(error_msg)

# CRITICAL: Manipulate sys.path BEFORE any imports
# We need to ensure:
# 1. Common framework is found first for imports like "app.models"
# 2. Current directory stays in sys.path so uvicorn can find our "app.main"
# Store current directory
current_dir = os.getcwd()
parent_dir = str(Path(current_dir).parent)

# DON'T remove current directory - uvicorn needs it to find our app.main!
# Just ensure common framework comes FIRST in sys.path
# Remove only empty strings and parent directory to avoid conflicts
for path_to_remove in ['', parent_dir]:
    while path_to_remove in sys.path:
        sys.path.remove(path_to_remove)

# Add common path FIRST (before any other paths)
if common_parent_str not in sys.path:
    sys.path.insert(0, common_parent_str)
    _logger.debug(f"Added {common_parent_str} to sys.path")

# Also check PYTHONPATH environment variable and add if needed
if 'PYTHONPATH' in os.environ:
    pythonpath_dirs = [d for d in os.environ['PYTHONPATH'].split(':') if d]
    for dir_path in pythonpath_dirs:
        abs_path = str(Path(dir_path).resolve())
        if abs_path not in sys.path:
            sys.path.insert(0, abs_path)
            _logger.debug(f"Added {abs_path} from PYTHONPATH to sys.path")

# Now import common framework using importlib.util to load directly from file paths
# This bypasses sys.path lookup and avoids conflicts with local app/ directory
import importlib
import importlib.util

def load_module_from_path(module_name: str, file_path: Path, package_name: str = None):
    """Load a module directly from a file path, ensuring it's part of the correct package."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load spec for {module_name} from {file_path}")
    module = importlib.util.module_from_spec(spec)
    # Set __package__ to ensure relative imports work
    if package_name:
        module.__package__ = package_name
    # Add to sys.modules to make it importable
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Import common framework modules directly from file paths
# Use 'app.*' as module names to ensure relative imports work
try:
    common_models = load_module_from_path(
        "app.models",
        common_parent / "app" / "models.py",
        package_name="app"
    )
    common_settings_module = load_module_from_path(
        "app.settings",
        common_parent / "app" / "settings.py",
        package_name="app"
    )
    common_observability = load_module_from_path(
        "app.observability",
        common_parent / "app" / "observability.py",
        package_name="app"
    )
    common_security = load_module_from_path(
        "app.security",
        common_parent / "app" / "security.py",
        package_name="app"
    )
    common_main = load_module_from_path(
        "app.main",
        common_parent / "app" / "main.py",
        package_name="app"
    )
except Exception as e:
    error_msg = (
        f"Failed to import common framework modules. "
        f"sys.path[0]={sys.path[0] if sys.path else 'EMPTY'}, "
        f"common_path={common_parent_str}, "
        f"cwd={os.getcwd()}, "
        f"error={e}"
    )
    raise ImportError(error_msg) from e

# Now safe to import FastAPI and other dependencies
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status, BackgroundTasks, Body

# CRITICAL: Add current directory back to sys.path AFTER loading common framework
# This ensures uvicorn can import our local app.main module when it does "app.main:app"
# We add it at the END so common framework is still found first for its imports
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Get references to common framework components
app = common_main.app
tasks = common_main.tasks
emit_event = common_main.emit_event
verify_api_key = common_main.verify_api_key

# Add CORS middleware to allow frontend to access the API
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://localhost:5173", "http://localhost:3000"],  # Common dev ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# App object successfully loaded from common framework

# Logger will be initialized below, so we can't log here yet

# Import models and other components from common framework
TaskRequest = common_models.TaskRequest
TaskStatus = common_models.TaskStatus
TaskState = common_models.TaskState
EventType = common_models.EventType
Event = common_models.Event
BackendType = common_models.BackendType
AgentInfo = common_models.AgentInfo
HealthStatus = common_models.HealthStatus
AgentStatus = common_models.AgentStatus

common_settings = common_settings_module.settings
StructuredLogger = common_observability.StructuredLogger
track_task_metrics = common_observability.track_task_metrics
verify_api_key = common_security.verify_api_key

# Initialize logger (needed for route patching)
logger = StructuredLogger(__name__)

# Override settings for Reachy agent
common_settings.AGENT_ID = os.getenv("AGENT_ID", "reachy-001")
common_settings.ROBOT_TYPE = "reachy"
common_settings.AGENT_VERSION = "0.1.0"

# CRITICAL: Remove the common framework's /v1/agent/info route and replace it
# We need to find and remove it by index, then add our own
route_index_to_remove = None
for i, route in enumerate(app.routes):
    if hasattr(route, 'path') and route.path == "/v1/agent/info":
        if hasattr(route, 'methods') and "GET" in route.methods:
            route_index_to_remove = i
            break

if route_index_to_remove is not None:
    removed_route = app.routes.pop(route_index_to_remove)
    logger.info(f"Removed common framework /v1/agent/info route, replacing with Reachy-specific handler")
else:
    logger.warning(f"/v1/agent/info route not found in app.routes - this may indicate a configuration issue")

# Now add our Reachy-specific route handler
# This will be the only /v1/agent/info route
@app.get("/v1/agent/info", response_model=AgentInfo)
async def get_agent_info_reachy():
    """Get Reachy agent identity and capabilities."""
    logger.debug("Returning Reachy-specific agent info")
    return AgentInfo(
        robot_id=common_settings.AGENT_ID,
        robot_type="reachy",
        capabilities=[
            "devops_copilot",
            "gestures",
            "openai_compatible_inference"
        ],
        version=common_settings.AGENT_VERSION,
        backend_default=BackendType.AIM,
    )

# Import Reachy-specific modules
from .backend_client import BackendClient
from .gestures import GestureController
from .reachy_driver import ReachyDriver

# Logger is already initialized above for route patching

# Initialize Reachy driver
# Check config file first, then environment variable
from app.config_manager import is_hardware_enabled, is_audio_enabled

# Priority: config file > environment variable > default
config_hardware_enabled = is_hardware_enabled()
env_mocked = os.getenv("REACHY_MOCKED", "").lower()
if env_mocked and env_mocked not in ("false", "0", "no", "off"):
    # Environment variable explicitly set, use it
    reachy_mocked = True
elif config_hardware_enabled:
    # Config says hardware enabled
    reachy_mocked = False
else:
    # Default: hardware disabled for safety
    reachy_mocked = True

reachy_driver = ReachyDriver(mocked=reachy_mocked)
gesture_controller = GestureController(driver=reachy_driver if not reachy_driver.mocked else None)

# Log initial state
if not reachy_mocked:
    logger.info(
        "Hardware mode enabled - connection will be attempted on first gesture/audio call",
        mocked=reachy_mocked,
        driver_connected=reachy_driver.is_connected()
    )
else:
    logger.info("Running in mocked mode", mocked=reachy_mocked)

# Initialize audio controller
from app.audio import AudioController
audio_controller = AudioController(robot=None)  # Will be set when robot connects

# Note: Connection to hardware will happen on first use
# The driver will attempt to connect when gestures are executed
# This avoids blocking startup if hardware is not available

# Override settings for Reachy agent (already done above, but ensure it's set)
common_settings.AGENT_ID = os.getenv("AGENT_ID", "reachy-001")
common_settings.ROBOT_TYPE = "reachy"
common_settings.AGENT_VERSION = "0.1.0"

# CRITICAL: Remove the common framework's /v1/tasks route and replace it
# We need to find and remove it by index, then add our own
route_index_to_remove = None
for i, route in enumerate(app.routes):
    if hasattr(route, 'path') and route.path == "/v1/tasks":
        if hasattr(route, 'methods') and "POST" in route.methods:
            route_index_to_remove = i
            break

if route_index_to_remove is not None:
    removed_route = app.routes.pop(route_index_to_remove)
    logger.info(f"Removed common framework /v1/tasks route, replacing with Reachy-specific handler")
else:
    logger.warning(f"/v1/tasks route not found in app.routes - this may indicate a configuration issue")


@app.get("/v1/agent/health", response_model=HealthStatus)
async def get_agent_health():
    """Get Reachy agent health status."""
    # Check driver connection
    driver_ok = reachy_driver.is_connected() or reachy_driver.mocked
    safety_ok = reachy_driver.check_safety()
    
    return HealthStatus(
        status=AgentStatus.ONLINE if (driver_ok and safety_ok) else AgentStatus.DEGRADED,
        last_seen=datetime.now(timezone.utc),
        sensors_ok=driver_ok,
        actuators_ok=driver_ok,
        backend_available=None,  # Could check AIM backend here
    )


@app.post("/v1/tasks", response_model=TaskStatus, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_request: TaskRequest,
    background_tasks: BackgroundTasks,
    authenticated: bool = Depends(verify_api_key),
):
    """
    Submit a new task for execution.
    Implements reachy_devops_copilot task type.
    """
    task_id = str(uuid.uuid4())
    
    # Get policy defaults
    e2e_slo_ms = (
        task_request.policy.e2e_slo_ms
        if task_request.policy
        else common_settings.E2E_SLO_MS_DEFAULT
    )
    timeout_ms = (
        task_request.policy.timeout_ms
        if task_request.policy
        else common_settings.TIMEOUT_MS_DEFAULT
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
        robot_type="reachy",
        request_id=task_request.trace.request_id if task_request.trace else None,
        session_id=task_request.trace.session_id if task_request.trace else None,
    )
    
    # Start task execution in background using FastAPI BackgroundTasks
    # This ensures the task runs after the response is sent
    async def safe_execute():
        try:
            print(f"🔵🔵🔵 BACKGROUND TASK EXECUTING for task_id: {task_id} 🔵🔵🔵", flush=True)
            logger.info(f"Background task started for task_id: {task_id}")
            await execute_task(task_id, task_request)
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            logger.error(
                "Task execution failed with unhandled exception",
                task_id=task_id,
                error=str(e),
                error_type=type(e).__name__,
                traceback=error_traceback
            )
            # Update task status to failed
            if task_id in tasks:
                tasks[task_id].state = TaskState.FAILED
                tasks[task_id].error = f"Unhandled exception: {str(e)}"
                tasks[task_id].updated_at = datetime.now(timezone.utc)
    
    # Add the background task - FastAPI will execute it after the response is sent
    print(f"🔵 About to add background task for task_id: {task_id}", flush=True)
    logger.info(f"Scheduled background task for task_id: {task_id}")
    background_tasks.add_task(safe_execute)
    print(f"🔵✅ Background task added for task_id: {task_id}", flush=True)
    logger.info(f"Background task added successfully for task_id: {task_id}")
    
    return task_status


async def execute_task(task_id: str, task_request: TaskRequest):
    """
    Execute a task asynchronously.
    Implements the DevOps copilot scenario.
    """
    start_time = datetime.now(timezone.utc)
    
    logger.info(
        "Starting task execution",
        task_id=task_id,
        task_type=task_request.task_type
    )
    
    with track_task_metrics(task_request.task_type, "reachy", task_id):
        try:
            # Update state to acknowledged
            tasks[task_id].state = TaskState.ACKNOWLEDGED
            tasks[task_id].updated_at = datetime.now(timezone.utc)
            
            # Emit ack_sent event and perform gesture
            await emit_event(Event(
                event=EventType.ACK_SENT,
                task_id=task_id,
                data={},
            ))
            
            # Ensure driver is connected before performing gesture
            if not reachy_driver.mocked and not reachy_driver.is_connected():
                logger.info("Attempting to connect to robot before ACK gesture...")
                try:
                    # Wait a bit for daemon/Zenoh to be ready if needed
                    from app.daemon_manager import is_daemon_running, wait_for_zenoh_ready
                    import asyncio
                    if is_daemon_running():
                        # Daemon is running, ensure Zenoh is ready (run in executor since it's blocking)
                        loop = asyncio.get_event_loop()
                        zenoh_ready = await loop.run_in_executor(None, wait_for_zenoh_ready, 5.0)
                        if not zenoh_ready:
                            logger.warning("Zenoh not ready, but attempting connection anyway")
                    
                    connected = await reachy_driver.connect(force=True)
                    if connected and reachy_driver.is_connected():
                        robot_instance = reachy_driver.get_robot()
                        logger.info("Successfully connected to robot", driver_connected=reachy_driver.is_connected(), robot_available=robot_instance is not None, robot_type=type(robot_instance).__name__ if robot_instance else None)
                        # Update audio controller with robot instance
                        if robot_instance:
                            audio_controller.robot = robot_instance
                            audio_controller.is_mocked = False
                            logger.info("Audio controller updated with robot instance", audio_mocked=audio_controller.is_mocked, has_media=hasattr(robot_instance, 'media'), has_play_sound=hasattr(robot_instance.media, 'play_sound') if hasattr(robot_instance, 'media') else False)
                        else:
                            logger.warning("Robot instance is None after connection")
                    else:
                        logger.warning("Failed to connect to robot, gesture may be skipped", driver_connected=reachy_driver.is_connected())
                except Exception as e:
                    logger.error("Exception during robot connection attempt", error=str(e), error_type=type(e).__name__)
            
            # Log gesture attempt state
            robot_before_gesture = reachy_driver.get_robot() if reachy_driver.is_connected() else None
            logger.info("About to perform ACK gesture", driver_mocked=reachy_driver.mocked, driver_connected=reachy_driver.is_connected(), gesture_controller_mocked=gesture_controller.is_mocked, robot_available=robot_before_gesture is not None, robot_type=type(robot_before_gesture).__name__ if robot_before_gesture else None)
            await gesture_controller.ack_gesture()
            
            # Check if this is a DevOps copilot task
            if task_request.task_type != "reachy_devops_copilot":
                raise ValueError(f"Unknown task type: {task_request.task_type}")
            
            # Get prompt from input
            prompt = task_request.input.get("prompt", "")
            if not prompt:
                raise ValueError("Missing 'prompt' in task input")
            
            # Determine backend configuration
            backend = BackendType.AIM
            base_url = common_settings.AIM_BASE_URL_DEFAULT or "https://aim.example.com/v1"
            api_key = common_settings.AIM_API_KEY_DEFAULT
            
            if task_request.routing:
                backend = task_request.routing.backend
                base_url = task_request.routing.base_url
                api_key = task_request.routing.api_key or api_key
            
            # Update state to running
            tasks[task_id].state = TaskState.RUNNING
            tasks[task_id].progress = 0.2
            tasks[task_id].updated_at = datetime.now(timezone.utc)
            
            # Emit inference_started event and perform thinking gesture
            await emit_event(Event(
                event=EventType.INFERENCE_STARTED,
                task_id=task_id,
                data={"backend": str(backend)},
            ))
            await gesture_controller.thinking_gesture()
            
            # Call backend for inference
            aim_latency_ms = None
            response_content = ""
            
            try:
                async with BackendClient(backend, base_url, api_key) as client:
                    # Use model from task input or default to Qwen3-32B (common AIM model)
                    model = task_request.input.get("model", "Qwen/Qwen3-32B")
                    
                    messages = [
                        {"role": "system", "content": "You are a helpful DevOps assistant."},
                        {"role": "user", "content": prompt}
                    ]
                    
                    result = await client.chat_completion(
                        model=model,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=1000
                    )
                    
                    response_content = result["content"]
                    aim_latency_ms = result["latency_ms"]
                    
            except Exception as e:
                logger.error(
                    "Backend inference failed",
                    task_id=task_id,
                    error=str(e),
                    backend=str(backend)
                )
                raise
            
            # Emit inference_done event
            await emit_event(Event(
                event=EventType.INFERENCE_DONE,
                task_id=task_id,
                data={"aim_ms": aim_latency_ms},
            ))
            
            # Perform done gesture
            logger.info("About to perform done gesture", driver_connected=reachy_driver.is_connected())
            await gesture_controller.done_gesture()
            
            # Play audio response through robot's speaker (if enabled)
            # Check config file first, then environment variable
            config_audio_enabled = is_audio_enabled()
            env_audio_enabled = os.getenv("REACHY_AUDIO_ENABLED", "").lower()
            if env_audio_enabled and env_audio_enabled in ("false", "0", "no", "off"):
                audio_enabled = False
            else:
                audio_enabled = config_audio_enabled
            
            # Log audio configuration for debugging
            logger.info(
                "Audio check",
                audio_enabled=audio_enabled,
                response_content_length=len(response_content) if response_content else 0,
                response_content_preview=response_content[:100] + "..." if response_content and len(response_content) > 100 else (response_content or ""),
                driver_mocked=reachy_driver.mocked,
                driver_connected=reachy_driver.is_connected()
            )
            
            if audio_enabled and response_content:
                # Update audio controller with robot instance if available
                robot_instance = None
                if not reachy_driver.mocked:
                    # Ensure driver is connected
                    if not reachy_driver.is_connected():
                        # Try to connect
                        await reachy_driver.connect()
                    
                    if reachy_driver.is_connected():
                        robot_instance = reachy_driver.get_robot()
                        if robot_instance:
                            audio_controller.robot = robot_instance
                            audio_controller.is_mocked = False
                            logger.info("Audio: Robot connected, audio enabled", has_media=hasattr(robot_instance, 'media'))
                        else:
                            logger.warning("Audio: Robot instance is None")
                    else:
                        logger.warning("Audio: Robot not connected, using mocked mode")
                else:
                    logger.info("Audio: Hardware mocked, using mocked audio")
                
                # Speak the response
                # Double-check robot is set before speaking
                if audio_controller.robot and hasattr(audio_controller.robot, 'media'):
                    logger.info("Audio: Robot and media available, speaking...", robot_type=type(audio_controller.robot).__name__)
                else:
                    logger.warning("Audio: Robot or media not available before speak", robot_available=audio_controller.robot is not None, is_mocked=audio_controller.is_mocked)
                
                # Actually speak
                speak_result = await audio_controller.speak(response_content)
                logger.info("Audio: Speak completed", success=speak_result, text_length=len(response_content))
            
            # Calculate end-to-end latency
            end_time = datetime.now(timezone.utc)
            e2e_ms = int((end_time - start_time).total_seconds() * 1000)
            slo_pass = e2e_ms <= tasks[task_id].e2e_slo_ms if tasks[task_id].e2e_slo_ms else None
            
            # Update task status
            tasks[task_id].state = TaskState.COMPLETED
            tasks[task_id].progress = 1.0
            tasks[task_id].latency_ms = e2e_ms
            tasks[task_id].aim_latency_ms = aim_latency_ms
            tasks[task_id].e2e_ms = e2e_ms
            tasks[task_id].slo_pass = slo_pass
            tasks[task_id].result = {
                "content": response_content,
                "prompt": prompt,
            }
            tasks[task_id].updated_at = datetime.now(timezone.utc)
            
            # Log completion
            logger.log_task(
                "info",
                "Task completed",
                task_id=task_id,
                task_type=task_request.task_type,
                robot_type="reachy",
                request_id=task_request.trace.request_id if task_request.trace else None,
                session_id=task_request.trace.session_id if task_request.trace else None,
                backend_used=str(backend),
                aim_ms=aim_latency_ms,
                e2e_ms=e2e_ms,
                slo_pass=slo_pass,
            )
            
            # Emit task_done event
            await emit_event(Event(
                event=EventType.TASK_DONE,
                task_id=task_id,
                data={
                    "e2e_ms": e2e_ms,
                    "aim_ms": aim_latency_ms,
                    "slo_pass": slo_pass,
                },
            ))
            
        except Exception as e:
            # Update task status to failed
            if task_id in tasks:
                tasks[task_id].state = TaskState.FAILED
                tasks[task_id].error = str(e)
                tasks[task_id].updated_at = datetime.now(timezone.utc)
            
            # Perform error gesture
            try:
                await gesture_controller.error_gesture()
            except Exception as gesture_error:
                logger.error("Failed to perform error gesture", error=str(gesture_error))
            
            # Log error with full traceback
            import traceback
            logger.log_task(
                "error",
                "Task failed",
                task_id=task_id,
                task_type=task_request.task_type,
                robot_type="reachy",
                error=str(e),
                traceback=traceback.format_exc(),
            )
            
            # Emit task_failed event
            try:
                await emit_event(Event(
                    event=EventType.TASK_FAILED,
                    task_id=task_id,
                    data={"error": str(e)},
                ))
            except Exception as emit_error:
                logger.error("Failed to emit task_failed event", error=str(emit_error))


# Management API endpoints
from app.config_manager import get_config, set_hardware_enabled, set_audio_enabled, is_hardware_enabled, is_audio_enabled
import subprocess
import signal

@app.get("/v1/agent/config")
async def get_agent_config():
    """Get current agent configuration."""
    config = get_config()
    config_hardware_enabled = config.get("hardware_enabled", False)
    config_audio_enabled = config.get("audio_enabled", True)
    
    # Check what the actual state is
    env_mocked = os.getenv("REACHY_MOCKED", "").lower()
    env_audio = os.getenv("REACHY_AUDIO_ENABLED", "").lower()
    
    return {
        "config_file": {
            "hardware_enabled": config_hardware_enabled,
            "audio_enabled": config_audio_enabled
        },
        "environment": {
            "REACHY_MOCKED": env_mocked if env_mocked else "not set",
            "REACHY_AUDIO_ENABLED": env_audio if env_audio else "not set"
        },
        "runtime": {
            "current_mocked": reachy_driver.mocked,
            "driver_connected": reachy_driver.is_connected(),
            "hardware_enabled": not reachy_driver.mocked,
            "audio_enabled": is_audio_enabled()
        }
    }

@app.post("/v1/agent/config/hardware")
async def set_hardware_config(enabled: bool = Body(..., embed=False)):
    """Set hardware enabled state. Accepts raw boolean in JSON body."""
    try:
        set_hardware_enabled(enabled)
        return {
            "success": True,
            "hardware_enabled": enabled,
            "message": f"Hardware {'enabled' if enabled else 'disabled'}. Call /v1/agent/reload to apply changes."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/agent/config/audio")
async def set_audio_config(enabled: bool = Body(..., embed=False)):
    """Set audio enabled state. Accepts raw boolean in JSON body."""
    try:
        set_audio_enabled(enabled)
        return {
            "success": True,
            "audio_enabled": enabled,
            "message": f"Audio {'enabled' if enabled else 'disabled'}. Restart agent to apply changes."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/agent/reload")
async def reload_config():
    """Reload configuration and update driver without full restart."""
    global reachy_driver, gesture_controller, audio_controller
    
    try:
        # Import daemon manager
        from app.daemon_manager import ensure_daemon_running, stop_daemon, wait_for_zenoh_ready
        
        # Reload config
        config_hardware_enabled = is_hardware_enabled()
        config_audio_enabled = is_audio_enabled()
        env_mocked = os.getenv("REACHY_MOCKED", "").lower()
        env_audio_enabled = os.getenv("REACHY_AUDIO_ENABLED", "").lower()
        
        # Determine hardware state (config file takes precedence over env var)
        if env_mocked and env_mocked not in ("false", "0", "no", "off"):
            new_mocked = True
        elif config_hardware_enabled:
            new_mocked = False
        else:
            new_mocked = True
        
        # Determine audio state (config file takes precedence over env var)
        if env_audio_enabled and env_audio_enabled in ("false", "0", "no", "off"):
            new_audio_enabled = False
        else:
            new_audio_enabled = config_audio_enabled
        
        # Manage daemon based on hardware state
        if not new_mocked:
            # Hardware enabled - ensure daemon is running
            logger.info("Hardware enabled - ensuring daemon is running...")
            daemon_started = ensure_daemon_running()
            if daemon_started:
                logger.info("Daemon is running, waiting for Zenoh service to be ready...")
                # Wait for Zenoh service to be ready (with timeout)
                zenoh_ready = wait_for_zenoh_ready(timeout=10.0)
                if not zenoh_ready:
                    logger.warning("Zenoh service not ready - connection may fail")
            else:
                logger.warning("Failed to start daemon - hardware may not work")
        else:
            # Hardware disabled - can optionally stop daemon (but we'll leave it running for now)
            # Users might want to use the daemon dashboard even if agent is in mocked mode
            pass
        
        # Update driver if state changed
        if reachy_driver.mocked != new_mocked:
            # Disconnect old driver
            if reachy_driver.is_connected():
                await reachy_driver.disconnect()
            
            # Create new driver with updated state
            reachy_driver = ReachyDriver(mocked=new_mocked)
            gesture_controller = GestureController(driver=reachy_driver if not reachy_driver.mocked else None)
            
            # Update audio controller robot reference
            if not new_mocked and reachy_driver.is_connected():
                robot_instance = reachy_driver.get_robot()
                if robot_instance:
                    audio_controller.robot = robot_instance
                    audio_controller.is_mocked = False
            else:
                audio_controller.robot = None
                audio_controller.is_mocked = True
            
            # If hardware is now enabled, try to connect (but don't fail if it doesn't work yet)
            if not new_mocked:
                try:
                    # Wait a bit more for everything to settle
                    import asyncio
                    await asyncio.sleep(1)
                    
                    connected = await reachy_driver.connect(force=True)
                    if connected and reachy_driver.is_connected():
                        robot_instance = reachy_driver.get_robot()
                        logger.info("Hardware connected successfully after config reload", robot_available=robot_instance is not None, robot_type=type(robot_instance).__name__ if robot_instance else None, has_head=hasattr(robot_instance, 'head') if robot_instance else False, has_media=hasattr(robot_instance, 'media') if robot_instance else False)
                        # Update audio controller with robot instance
                        if robot_instance:
                            audio_controller.robot = robot_instance
                            audio_controller.is_mocked = False
                            logger.info("Audio controller updated with robot instance", audio_mocked=audio_controller.is_mocked)
                        else:
                            logger.warning("Robot instance is None after successful connection")
                    else:
                        logger.info("Hardware enabled but connection not yet available - will retry on first use", driver_connected=reachy_driver.is_connected())
                except Exception as e:
                    logger.info("Connection attempt after config reload (will retry on first use)", error=str(e), error_type=type(e).__name__)
            
            logger.info(
                "Configuration reloaded",
                hardware_enabled=not new_mocked,
                audio_enabled=new_audio_enabled,
                mocked=new_mocked,
                connected=reachy_driver.is_connected()
            )
        
        return {
            "success": True,
            "hardware_enabled": not new_mocked,
            "audio_enabled": new_audio_enabled,
            "mocked": new_mocked,
            "connected": reachy_driver.is_connected(),
            "message": "Configuration reloaded successfully"
        }
    except Exception as e:
        logger.error("Failed to reload config", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# App is already imported from common framework
# We override specific routes below

