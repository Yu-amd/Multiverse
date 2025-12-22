"""
Unit tests for observability module.
"""
import json
import pytest
from unittest.mock import patch

from app.observability import (
    StructuredLogger,
    get_metrics,
    record_aim_latency,
    track_task_metrics,
)


class TestStructuredLogger:
    """Tests for StructuredLogger class."""
    
    def test_logger_creation(self):
        """Test creating a StructuredLogger."""
        logger = StructuredLogger("test_logger", "INFO")
        assert logger.logger is not None
        assert logger.logger.name == "test_logger"
    
    def test_log_task(self, caplog):
        """Test logging a task event."""
        logger = StructuredLogger("test_logger", "INFO")
        logger.log_task(
            "info",
            "Test message",
            task_id="task-001",
            task_type="test_task",
            robot_type="test_robot"
        )
        
        # Check that log was written
        assert len(caplog.records) > 0
        log_record = caplog.records[-1]
        assert log_record.levelname == "INFO"
        
        # Parse JSON log
        log_data = json.loads(log_record.message)
        assert log_data["message"] == "Test message"
        assert log_data["task_id"] == "task-001"
        assert log_data["task_type"] == "test_task"
    
    def test_info_logging(self, caplog):
        """Test info logging."""
        logger = StructuredLogger("test_logger", "INFO")
        logger.info("Test info message", extra_field="extra_value")
        
        assert len(caplog.records) > 0
        log_data = json.loads(caplog.records[-1].message)
        assert log_data["message"] == "Test info message"
        assert log_data["extra_field"] == "extra_value"


class TestTaskMetrics:
    """Tests for task metrics tracking."""
    
    def test_track_task_metrics_success(self):
        """Test tracking successful task metrics."""
        with track_task_metrics("test_task", "test_robot", "task-001"):
            pass  # Task completes successfully
        
        # Metrics should be recorded (we can't easily assert Prometheus metrics
        # without a full Prometheus setup, but we can verify no exceptions)
        assert True
    
    def test_track_task_metrics_error(self):
        """Test tracking task metrics with error."""
        with pytest.raises(ValueError):
            with track_task_metrics("test_task", "test_robot", "task-001"):
                raise ValueError("Test error")
        
        # Error metrics should be recorded
        assert True
    
    def test_record_aim_latency(self):
        """Test recording AIM latency."""
        # Should not raise exception
        record_aim_latency("test_task", 500)
        assert True


class TestMetrics:
    """Tests for metrics endpoint."""
    
    def test_get_metrics(self):
        """Test getting Prometheus metrics."""
        metrics = get_metrics()
        assert isinstance(metrics, bytes)
        assert len(metrics) > 0
        # Should contain at least one metric
        assert b"task_e2e_ms" in metrics or b"# HELP" in metrics

