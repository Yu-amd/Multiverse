"""
LeKiwi Agent - FastAPI service for LeKiwi base + SO-101 follower tasks.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from prometheus_client import Counter, Histogram, generate_latest

from .config import load_config, resolve_config_path
from .controllers import LeRobotArmController, LeRobotBackend, LeRobotBaseController


try:
    from lerobot import __version__ as lerobot_version
except Exception:
    lerobot_version = "unknown"


AGENT_VERSION = "0.2.0"


@dataclass
class TaskEntry:
    task_id: str
    task_type: str
    input: Dict[str, Any]
    status: str
    created_at: float
    started_at: float | None = None
    finished_at: float | None = None
    message: str | None = None
    error: str | None = None

    def timings_ms(self) -> Dict[str, int]:
        started = self.started_at or self.created_at
        finished = self.finished_at or time.time()
        queue_ms = int((started - self.created_at) * 1000)
        exec_ms = int((finished - started) * 1000)
        total_ms = int((finished - self.created_at) * 1000)
        return {"queue": max(queue_ms, 0), "exec": max(exec_ms, 0), "total": max(total_ms, 0)}


app = FastAPI(title="LeKiwi Agent", version=AGENT_VERSION)

config_path = resolve_config_path(os.getenv("LEKIWI_CONFIG"))
config = load_config(config_path)
sequence_dir = Path(config.sequence_dir).expanduser()
sequence_dir.mkdir(parents=True, exist_ok=True)

backend = LeRobotBackend(
    robot_id=config.device_id,
    port=config.robot_port,
    calibration_dir=Path(config.calibration_dir).expanduser() if config.calibration_dir else None,
)
base_controller = LeRobotBaseController(backend)
arm_controller = LeRobotArmController(backend, sequence_dir)

base_lock = asyncio.Lock()
arm_lock = asyncio.Lock()

tasks: Dict[str, TaskEntry] = {}
_current_base_task: asyncio.Task | None = None
_current_base_task_id: str | None = None
_idempotency_cache: Dict[str, tuple[str, float]] = {}
_IDEMPOTENCY_TTL_S = 600


tasks_total = Counter("tasks_total", "Total tasks by type and status", ["task_type", "status"])
task_exec_duration_seconds = Histogram(
    "task_exec_duration_seconds",
    "Task execution duration in seconds",
    ["task_type"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60),
)
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["route", "method", "status"],
    buckets=(0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5),
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": time.time(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if isinstance(record.args, dict):
            payload.update(record.args)
        return json.dumps(payload)


logger = logging.getLogger("lekiwi_agent")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger.handlers = [handler]


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    route = request.scope.get("route").path if request.scope.get("route") else request.url.path
    http_request_duration_seconds.labels(route, request.method, str(response.status_code)).observe(duration)
    return response


@app.get("/healthz")
async def healthz():
    port_exists = Path(config.robot_port).exists()
    status = "READY" if port_exists else "DEGRADED"
    return {
        "device_id": config.device_id,
        "status": status,
        "components": {"base": status, "arm": status},
        "versions": {"lerobot_version": lerobot_version, "agent_version": AGENT_VERSION},
    }


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain; version=0.0.4; charset=utf-8")


@app.post("/v1/tasks")
async def create_task(payload: Dict[str, Any], idempotency_key: str | None = Header(None, alias="Idempotency-Key")):
    task_type = str(payload.get("task_type", "")).strip()
    task_input = payload.get("input") or {}
    if not task_type:
        raise HTTPException(status_code=400, detail="task_type is required")

    _prune_idempotency_cache()
    if idempotency_key:
        cached = _idempotency_cache.get(idempotency_key)
        if cached:
            task_id, _ts = cached
            existing = tasks.get(task_id)
            if existing:
                return {"task_id": task_id, "status": existing.status}

    task_id = str(uuid.uuid4())
    entry = TaskEntry(
        task_id=task_id,
        task_type=task_type,
        input=task_input,
        status="QUEUED",
        created_at=time.time(),
    )
    tasks[task_id] = entry
    if idempotency_key:
        _idempotency_cache[idempotency_key] = (task_id, time.time())
    asyncio.create_task(_execute_task(entry))
    return {"task_id": task_id, "status": entry.status}


@app.get("/v1/tasks/{task_id}")
async def get_task(task_id: str):
    entry = tasks.get(task_id)
    if not entry:
        raise HTTPException(status_code=404, detail="task_id not found")
    response = {
        "task_id": entry.task_id,
        "status": entry.status,
        "message": entry.message,
        "error": entry.error,
        "timings_ms": entry.timings_ms(),
    }
    return JSONResponse(response)


async def _execute_task(entry: TaskEntry) -> None:
    if entry.task_type == "lekiwi.stop":
        entry.started_at = time.time()
        entry.status = "RUNNING"
        await _handle_stop(entry)
        return

    try:
        async with base_lock:
            async with arm_lock:
                entry.started_at = time.time()
                entry.status = "RUNNING"
                await _dispatch_task(entry)
    except asyncio.CancelledError:
        entry.status = "CANCELED"
        entry.message = "task canceled"
        tasks_total.labels(entry.task_type, entry.status).inc()
        _log_task(entry)
    except Exception as exc:
        entry.status = "FAILED"
        entry.error = str(exc)
        tasks_total.labels(entry.task_type, entry.status).inc()
        _log_task(entry)
    finally:
        entry.finished_at = time.time()


async def _handle_stop(entry: TaskEntry) -> None:
    global _current_base_task, _current_base_task_id
    if _current_base_task and not _current_base_task.done():
        _current_base_task.cancel()
    await asyncio.to_thread(base_controller.stop)
    entry.status = "COMPLETED"
    entry.message = "base stopped"
    entry.finished_at = time.time()
    tasks_total.labels(entry.task_type, entry.status).inc()
    _log_task(entry)


async def _dispatch_task(entry: TaskEntry) -> None:
    if entry.task_type == "lekiwi.move_base":
        await _run_move_base(entry)
        return
    if entry.task_type == "so101.move_pose_sequence":
        await _run_pose_sequence(entry)
        return
    entry.status = "FAILED"
    entry.error = f"Unsupported task_type: {entry.task_type}"
    tasks_total.labels(entry.task_type, entry.status).inc()
    _log_task(entry)


async def _run_move_base(entry: TaskEntry) -> None:
    global _current_base_task, _current_base_task_id
    try:
        linear = float(entry.input.get("linear", 0.0))
        angular = float(entry.input.get("angular", 0.0))
        duration_s = float(entry.input.get("duration_s", 0.0))
    except (TypeError, ValueError):
        raise ValueError("Invalid input for lekiwi.move_base")

    _current_base_task = asyncio.current_task()
    _current_base_task_id = entry.task_id

    start_exec = time.time()
    await asyncio.to_thread(base_controller.set_velocity, linear, angular)
    try:
        await asyncio.sleep(max(duration_s, 0.0))
    finally:
        await asyncio.to_thread(base_controller.stop)
        _current_base_task = None
        _current_base_task_id = None
    entry.status = "COMPLETED"
    entry.finished_at = time.time()
    tasks_total.labels(entry.task_type, entry.status).inc()
    task_exec_duration_seconds.labels(entry.task_type).observe(time.time() - start_exec)
    _log_task(entry)


async def _run_pose_sequence(entry: TaskEntry) -> None:
    sequence_id = str(entry.input.get("sequence_id", "")).strip()
    if not sequence_id:
        raise ValueError("sequence_id is required")
    start_exec = time.time()
    steps = await asyncio.to_thread(arm_controller.play_sequence, sequence_id)
    entry.status = "COMPLETED"
    entry.message = f"steps={steps}"
    entry.finished_at = time.time()
    tasks_total.labels(entry.task_type, entry.status).inc()
    task_exec_duration_seconds.labels(entry.task_type).observe(time.time() - start_exec)
    _log_task(entry)


def _log_task(entry: TaskEntry) -> None:
    duration_ms = entry.timings_ms().get("total")
    logger.info(
        "task_complete",
        {
            "device_id": config.device_id,
            "task_id": entry.task_id,
            "task_type": entry.task_type,
            "status": entry.status,
            "duration_ms": duration_ms,
        },
    )


def _prune_idempotency_cache() -> None:
    now = time.time()
    expired = [key for key, (_, ts) in _idempotency_cache.items() if now - ts > _IDEMPOTENCY_TTL_S]
    for key in expired:
        _idempotency_cache.pop(key, None)
