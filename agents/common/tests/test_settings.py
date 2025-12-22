"""
Unit tests for settings module.
"""
import os
import pytest
from unittest.mock import patch

from app.settings import Settings, settings


class TestSettings:
    """Tests for Settings class."""
    
    def test_default_values(self):
        """Test that default values are set correctly."""
        test_settings = Settings()
        assert test_settings.AGENT_ID == "agent-001"
        assert test_settings.ROBOT_TYPE == "generic"
        assert test_settings.AGENT_VERSION == "0.1.0"
        assert test_settings.BACKEND_DEFAULT == "aim"
        assert test_settings.E2E_SLO_MS_DEFAULT == 2500
        assert test_settings.TIMEOUT_MS_DEFAULT == 2200
        assert test_settings.AUTH_MODE == "none"
        assert test_settings.HOST == "0.0.0.0"
        assert test_settings.PORT == 9001
        assert test_settings.METRICS_ENABLED is True
    
    def test_environment_override(self):
        """Test that environment variables override defaults."""
        with patch.dict(os.environ, {
            "AGENT_ID": "test-agent",
            "ROBOT_TYPE": "test-robot",
            "PORT": "9002"
        }):
            test_settings = Settings()
            assert test_settings.AGENT_ID == "test-agent"
            assert test_settings.ROBOT_TYPE == "test-robot"
            assert test_settings.PORT == 9002
    
    def test_global_settings_instance(self):
        """Test that global settings instance exists."""
        assert settings is not None
        assert isinstance(settings, Settings)

