"""
In-memory run history for SO-101 endpoints.
Persists for the lifetime of the agent process.
"""
from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List, Optional

from app.models import TaskStatus, TaskState

_runs: Dict[str, TaskStatus] = {}
_lock = Lock()


def record_run(
    run_id: str,
    state: TaskState,
    task_type: str,
    result: Optional[dict] = None,
    error: Optional[str] = None,
) -> TaskStatus:
    now = datetime.now(timezone.utc)
    with _lock:
        existing = _runs.get(run_id)
        if existing:
            existing.state = state
            existing.updated_at = now
            existing.result = result if result is not None else existing.result
            existing.error = error if error is not None else existing.error
            existing.progress = 1.0 if state in (TaskState.COMPLETED, TaskState.FAILED) else existing.progress
            return existing

        status = TaskStatus(
            task_id=run_id,
            state=state,
            progress=1.0 if state in (TaskState.COMPLETED, TaskState.FAILED) else 0.0,
            result=result or {"content": task_type, "task_type": task_type},
            error=error,
            created_at=now,
            updated_at=now,
        )
        _runs[run_id] = status
        return status


def list_runs(limit: int = 100) -> List[TaskStatus]:
    with _lock:
        ordered = sorted(_runs.values(), key=lambda item: item.created_at, reverse=True)
        return ordered[: max(1, min(limit, 500))]


def get_run(run_id: str) -> Optional[TaskStatus]:
    with _lock:
        return _runs.get(run_id)

