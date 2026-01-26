"""
Observability module for metrics and structured logging.
"""
import json
import logging
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Dict, Optional

from prometheus_client import Counter, Gauge, Histogram, generate_latest, REGISTRY

from .models import EventType

# Prometheus Metrics
task_e2e_ms = Histogram(
    "task_e2e_ms",
    "End-to-end task latency in milliseconds",
    ["task_type", "robot_type"],
    buckets=[100, 250, 500, 1000, 2000, 5000, 10000]
)

aim_latency_ms = Histogram(
    "aim_latency_ms",
    "AIM backend latency in milliseconds",
    ["task_type"],
    buckets=[100, 250, 500, 1000, 2000, 5000]
)

# Task lifecycle metrics (per endpoint + task)
task_run_total = Counter(
    "task_run_total",
    "Total task runs by status",
    ["endpoint", "task", "status"]
)

task_run_duration_ms = Histogram(
    "task_run_duration_ms",
    "Task run duration in milliseconds",
    ["endpoint", "task"],
    buckets=[50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000]
)

task_run_active = Gauge(
    "task_run_active",
    "Active task runs",
    ["endpoint", "task"]
)

task_last_success_timestamp = Gauge(
    "task_last_success_timestamp",
    "Unix timestamp of last successful task run",
    ["endpoint", "task"]
)

task_error_total = Counter(
    "task_error_total",
    "Total task errors by type",
    ["endpoint", "task", "error_type"]
)

# Latency budgets
control_loop_tick_ms = Histogram(
    "control_loop_tick_ms",
    "Control loop tick duration in milliseconds",
    ["endpoint"],
    buckets=[5, 10, 20, 50, 100, 200, 500, 1000]
)

e2e_action_latency_ms = Histogram(
    "e2e_action_latency_ms",
    "End-to-end action latency in milliseconds",
    ["endpoint", "action"],
    buckets=[10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
)

# Device health
device_ready = Gauge(
    "device_ready",
    "Device ready state (1=ready, 0=not ready)",
    ["endpoint"]
)

device_voltage_mv = Gauge(
    "device_voltage_mv",
    "Device voltage in millivolts",
    ["endpoint"]
)

device_power_ok = Gauge(
    "device_power_ok",
    "Device power OK state (1=ok, 0=not ok)",
    ["endpoint"]
)

device_disconnect_total = Counter(
    "device_disconnect_total",
    "Total device disconnect events",
    ["endpoint"]
)

# Camera metrics
camera_frame_capture_latency_ms = Histogram(
    "camera_frame_capture_latency_ms",
    "Camera frame capture latency in milliseconds",
    ["device"],
    buckets=[5, 10, 20, 50, 100, 250, 500, 1000, 2000]
)

camera_frame_bytes = Histogram(
    "camera_frame_bytes",
    "Camera frame size in bytes",
    ["device"],
    buckets=[10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]
)

camera_frame_capture_fail_total = Counter(
    "camera_frame_capture_fail_total",
    "Camera frame capture failures",
    ["device", "reason"]
)

camera_stream_fps = Gauge(
    "camera_stream_fps",
    "Camera stream FPS",
    ["device"]
)

camera_frame_age_ms = Gauge(
    "camera_frame_age_ms",
    "Age of last camera frame in milliseconds",
    ["device"]
)

camera_dropped_frames_total = Counter(
    "camera_dropped_frames_total",
    "Total dropped camera frames",
    ["device"]
)

camera_stream_jitter_ms = Histogram(
    "camera_stream_jitter_ms",
    "Camera stream jitter in milliseconds",
    ["device"],
    buckets=[1, 2, 5, 10, 20, 50, 100, 200, 500]
)

# SO-101 CLI metrics
lerobot_process_start_latency_ms = Histogram(
    "lerobot_process_start_latency_ms",
    "LeRobot process start latency in milliseconds",
    ["cmd"],
    buckets=[5, 10, 20, 50, 100, 250, 500, 1000, 2000]
)

lerobot_process_exit_code_total = Counter(
    "lerobot_process_exit_code_total",
    "LeRobot process exit codes",
    ["cmd", "code"]
)

lerobot_process_runtime_ms = Histogram(
    "lerobot_process_runtime_ms",
    "LeRobot process runtime in milliseconds",
    ["cmd"],
    buckets=[100, 250, 500, 1000, 2000, 5000, 10000, 30000]
)

# LLM / inference metrics
llm_request_total = Counter(
    "llm_request_total",
    "Total LLM requests",
    ["backend", "model", "status"]
)

llm_ttft_ms = Histogram(
    "llm_ttft_ms",
    "LLM time-to-first-token in milliseconds",
    ["backend", "model"],
    buckets=[50, 100, 250, 500, 1000, 2000, 5000]
)

llm_total_latency_ms = Histogram(
    "llm_total_latency_ms",
    "LLM total latency in milliseconds",
    ["backend", "model"],
    buckets=[100, 250, 500, 1000, 2000, 5000, 10000]
)

llm_tokens_in_total = Counter(
    "llm_tokens_in_total",
    "Total LLM input tokens",
    ["backend", "model"]
)

llm_tokens_out_total = Counter(
    "llm_tokens_out_total",
    "Total LLM output tokens",
    ["backend", "model"]
)

llm_rate_limited_total = Counter(
    "llm_rate_limited_total",
    "LLM rate limited responses",
    ["backend"]
)

llm_timeout_total = Counter(
    "llm_timeout_total",
    "LLM timeout responses",
    ["backend"]
)

task_errors_total = Counter(
    "task_errors_total",
    "Total number of task errors",
    ["task_type", "robot_type", "error_type"]
)

tasks_active = Gauge(
    "tasks_active",
    "Number of currently active tasks",
    ["robot_type"]
)

tasks_total = Counter(
    "tasks_total",
    "Total number of tasks",
    ["task_type", "robot_type", "status"]
)


class StructuredLogger:
    """Structured JSON logger for observability."""
    
    def __init__(self, name: str, level: str = "INFO"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Create console handler with JSON formatter
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        self.logger.addHandler(handler)
    
    def log_task(
        self,
        level: str,
        message: str,
        task_id: Optional[str] = None,
        task_type: Optional[str] = None,
        robot_type: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        backend_used: Optional[str] = None,
        aim_ms: Optional[int] = None,
        e2e_ms: Optional[int] = None,
        slo_pass: Optional[bool] = None,
        **kwargs
    ):
        """Log a task-related event with structured data."""
        log_data = {
            "message": message,
            "task_id": task_id,
            "task_type": task_type,
            "robot_type": robot_type,
            "request_id": request_id,
            "session_id": session_id,
            "backend_used": backend_used,
            "aim_ms": aim_ms,
            "e2e_ms": e2e_ms,
            "slo_pass": slo_pass,
            **kwargs
        }
        
        log_method = getattr(self.logger, level.lower())
        log_method(json.dumps(log_data))
    
    def info(self, message: str, **kwargs):
        """Log info message."""
        self.logger.info(json.dumps({"message": message, **kwargs}))
    
    def error(self, message: str, **kwargs):
        """Log error message."""
        self.logger.error(json.dumps({"message": message, **kwargs}))
    
    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self.logger.warning(json.dumps({"message": message, **kwargs}))
    
    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self.logger.debug(json.dumps({"message": message, **kwargs}))


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        """Format log record as JSON."""
        try:
            # If message is already JSON, parse and merge
            if isinstance(record.msg, str) and record.msg.startswith("{"):
                log_data = json.loads(record.msg)
            else:
                log_data = {"message": record.getMessage()}
            
            log_data.update({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
            })
            
            if record.exc_info:
                log_data["exception"] = self.formatException(record.exc_info)
            
            return json.dumps(log_data)
        except Exception:
            return json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            })


@contextmanager
def track_task_metrics(
    task_type: str,
    robot_type: str,
    task_id: Optional[str] = None,
    endpoint: Optional[str] = None,
):
    """Context manager to track task metrics."""
    start_time = time.time()
    endpoint_label = endpoint or robot_type
    tasks_active.labels(robot_type=robot_type).inc()
    task_run_active.labels(endpoint=endpoint_label, task=task_type).inc()
    
    try:
        yield
        tasks_total.labels(
            task_type=task_type,
            robot_type=robot_type,
            status="success"
        ).inc()
        task_run_total.labels(endpoint=endpoint_label, task=task_type, status="success").inc()
        task_last_success_timestamp.labels(endpoint=endpoint_label, task=task_type).set(time.time())
    except Exception as e:
        error_type = type(e).__name__
        task_errors_total.labels(
            task_type=task_type,
            robot_type=robot_type,
            error_type=error_type
        ).inc()
        task_error_total.labels(endpoint=endpoint_label, task=task_type, error_type=error_type).inc()
        tasks_total.labels(
            task_type=task_type,
            robot_type=robot_type,
            status="error"
        ).inc()
        task_run_total.labels(endpoint=endpoint_label, task=task_type, status="error").inc()
        raise
    finally:
        elapsed_ms = int((time.time() - start_time) * 1000)
        task_e2e_ms.labels(
            task_type=task_type,
            robot_type=robot_type
        ).observe(elapsed_ms)
        task_run_duration_ms.labels(endpoint=endpoint_label, task=task_type).observe(elapsed_ms)
        tasks_active.labels(robot_type=robot_type).dec()
        task_run_active.labels(endpoint=endpoint_label, task=task_type).dec()


def record_aim_latency(task_type: str, latency_ms: int):
    """Record AIM backend latency."""
    aim_latency_ms.labels(task_type=task_type).observe(latency_ms)


def record_task_run_start(endpoint: str, task: str) -> None:
    task_run_active.labels(endpoint=endpoint, task=task).inc()


def record_task_run_finish(
    endpoint: str,
    task: str,
    status: str,
    duration_ms: int,
    error_type: Optional[str] = None,
) -> None:
    task_run_total.labels(endpoint=endpoint, task=task, status=status).inc()
    task_run_duration_ms.labels(endpoint=endpoint, task=task).observe(duration_ms)
    if status == "success":
        task_last_success_timestamp.labels(endpoint=endpoint, task=task).set(time.time())
    if error_type:
        task_error_total.labels(endpoint=endpoint, task=task, error_type=error_type).inc()


def record_control_loop_tick(endpoint: str, tick_ms: float) -> None:
    control_loop_tick_ms.labels(endpoint=endpoint).observe(tick_ms)


def record_e2e_action_latency(endpoint: str, action: str, latency_ms: float) -> None:
    e2e_action_latency_ms.labels(endpoint=endpoint, action=action).observe(latency_ms)


def set_device_ready(endpoint: str, ready: bool) -> None:
    device_ready.labels(endpoint=endpoint).set(1 if ready else 0)


def set_device_voltage(endpoint: str, voltage_mv: float) -> None:
    device_voltage_mv.labels(endpoint=endpoint).set(voltage_mv)


def set_device_power_ok(endpoint: str, ok: bool) -> None:
    device_power_ok.labels(endpoint=endpoint).set(1 if ok else 0)


def record_device_disconnect(endpoint: str) -> None:
    device_disconnect_total.labels(endpoint=endpoint).inc()


def record_camera_capture_latency(device: str, latency_ms: float) -> None:
    camera_frame_capture_latency_ms.labels(device=device).observe(latency_ms)


def record_camera_frame_bytes(device: str, size_bytes: int) -> None:
    camera_frame_bytes.labels(device=device).observe(size_bytes)


def record_camera_capture_failure(device: str, reason: str) -> None:
    camera_frame_capture_fail_total.labels(device=device, reason=reason).inc()


def set_camera_stream_fps(device: str, fps: float) -> None:
    camera_stream_fps.labels(device=device).set(fps)


def set_camera_frame_age(device: str, age_ms: float) -> None:
    camera_frame_age_ms.labels(device=device).set(age_ms)


def record_camera_dropped_frames(device: str, count: int = 1) -> None:
    camera_dropped_frames_total.labels(device=device).inc(count)


def record_camera_stream_jitter(device: str, jitter_ms: float) -> None:
    camera_stream_jitter_ms.labels(device=device).observe(jitter_ms)


def record_lerobot_start_latency(cmd: str, latency_ms: float) -> None:
    lerobot_process_start_latency_ms.labels(cmd=cmd).observe(latency_ms)


def record_lerobot_exit_code(cmd: str, code: int) -> None:
    lerobot_process_exit_code_total.labels(cmd=cmd, code=str(code)).inc()


def record_lerobot_runtime(cmd: str, runtime_ms: float) -> None:
    lerobot_process_runtime_ms.labels(cmd=cmd).observe(runtime_ms)


def record_llm_request(backend: str, model: str, status: str) -> None:
    llm_request_total.labels(backend=backend, model=model, status=status).inc()


def record_llm_ttft(backend: str, model: str, ttft_ms: float) -> None:
    llm_ttft_ms.labels(backend=backend, model=model).observe(ttft_ms)


def record_llm_total_latency(backend: str, model: str, latency_ms: float) -> None:
    llm_total_latency_ms.labels(backend=backend, model=model).observe(latency_ms)


def record_llm_tokens_in(backend: str, model: str, tokens: int) -> None:
    llm_tokens_in_total.labels(backend=backend, model=model).inc(tokens)


def record_llm_tokens_out(backend: str, model: str, tokens: int) -> None:
    llm_tokens_out_total.labels(backend=backend, model=model).inc(tokens)


def record_llm_rate_limited(backend: str) -> None:
    llm_rate_limited_total.labels(backend=backend).inc()


def record_llm_timeout(backend: str) -> None:
    llm_timeout_total.labels(backend=backend).inc()


def get_metrics():
    """Get Prometheus metrics in text format."""
    return generate_latest(REGISTRY)

