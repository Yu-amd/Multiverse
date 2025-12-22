# Common Agent Framework

Shared framework for robotics agents implementing the standardized Agent API.

## Overview

This package provides the common infrastructure for all robotics agents in the fleet system:

- **Standardized API**: HTTP/SSE endpoints for agent communication
- **Observability**: Prometheus metrics and structured JSON logging
- **Security**: Optional API key authentication
- **Configuration**: Environment-based settings management

## Installation

### Using pip

```bash
cd agents/common
pip install -r requirements.txt
```

### Using uv (recommended)

```bash
cd agents/common
uv pip install -r requirements.txt
```

## Quick Start

### Running the Agent Server

```bash
cd agents/common
uvicorn app.main:app --host 0.0.0.0 --port 9001
```

The server will start on `http://localhost:9001`.

### Testing the API

```bash
# Get agent info
curl http://localhost:9001/v1/agent/info

# Check health
curl http://localhost:9001/v1/agent/health

# Create a task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "test_task",
    "input": {"prompt": "test"}
  }'
```

## Configuration

Configuration is managed through environment variables. Create a `.env` file or set environment variables:

```bash
# Agent Identity
AGENT_ID=reachy-001
ROBOT_TYPE=reachy
AGENT_VERSION=0.1.0

# Backend Configuration
AIM_BASE_URL_DEFAULT=https://aim.example.com/v1
AIM_API_KEY_DEFAULT=sk-...
BACKEND_DEFAULT=aim

# Policy Defaults
E2E_SLO_MS_DEFAULT=2500
TIMEOUT_MS_DEFAULT=2200

# Security
AUTH_MODE=none  # or "api_key"
API_KEY=your-api-key-here

# Server Configuration
HOST=0.0.0.0
PORT=9001
LOG_LEVEL=INFO

# Observability
METRICS_ENABLED=true
METRICS_PORT=9090
```

## API Endpoints

### `GET /v1/agent/info`

Get agent identity and capabilities.

**Response:**
```json
{
  "robot_id": "reachy-001",
  "robot_type": "reachy",
  "capabilities": [],
  "version": "0.1.0",
  "backend_default": "aim"
}
```

### `GET /v1/agent/health`

Get agent health status.

**Response:**
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

### `POST /v1/tasks`

Submit a new task for execution.

**Request:**
```json
{
  "task_type": "reachy_devops_copilot",
  "input": {
    "prompt": "Summarize the last production deployment"
  },
  "routing": {
    "backend": "aim",
    "base_url": "https://aim.example.com/v1",
    "api_key": "sk-..."
  },
  "policy": {
    "e2e_slo_ms": 2500,
    "timeout_ms": 2200
  },
  "trace": {
    "session_id": "session-001",
    "request_id": "req-001"
  }
}
```

**Response:**
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

### `GET /v1/tasks/{task_id}`

Get task execution status.

**Response:**
```json
{
  "task_id": "uuid-here",
  "state": "completed",
  "progress": 1.0,
  "latency_ms": 1200,
  "aim_latency_ms": 800,
  "e2e_ms": 1200,
  "e2e_slo_ms": 2500,
  "slo_pass": true,
  "result": {...},
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:05Z"
}
```

### `GET /v1/metrics`

Get Prometheus metrics.

**Response:** Prometheus text format

### `GET /v1/events`

Stream Server-Sent Events (SSE) for real-time updates.

**Response:** SSE event stream

## Testing

### Running Tests

```bash
cd agents/common
pytest
```

### Running Tests with Coverage

```bash
pytest --cov=app --cov-report=html
```

### Running Specific Test Files

```bash
# Unit tests only
pytest tests/test_models.py tests/test_settings.py

# Integration tests only
pytest tests/test_integration.py
```

## Architecture

The common agent framework provides:

1. **Models** (`app/models.py`): Pydantic models for API requests/responses
2. **Settings** (`app/settings.py`): Environment-based configuration
3. **Observability** (`app/observability.py`): Metrics and structured logging
4. **Security** (`app/security.py`): API key authentication middleware
5. **Main App** (`app/main.py`): FastAPI application with all routes

## Extending for Specific Agents

To create a specific agent (e.g., Reachy), extend the common framework:

```python
# agents/reachy-agent/app/main.py
from agents.common.app.main import app, tasks, emit_event
from agents.common.app.models import TaskState, EventType, Event

@app.post("/v1/tasks")
async def create_task(task_request: TaskRequest):
    # Call parent implementation
    task_status = await super().create_task(task_request)
    
    # Add Reachy-specific logic
    if task_request.task_type == "reachy_devops_copilot":
        # Execute Reachy-specific task
        pass
    
    return task_status
```

## Documentation

- [API Contract](../../contracts/openapi.yaml): OpenAPI 3.0 specification
- [Fleet Architecture](../../docs/fleet/fleet-architecture.md): System architecture
- [Testing Guide](../../docs/fleet/testing-guide.md): Testing instructions

## License

See [LICENSE](../../LICENSE) for details.

