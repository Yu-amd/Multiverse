"""
SO-101 Agent - Main application using common framework.
Provides health, info, and teleop management endpoints.
"""
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

# CRITICAL: Import common framework via explicit path to avoid conflicts
_this_file = Path(__file__).resolve()
common_parent = _this_file.parent.parent.parent / "common"
common_parent_str = str(common_parent.resolve())

if not common_parent.exists():
    raise ImportError(f"Common framework not found at {common_parent_str}")

current_dir = os.getcwd()
parent_dir = str(Path(current_dir).parent)

for path_to_remove in ['', parent_dir]:
    while path_to_remove in sys.path:
        sys.path.remove(path_to_remove)

if common_parent_str not in sys.path:
    sys.path.insert(0, common_parent_str)

import importlib.util


def load_module_from_path(module_name: str, file_path: Path, package_name: str = None):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load spec for {module_name} from {file_path}")
    module = importlib.util.module_from_spec(spec)
    if package_name:
        module.__package__ = package_name
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


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

from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = common_main.app
tasks = common_main.tasks
emit_event = common_main.emit_event

AgentInfo = common_models.AgentInfo
HealthStatus = common_models.HealthStatus
AgentStatus = common_models.AgentStatus
BackendType = common_models.BackendType
TaskStatus = common_models.TaskStatus
TaskState = common_models.TaskState

common_settings = common_settings_module.settings
StructuredLogger = common_observability.StructuredLogger

logger = StructuredLogger(__name__)

# Override settings
common_settings.AGENT_ID = os.getenv("AGENT_ID", "so101-001")
common_settings.ROBOT_TYPE = "so101"
common_settings.AGENT_VERSION = "0.1.0"

# CORS for local UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Remove common /v1/agent/info route and replace
route_index_to_remove = None
for i, route in enumerate(app.routes):
    if hasattr(route, 'path') and route.path == "/v1/agent/info":
        if hasattr(route, 'methods') and "GET" in route.methods:
            route_index_to_remove = i
            break

if route_index_to_remove is not None:
    app.routes.pop(route_index_to_remove)

# Remove common /v1/runs route and replace
route_index_to_remove = None
for i, route in enumerate(app.routes):
    if hasattr(route, 'path') and route.path == "/v1/runs":
        if hasattr(route, 'methods') and "GET" in route.methods:
            route_index_to_remove = i
            break

if route_index_to_remove is not None:
    app.routes.pop(route_index_to_remove)


@app.get("/v1/agent/info", response_model=AgentInfo)
async def get_agent_info_so101():
    return AgentInfo(
        robot_id=common_settings.AGENT_ID,
        robot_type="so101",
        capabilities=[
            "so101_follower",
            "so101_camera",
            "so101_leader",
            "teleop",
            "frame_capture",
            "move_pose_sequence",
        ],
        version=common_settings.AGENT_VERSION,
        backend_default=BackendType.LOCAL,
    )


# Remove common /v1/agent/health route and replace
route_index_to_remove = None
for i, route in enumerate(app.routes):
    if hasattr(route, 'path') and route.path == "/v1/agent/health":
        if hasattr(route, 'methods') and "GET" in route.methods:
            route_index_to_remove = i
            break

if route_index_to_remove is not None:
    app.routes.pop(route_index_to_remove)


from .health import compute_health_status
from .config_manager import get_follower_settings, get_config
from .lerobot_cli import (
    start_teleop,
    stop_teleop,
    teleop_status,
    start_pose_sequence,
    stop_pose_sequence,
    sequence_status,
)
from fastapi.responses import StreamingResponse
from .camera import (
    capture_frame,
    start_stream,
    stop_stream,
    get_stream_status,
    get_latest_frame_base64,
    stream_mjpeg,
)
from .run_history import record_run, list_runs as list_so101_runs

_current_camera_stream_run_id: str | None = None


@app.get("/v1/agent/health", response_model=HealthStatus)
async def get_agent_health_so101(role: str | None = None):
    health = compute_health_status(role)
    status_map = {
        "online": AgentStatus.ONLINE,
        "degraded": AgentStatus.DEGRADED,
        "offline": AgentStatus.OFFLINE,
    }
    return HealthStatus(
        status=status_map.get(health["status"], AgentStatus.DEGRADED),
        last_seen=datetime.now(timezone.utc),
        sensors_ok=health.get("sensors_ok"),
        actuators_ok=health.get("actuators_ok"),
        backend_available=None,
    )


@app.get("/v1/runs", response_model=list[TaskStatus])
async def list_runs(limit: int = 100):
    combined = list(tasks.values()) + list_so101_runs(limit=limit)
    combined.sort(key=lambda item: item.created_at, reverse=True)
    return combined[: max(1, min(limit, 500))]


@app.post("/v1/so101/teleop/start")
async def teleop_start():
    try:
        result = start_teleop()
        run_id = result.get("run_id")
        if run_id:
            record_run(run_id, TaskState.RUNNING, "so101_teleop")
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/so101/teleop/stop")
async def teleop_stop(run_id: str):
    try:
        result = stop_teleop(run_id)
        record_run(
            run_id,
            TaskState.COMPLETED if result.get("ok") == "true" else TaskState.FAILED,
            "so101_teleop",
            result={"content": "so101_teleop", **result},
            error=None if result.get("ok") == "true" else result.get("message"),
        )
        return {"success": result.get("ok") == "true", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/so101/teleop/status")
async def teleop_get_status(run_id: str | None = None):
    try:
        return teleop_status(run_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/so101/camera/capture")
async def camera_capture(
    run_id: str | None = None,
    width: int | None = None,
    height: int | None = None,
    format: str = "jpg",
    warmup_frames: int = 3,
):
    run_id = run_id or str(uuid.uuid4())
    try:
        result = capture_frame(
            run_id,
            width=width,
            height=height,
            image_format=format,
            warmup_frames=warmup_frames,
        )
        if not result.get("ok"):
            raise HTTPException(status_code=500, detail=result.get("error", "capture failed"))
        record_run(
            run_id,
            TaskState.COMPLETED,
            "so101_camera_capture",
            result={"content": "so101_camera_capture", **result},
        )
        return {"success": True, "run_id": run_id, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/so101/camera/start")
async def camera_start(
    fps: int | None = None,
    duration_s: int = 15,
    width: int | None = None,
    height: int | None = None,
):
    try:
        global _current_camera_stream_run_id
        _current_camera_stream_run_id = str(uuid.uuid4())
        result = start_stream(fps, duration_s=duration_s, width=width, height=height)
        if not result.get("ok"):
            raise HTTPException(status_code=500, detail=result.get("error", "start failed"))
        record_run(
            _current_camera_stream_run_id,
            TaskState.RUNNING,
            "so101_camera_stream",
            result={"content": "so101_camera_stream", "duration_s": duration_s},
        )
        cfg = get_config().get("camera", {})
        resolved_fps = fps or int(cfg.get("fps", 15))
        resolved_width = width or int(cfg.get("width", 1280))
        resolved_height = height or int(cfg.get("height", 720))
        stream_url = (
            f"/v1/so101/camera/stream.mjpg?duration_s={duration_s}"
            f"&fps={resolved_fps}&width={resolved_width}&height={resolved_height}"
        )
        return {"success": True, "stream_url": stream_url, "run_id": _current_camera_stream_run_id, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/so101/camera/stop")
async def camera_stop():
    try:
        global _current_camera_stream_run_id
        result = stop_stream()
        if _current_camera_stream_run_id:
            record_run(
                _current_camera_stream_run_id,
                TaskState.COMPLETED,
                "so101_camera_stream",
                result={"content": "so101_camera_stream", **result},
            )
            _current_camera_stream_run_id = None
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/so101/camera/status")
async def camera_status():
    try:
        return get_stream_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/so101/camera/frame")
async def camera_frame():
    try:
        result = get_latest_frame_base64()
        if not result.get("ok"):
            raise HTTPException(status_code=404, detail=result.get("error", "no frame"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/so101/camera/stream.mjpg")
async def camera_stream_mjpeg(
    duration_s: int = 15,
    fps: int = 15,
    width: int | None = None,
    height: int | None = None,
):
    return StreamingResponse(
        stream_mjpeg(duration_s=duration_s, fps=fps, width=width, height=height),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.post("/v1/so101/follower/sequence/start")
async def follower_sequence_start():
    try:
        follower_cfg = get_follower_settings()
        port_path = follower_cfg.get("port", "")
        if not port_path or not Path(port_path).exists():
            raise HTTPException(
                status_code=400,
                detail=f"Follower port not available at {port_path}. Replug device or reload udev."
            )
        result = start_pose_sequence()
        run_id = result.get("run_id")
        if run_id:
            record_run(
                run_id,
                TaskState.RUNNING,
                "so101_follower_sequence",
                result={"content": "so101_follower_sequence", **result},
            )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/so101/follower/sequence/stop")
async def follower_sequence_stop(run_id: str):
    try:
        result = stop_pose_sequence(run_id)
        record_run(
            run_id,
            TaskState.COMPLETED if result.get("ok") == "true" else TaskState.FAILED,
            "so101_follower_sequence",
            result={"content": "so101_follower_sequence", **result},
            error=None if result.get("ok") == "true" else result.get("message"),
        )
        return {"success": result.get("ok") == "true", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/so101/follower/sequence/status")
async def follower_sequence_status(run_id: str | None = None):
    try:
        status = sequence_status(run_id)
        if run_id and status.get("running") == "false":
            record_run(
                run_id,
                TaskState.COMPLETED if str(status.get("returncode")) == "0" else TaskState.FAILED,
                "so101_follower_sequence",
                result={"content": "so101_follower_sequence", **status},
                error=None if str(status.get("returncode")) == "0" else "Sequence failed",
            )
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/so101/follower/sequence/info")
async def follower_sequence_info():
    """Return configured replay dataset info."""
    try:
        follower_cfg = get_follower_settings()
        dataset_root = follower_cfg.get("dataset_root", "")
        dataset_exists = bool(dataset_root) and Path(dataset_root).exists()
        port_path = follower_cfg.get("port", "")
        port_exists = bool(port_path) and Path(port_path).exists()
        leader_port = get_config().get("leader", {}).get("port", "")
        leader_exists = bool(leader_port) and Path(leader_port).exists()
        camera_device = get_config().get("camera", {}).get("device", "")
        camera_exists = bool(camera_device) and Path(camera_device).exists()
        return {
            "dataset_root": dataset_root,
            "dataset_exists": dataset_exists,
            "port_path": port_path,
            "port_exists": port_exists,
            "leader_port": leader_port,
            "leader_exists": leader_exists,
            "camera_device": camera_device,
            "camera_exists": camera_exists,
            "dataset_episode": follower_cfg.get("dataset_episode", 0),
            "dataset_fps": follower_cfg.get("dataset_fps", 30),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

