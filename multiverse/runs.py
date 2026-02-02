from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class RunRecord:
    run_id: str
    endpoint: str
    task_type: str
    status: str
    created_at: float = field(default_factory=time.time)
    updated_at: float | None = None
    timings_ms: Dict[str, int] | None = None
    status_history: List[tuple[str, float]] = field(default_factory=list)

    def update_status(self, status: str, timings_ms: Dict[str, int] | None = None) -> None:
        self.status = status
        self.updated_at = time.time()
        self.timings_ms = timings_ms or self.timings_ms
        self.status_history.append((status, self.updated_at))


