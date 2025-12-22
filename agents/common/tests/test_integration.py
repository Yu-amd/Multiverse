"""
Integration tests for the Agent API.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.settings import settings


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create authentication headers if needed."""
    # For now, AUTH_MODE is "none" by default, so no headers needed
    return {}


class TestAgentInfo:
    """Integration tests for /v1/agent/info endpoint."""
    
    def test_get_agent_info(self, client, auth_headers):
        """Test getting agent information."""
        response = client.get("/v1/agent/info", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "robot_id" in data
        assert "robot_type" in data
        assert "capabilities" in data
        assert "version" in data
        assert data["robot_id"] == settings.AGENT_ID
        assert data["robot_type"] == settings.ROBOT_TYPE


class TestAgentHealth:
    """Integration tests for /v1/agent/health endpoint."""
    
    def test_get_agent_health(self, client, auth_headers):
        """Test getting agent health status."""
        response = client.get("/v1/agent/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "last_seen" in data
        assert "sensors_ok" in data
        assert "actuators_ok" in data
        assert data["status"] in ["online", "degraded", "offline"]


class TestTasks:
    """Integration tests for /v1/tasks endpoints."""
    
    def test_create_task(self, client, auth_headers):
        """Test creating a new task."""
        task_request = {
            "task_type": "test_task",
            "input": {"prompt": "test prompt"}
        }
        response = client.post(
            "/v1/tasks",
            json=task_request,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert "task_id" in data
        assert data["state"] == "acknowledged"
        assert data["progress"] == 0.0
        assert "created_at" in data
        assert "updated_at" in data
    
    def test_create_task_with_full_config(self, client, auth_headers):
        """Test creating a task with full configuration."""
        task_request = {
            "task_type": "test_task",
            "input": {"prompt": "test prompt"},
            "routing": {
                "backend": "aim",
                "base_url": "https://aim.example.com/v1",
                "api_key": "sk-test"
            },
            "policy": {
                "e2e_slo_ms": 3000,
                "timeout_ms": 2500
            },
            "trace": {
                "session_id": "session-001",
                "request_id": "req-001"
            }
        }
        response = client.post(
            "/v1/tasks",
            json=task_request,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["e2e_slo_ms"] == 3000
    
    def test_get_task_status(self, client, auth_headers):
        """Test getting task status."""
        # First create a task
        task_request = {
            "task_type": "test_task",
            "input": {"prompt": "test prompt"}
        }
        create_response = client.post(
            "/v1/tasks",
            json=task_request,
            headers=auth_headers
        )
        task_id = create_response.json()["task_id"]
        
        # Then get its status
        response = client.get(
            f"/v1/tasks/{task_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["state"] == "acknowledged"
    
    def test_get_nonexistent_task(self, client, auth_headers):
        """Test getting status of non-existent task."""
        response = client.get(
            "/v1/tasks/nonexistent-task-id",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestMetrics:
    """Integration tests for /v1/metrics endpoint."""
    
    def test_get_metrics(self, client, auth_headers):
        """Test getting Prometheus metrics."""
        response = client.get("/v1/metrics", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; version=0.0.4; charset=utf-8"
        metrics_text = response.text
        assert len(metrics_text) > 0
        # Should contain metric definitions
        assert "# HELP" in metrics_text or "task_e2e_ms" in metrics_text


class TestRoot:
    """Integration tests for root endpoints."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

