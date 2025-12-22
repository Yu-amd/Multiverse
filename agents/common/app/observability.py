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
    task_id: Optional[str] = None
):
    """Context manager to track task metrics."""
    start_time = time.time()
    tasks_active.labels(robot_type=robot_type).inc()
    
    try:
        yield
        tasks_total.labels(
            task_type=task_type,
            robot_type=robot_type,
            status="success"
        ).inc()
    except Exception as e:
        error_type = type(e).__name__
        task_errors_total.labels(
            task_type=task_type,
            robot_type=robot_type,
            error_type=error_type
        ).inc()
        tasks_total.labels(
            task_type=task_type,
            robot_type=robot_type,
            status="error"
        ).inc()
        raise
    finally:
        elapsed_ms = int((time.time() - start_time) * 1000)
        task_e2e_ms.labels(
            task_type=task_type,
            robot_type=robot_type
        ).observe(elapsed_ms)
        tasks_active.labels(robot_type=robot_type).dec()


def record_aim_latency(task_type: str, latency_ms: int):
    """Record AIM backend latency."""
    aim_latency_ms.labels(task_type=task_type).observe(latency_ms)


def get_metrics():
    """Get Prometheus metrics in text format."""
    return generate_latest(REGISTRY)

