# Phase 0 Testing Guide

This guide provides step-by-step instructions for testing the Phase 0 implementation of the common agent framework.

## Prerequisites

1. **Python 3.10+** installed
2. **pip** or **uv** package manager
3. Terminal/command line access

## Setup

### 1. Install Dependencies

```bash
cd /home/yw/Desktop/Multiverse/agents/common
pip install -r requirements.txt
```

Or using `uv` (faster):

```bash
cd /home/yw/Desktop/Multiverse/agents/common
uv pip install -r requirements.txt
```

### 2. Verify Installation

Check that all dependencies are installed:

```bash
python -c "import fastapi; import pydantic; import prometheus_client; print('All dependencies installed')"
```

## Running Tests

### Run All Tests

```bash
cd /home/yw/Desktop/Multiverse/agents/common
pytest
```

Expected output:
```
============================= test session starts ==============================
platform linux -- Python 3.x.x, pytest-7.x.x, pluggy-1.x.x
collected X items

tests/test_models.py .................                                    [XX%]
tests/test_settings.py ........                                            [XX%]
tests/test_observability.py ........                                       [XX%]
tests/test_security.py ........                                            [XX%]
tests/test_integration.py ................                                 [XX%]

============================== X passed in X.XXs ===============================
```

### Run Tests with Coverage

```bash
pytest --cov=app --cov-report=term-missing
```

### Run Tests with HTML Coverage Report

```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html  # On Linux: xdg-open htmlcov/index.html
```

### Run Specific Test Files

```bash
# Unit tests only
pytest tests/test_models.py tests/test_settings.py

# Integration tests only
pytest tests/test_integration.py

# Specific test class
pytest tests/test_models.py::TestTaskRequest

# Specific test function
pytest tests/test_models.py::TestTaskRequest::test_task_request_minimal
```

### Run Tests with Verbose Output

```bash
pytest -v
```

### Run Tests with Print Statements

```bash
pytest -s
```

## Manual API Testing

### 1. Start the Agent Server

In one terminal:

```bash
cd /home/yw/Desktop/Multiverse/agents/common
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:9001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 2. Test Endpoints

In another terminal, test each endpoint:

#### Get Agent Info

```bash
curl http://localhost:9001/v1/agent/info
```

Expected response:
```json
{
  "robot_id": "agent-001",
  "robot_type": "generic",
  "capabilities": [],
  "version": "0.1.0",
  "backend_default": "aim"
}
```

#### Get Agent Health

```bash
curl http://localhost:9001/v1/agent/health
```

Expected response:
```json
{
  "status": "online",
  "last_seen": "2024-01-15T10:30:00Z",
  "sensors_ok": true,
  "actuators_ok": true,
  "backend_available": null,
  "uptime_seconds": null
}
```

#### Create a Task

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "test_task",
    "input": {"prompt": "test prompt"}
  }'
```

Expected response:
```json
{
  "task_id": "uuid-here",
  "state": "acknowledged",
  "progress": 0.0,
  "e2e_slo_ms": 2500,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Save the `task_id` from the response for the next test.**

#### Get Task Status

```bash
curl http://localhost:9001/v1/tasks/{task_id}
```

Replace `{task_id}` with the task ID from the previous response.

#### Get Metrics

```bash
curl http://localhost:9001/v1/metrics
```

Expected response: Prometheus text format with metrics

#### Root Endpoint

```bash
curl http://localhost:9001/
```

#### Health Check

```bash
curl http://localhost:9001/health
```

Expected response:
```json
{"status": "ok"}
```

### 3. Test with Full Task Configuration

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### 4. Test Error Cases

#### Get Non-existent Task

```bash
curl http://localhost:9001/v1/tasks/nonexistent-task-id
```

Expected response: `404 Not Found`

#### Invalid Task Request

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "test_task"
  }'
```

Expected response: `422 Unprocessable Entity` (missing required field)

## Testing with Authentication

### 1. Set Environment Variables

```bash
export AUTH_MODE=api_key
export API_KEY=test-key-123
```

### 2. Restart Server

Restart the uvicorn server to pick up new environment variables.

### 3. Test Without API Key

```bash
curl http://localhost:9001/v1/agent/info
```

Expected response: `401 Unauthorized`

### 4. Test With API Key

```bash
curl -H "X-API-Key: test-key-123" http://localhost:9001/v1/agent/info
```

Expected response: `200 OK` with agent info

### 5. Test With Wrong API Key

```bash
curl -H "X-API-Key: wrong-key" http://localhost:9001/v1/agent/info
```

Expected response: `401 Unauthorized`

## Testing SSE Events

### Using curl

```bash
curl -N http://localhost:9001/v1/events
```

You should see SSE events streaming. To trigger events, create a task in another terminal.

### Using Python

```python
import requests

url = "http://localhost:9001/v1/events"
response = requests.get(url, stream=True)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

## Troubleshooting

### Tests Fail with Import Errors

**Problem:** `ModuleNotFoundError: No module named 'app'`

**Solution:** Make sure you're in the `agents/common` directory:

```bash
cd /home/yw/Desktop/Multiverse/agents/common
pytest
```

### Server Won't Start

**Problem:** `Address already in use`

**Solution:** Port 9001 is already in use. Either:
1. Stop the process using port 9001
2. Use a different port: `uvicorn app.main:app --port 9002`

### Tests Fail with Pydantic Errors

**Problem:** Validation errors in models

**Solution:** Check that you have the correct Pydantic version:
```bash
pip install "pydantic>=2.5.0"
```

### Metrics Endpoint Returns Empty

**Problem:** No metrics showing

**Solution:** Create some tasks first to generate metrics, then check `/v1/metrics`.

## Next Steps

Once all tests pass:

1. ✅ Review test coverage report
2. ✅ Verify all API endpoints work
3. ✅ Test authentication (if enabled)
4. ✅ Check structured logging output
5. ✅ Verify Prometheus metrics format

You're ready to proceed to **Phase 1: Reachy Agent Implementation**!

