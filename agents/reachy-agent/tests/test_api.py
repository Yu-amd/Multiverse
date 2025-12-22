"""
Tests for Reachy Agent API endpoints.
"""
import pytest
from fastapi.testclient import TestClient


class TestAgentInfo:
    """Tests for /v1/agent/info endpoint."""
    
    def test_get_agent_info(self, client, auth_headers):
        """Test getting Reachy agent information."""
        response = client.get("/v1/agent/info", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "robot_id" in data
        assert "robot_type" in data
        assert "capabilities" in data
        assert "version" in data
        assert "backend_default" in data
        
        # Verify Reachy-specific values
        assert data["robot_type"] == "reachy"
        assert "devops_copilot" in data["capabilities"]
        assert "gestures" in data["capabilities"]
        assert "openai_compatible_inference" in data["capabilities"]
        assert data["backend_default"] == "aim"
    
    def test_agent_info_not_generic(self, client, auth_headers):
        """Ensure agent info returns Reachy-specific values, not generic."""
        response = client.get("/v1/agent/info", headers=auth_headers)
        data = response.json()
        
        # Should NOT be generic values
        assert data["robot_id"] != "agent-001"
        assert data["robot_type"] != "generic"
        assert len(data["capabilities"]) > 0


class TestAgentHealth:
    """Tests for /v1/agent/health endpoint."""
    
    def test_get_agent_health(self, client, auth_headers):
        """Test getting agent health status."""
        response = client.get("/v1/agent/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert "last_seen" in data
        assert "sensors_ok" in data
        assert "actuators_ok" in data
        
        # Verify status values
        assert data["status"] in ["online", "degraded", "offline"]
        assert isinstance(data["sensors_ok"], bool)
        assert isinstance(data["actuators_ok"], bool)


class TestRootEndpoint:
    """Tests for root endpoint."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns API information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data


class TestHealthCheck:
    """Tests for /health endpoint."""
    
    def test_health_check(self, client):
        """Test simple health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestMetrics:
    """Tests for /v1/metrics endpoint."""
    
    def test_get_metrics(self, client, auth_headers):
        """Test getting Prometheus metrics."""
        response = client.get("/v1/metrics", headers=auth_headers)
        assert response.status_code == 200
        
        # Should return Prometheus text format
        assert response.headers["content-type"] == "text/plain; version=0.0.4; charset=utf-8"
        
        # Should contain Prometheus metrics
        content = response.text
        assert "task_" in content or "# HELP" in content or "# TYPE" in content

