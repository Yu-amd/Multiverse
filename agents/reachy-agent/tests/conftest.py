"""
Pytest configuration and fixtures for Reachy Agent tests.
"""
import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# CRITICAL: Set up paths correctly
# We need both common framework AND reachy-agent app in the path
# But reachy-agent app must come FIRST so we import our app.main, not common's

# Get absolute paths
common_path = Path(__file__).parent.parent.parent / "common"
reachy_agent_path = Path(__file__).parent.parent

# Remove any existing entries
for path_to_remove in ['', '.', str(common_path), str(reachy_agent_path)]:
    while path_to_remove in sys.path:
        sys.path.remove(path_to_remove)

# Add reachy-agent FIRST (so app.main resolves to our app.main)
sys.path.insert(0, str(reachy_agent_path))

# Add common framework AFTER (so common modules can be imported)
sys.path.insert(1, str(common_path))

# Set environment variables before importing app
os.environ.setdefault("AUTH_MODE", "none")
os.environ.setdefault("AGENT_ID", "reachy-test-001")
os.environ.setdefault("ROBOT_TYPE", "reachy")
os.environ.setdefault("AGENT_VERSION", "0.1.0-test")

# Import after path setup - this should now import from reachy-agent/app/main.py
import app.main as reachy_main
app = reachy_main.app
tasks = reachy_main.tasks
# Note: reachy_driver and gesture_controller are module-level but may not be directly accessible
# Tests that need them can import from app.main directly


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create authentication headers if needed."""
    # For now, AUTH_MODE is "none" by default, so no headers needed
    return {}


@pytest.fixture(autouse=True)
def reset_tasks():
    """Reset tasks dictionary before each test."""
    tasks.clear()
    yield
    tasks.clear()


@pytest.fixture
def sample_task_request():
    """Create a sample task request for testing."""
    return {
        "task_type": "reachy_devops_copilot",
        "input": {
            "prompt": "What is p95 latency?",
            "model": "Qwen/Qwen3-32B"
        },
        "routing": {
            "backend": "aim",
            "base_url": "http://localhost:8000",
            "api_key": "sk-test-key"
        },
        "policy": {
            "e2e_slo_ms": 2500,
            "timeout_ms": 2200
        }
    }

