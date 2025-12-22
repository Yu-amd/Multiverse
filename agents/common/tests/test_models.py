"""
Unit tests for Pydantic models.
"""
import pytest
from datetime import datetime

from app.models import (
    AgentInfo,
    AgentStatus,
    BackendType,
    EventType,
    HealthStatus,
    PolicyConfig,
    RoutingConfig,
    TaskRequest,
    TaskState,
    TaskStatus,
    TraceConfig,
)


class TestRoutingConfig:
    """Tests for RoutingConfig model."""
    
    def test_routing_config_creation(self):
        """Test creating a RoutingConfig."""
        config = RoutingConfig(
            backend=BackendType.AIM,
            base_url="https://aim.example.com/v1"
        )
        assert config.backend == BackendType.AIM
        assert config.base_url == "https://aim.example.com/v1"
        assert config.api_key is None
    
    def test_routing_config_with_api_key(self):
        """Test RoutingConfig with API key."""
        config = RoutingConfig(
            backend=BackendType.AIM,
            base_url="https://aim.example.com/v1",
            api_key="sk-test-key"
        )
        assert config.api_key == "sk-test-key"


class TestPolicyConfig:
    """Tests for PolicyConfig model."""
    
    def test_policy_config_defaults(self):
        """Test PolicyConfig with default values."""
        config = PolicyConfig()
        assert config.e2e_slo_ms == 2500
        assert config.timeout_ms == 2200
    
    def test_policy_config_custom(self):
        """Test PolicyConfig with custom values."""
        config = PolicyConfig(e2e_slo_ms=5000, timeout_ms=4500)
        assert config.e2e_slo_ms == 5000
        assert config.timeout_ms == 4500
    
    def test_policy_config_validation(self):
        """Test PolicyConfig validation."""
        with pytest.raises(Exception):  # Pydantic validation error
            PolicyConfig(e2e_slo_ms=-1)


class TestTraceConfig:
    """Tests for TraceConfig model."""
    
    def test_trace_config_creation(self):
        """Test creating a TraceConfig."""
        config = TraceConfig(
            session_id="session-001",
            request_id="req-001"
        )
        assert config.session_id == "session-001"
        assert config.request_id == "req-001"


class TestTaskRequest:
    """Tests for TaskRequest model."""
    
    def test_task_request_minimal(self):
        """Test TaskRequest with minimal required fields."""
        request = TaskRequest(
            task_type="test_task",
            input={"prompt": "test"}
        )
        assert request.task_type == "test_task"
        assert request.input == {"prompt": "test"}
        assert request.routing is None
        assert request.policy is None
        assert request.trace is None
    
    def test_task_request_full(self):
        """Test TaskRequest with all fields."""
        request = TaskRequest(
            task_type="test_task",
            input={"prompt": "test"},
            routing=RoutingConfig(
                backend=BackendType.AIM,
                base_url="https://aim.example.com/v1"
            ),
            policy=PolicyConfig(e2e_slo_ms=3000),
            trace=TraceConfig(session_id="session-001")
        )
        assert request.routing is not None
        assert request.policy is not None
        assert request.trace is not None


class TestTaskStatus:
    """Tests for TaskStatus model."""
    
    def test_task_status_creation(self):
        """Test creating a TaskStatus."""
        status = TaskStatus(
            task_id="task-001",
            state=TaskState.PENDING
        )
        assert status.task_id == "task-001"
        assert status.state == TaskState.PENDING
        assert status.progress == 0.0
        assert status.created_at is not None
        assert status.updated_at is not None
    
    def test_task_status_progress_validation(self):
        """Test TaskStatus progress validation."""
        with pytest.raises(Exception):  # Pydantic validation error
            TaskStatus(
                task_id="task-001",
                state=TaskState.PENDING,
                progress=1.5  # Invalid: > 1.0
            )


class TestAgentInfo:
    """Tests for AgentInfo model."""
    
    def test_agent_info_creation(self):
        """Test creating an AgentInfo."""
        info = AgentInfo(
            robot_id="robot-001",
            robot_type="reachy",
            capabilities=["gestures", "speech"],
            version="0.1.0"
        )
        assert info.robot_id == "robot-001"
        assert info.robot_type == "reachy"
        assert len(info.capabilities) == 2
        assert info.version == "0.1.0"


class TestHealthStatus:
    """Tests for HealthStatus model."""
    
    def test_health_status_creation(self):
        """Test creating a HealthStatus."""
        health = HealthStatus(
            status=AgentStatus.ONLINE,
            sensors_ok=True,
            actuators_ok=True
        )
        assert health.status == AgentStatus.ONLINE
        assert health.sensors_ok is True
        assert health.actuators_ok is True
        assert health.last_seen is not None

