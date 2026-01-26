"""
In-memory run history for SO-101 endpoints.
Persists for the lifetime of the agent process.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
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
            _write_run_artifact(existing)
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
        _write_run_artifact(status)
        return status


def list_runs(limit: int = 100) -> List[TaskStatus]:
    with _lock:
        ordered = sorted(_runs.values(), key=lambda item: item.created_at, reverse=True)
        return ordered[: max(1, min(limit, 500))]


def get_run(run_id: str) -> Optional[TaskStatus]:
    with _lock:
        return _runs.get(run_id)


def _write_run_artifact(status: TaskStatus) -> None:
    try:
        output_dir = Path(__file__).parent.parent / "runs" / status.task_id
        output_dir.mkdir(parents=True, exist_ok=True)
        payload = status.model_dump()
        payload["artifact_type"] = "run_history"
        payload["updated_at"] = status.updated_at.isoformat() if status.updated_at else None
        payload["created_at"] = status.created_at.isoformat() if status.created_at else None
        (output_dir / "run.json").write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
    except Exception:
        # Best-effort logging only
        return None

