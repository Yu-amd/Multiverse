from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Dict

import httpx


TaskStatus = str


@dataclass
class LeKiwiHealth:
    device_id: str
    status: str
    components: Dict[str, str]
    versions: Dict[str, str]


@dataclass
class LeKiwiTask:
    task_id: str
    status: TaskStatus
    message: str | None = None
    error: str | None = None
    timings_ms: Dict[str, int] | None = None


class LeKiwiEndpointError(RuntimeError):
    pass


class LeKiwiEndpoint:
    def __init__(self, name: str, base_url: str, device_id: str, timeout_s: float = 5.0) -> None:
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.device_id = device_id
        self.timeout_s = timeout_s
        self._client = httpx.Client(timeout=timeout_s)

    def health(self) -> LeKiwiHealth:
        data = self._request_json("GET", "/healthz")
        return LeKiwiHealth(
            device_id=str(data.get("device_id", "")),
            status=str(data.get("status", "DEGRADED")),
            components=dict(data.get("components", {})),
            versions=dict(data.get("versions", {})),
        )

    def submit_task(self, task_type: str, input_payload: Dict[str, Any], idempotency_key: str | None = None) -> LeKiwiTask:
        payload = {"task_type": task_type, "input": input_payload}
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        data = self._request_json("POST", "/v1/tasks", json_body=payload, headers=headers)
        return LeKiwiTask(
            task_id=str(data.get("task_id", "")),
            status=self._map_status(data.get("status")),
            message=data.get("message"),
            error=data.get("error"),
            timings_ms=data.get("timings_ms"),
        )

    def get_task(self, task_id: str) -> LeKiwiTask:
        data = self._request_json("GET", f"/v1/tasks/{task_id}")
        return LeKiwiTask(
            task_id=str(data.get("task_id", task_id)),
            status=self._map_status(data.get("status")),
            message=data.get("message"),
            error=data.get("error"),
            timings_ms=data.get("timings_ms"),
        )

    def _request_json(
        self,
        method: str,
        path: str,
        json_body: Dict[str, Any] | None = None,
        headers: Dict[str, str] | None = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = self._client.request(method, url, json=json_body, headers=headers)
                if response.status_code >= 500:
                    raise LeKiwiEndpointError(f"Server error {response.status_code} on {path}")
                if response.status_code >= 400:
                    raise LeKiwiEndpointError(f"Request failed {response.status_code} on {path}")
                return response.json()
            except (httpx.HTTPError, json.JSONDecodeError, LeKiwiEndpointError) as exc:
                last_error = exc
                if attempt < 2:
                    time.sleep(0.2)
                    continue
                break
        raise LeKiwiEndpointError(f"Request failed after retries: {last_error}")

    @staticmethod
    def _map_status(status: Any) -> TaskStatus:
        if not status:
            return "FAILED"
        normalized = str(status).upper()
        if normalized in {"QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELED"}:
            return normalized
        if normalized in {"SUCCESS"}:
            return "COMPLETED"
        return "FAILED"

