# Reachy Agent Test Suite

## Overview

Comprehensive test suite for the Reachy Agent, covering API endpoints, task execution, gestures, backend client, and driver functionality.

## Running Tests

### Run All Tests

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
pytest tests/ -v
```

### Run Specific Test Files

```bash
# API tests
pytest tests/test_api.py -v

# Task tests
pytest tests/test_tasks.py -v

# Gesture tests
pytest tests/test_gestures.py -v

# Backend client tests
pytest tests/test_backend_client.py -v

# Driver tests
pytest tests/test_driver.py -v
```

### Run with Coverage

```bash
pytest tests/ --cov=app --cov-report=html --cov-report=term
```

Coverage report will be generated in `htmlcov/index.html`

### Run Specific Test

```bash
pytest tests/test_api.py::TestAgentInfo::test_get_agent_info -v
```

## Test Structure

- `tests/conftest.py` - Pytest configuration and fixtures
- `tests/test_api.py` - API endpoint tests
- `tests/test_tasks.py` - Task submission and execution tests
- `tests/test_gestures.py` - Gesture controller tests
- `tests/test_backend_client.py` - Backend client tests
- `tests/test_driver.py` - Reachy driver tests

## Test Coverage

Current coverage: **~79%**

- API endpoints: ✅ Fully tested
- Task execution: ✅ Tested (with mocks)
- Gestures: ✅ Tested (mocked mode)
- Backend client: ✅ Tested (with mocks)
- Driver: ✅ Tested (mocked mode)

## Fixtures

- `client` - FastAPI TestClient instance
- `auth_headers` - Authentication headers (empty for now)
- `reset_tasks` - Auto-resets tasks dictionary between tests
- `sample_task_request` - Sample task request for testing

## Notes

- All tests run in mocked mode (no real hardware required)
- Backend client tests use mocked HTTP responses
- Task execution tests mock the backend client
- Gesture tests verify mocked gesture execution

## Continuous Integration

Tests can be run in CI/CD pipelines:

```bash
pytest tests/ --cov=app --cov-report=xml --junitxml=test-results.xml
```

