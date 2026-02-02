import json

import httpx
import pytest

from multiverse.endpoints.lekiwi_endpoint import LeKiwiEndpoint, LeKiwiEndpointError


def test_health_mapping():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "device_id": "lekiwi-01",
                "status": "READY",
                "components": {"base": "READY", "arm": "READY"},
                "versions": {"lerobot_version": "1.0.0", "agent_version": "0.2.0"},
            },
        )

    transport = httpx.MockTransport(handler)
    endpoint = LeKiwiEndpoint("lekiwi-01", "http://lekiwi", "lekiwi-01")
    endpoint._client = httpx.Client(transport=transport)
    health = endpoint.health()
    assert health.status == "READY"
    assert health.device_id == "lekiwi-01"


def test_submit_task_status_mapping():
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        assert payload["task_type"] == "lekiwi.move_base"
        return httpx.Response(200, json={"task_id": "t1", "status": "queued"})

    transport = httpx.MockTransport(handler)
    endpoint = LeKiwiEndpoint("lekiwi-01", "http://lekiwi", "lekiwi-01")
    endpoint._client = httpx.Client(transport=transport)
    task = endpoint.submit_task("lekiwi.move_base", {"linear": 0.1})
    assert task.status == "QUEUED"


def test_request_error_mapping():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"detail": "boom"})

    transport = httpx.MockTransport(handler)
    endpoint = LeKiwiEndpoint("lekiwi-01", "http://lekiwi", "lekiwi-01")
    endpoint._client = httpx.Client(transport=transport)
    with pytest.raises(LeKiwiEndpointError):
        endpoint.health()

