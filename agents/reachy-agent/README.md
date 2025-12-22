# Reachy Agent - DevOps Copilot

Reachy agent implementation for the fleet system, providing DevOps copilot functionality with gesture feedback.

## Overview

The Reachy agent extends the common agent framework to provide:
- **DevOps Copilot**: Answer DevOps questions with AI assistance
- **Gesture Feedback**: Physical gestures (ack, thinking, done, error)
- **Text-to-Speech**: Speaks AI responses through robot's speaker
- **AIM Integration**: OpenAI-compatible inference via AIM backend
- **Observability**: Full metrics and structured logging

## Features

- ✅ Extends common agent framework
- ✅ DevOps copilot task handler
- ✅ Gesture control (mocked or real hardware)
- ✅ AIM backend integration
- ✅ SLO tracking and metrics
- ✅ SSE event streaming
- ✅ Error handling and graceful degradation

## Installation

### Prerequisites

- Python 3.10+
- Common agent framework (in `../common/`)
- AIM endpoint configured (or mock server)

### Setup

```bash
cd agents/reachy-agent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Set environment variables or create `.env` file:

```bash
# Agent Identity
AGENT_ID=reachy-001
ROBOT_TYPE=reachy
AGENT_VERSION=0.1.0

# AIM Backend Configuration
AIM_BASE_URL_DEFAULT=https://aim.example.com/v1
AIM_API_KEY_DEFAULT=sk-...

# Server Configuration
HOST=0.0.0.0
PORT=9001
LOG_LEVEL=INFO

# Security (optional)
AUTH_MODE=none  # or "api_key"
API_KEY=your-api-key
```

## Running

### Start the Agent

**Important**: Set `PYTHONPATH` to include the common framework before starting:

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate

# Set PYTHONPATH to include common framework
export PYTHONPATH=/home/yw/Desktop/Multiverse/agents/common:$PYTHONPATH

# Start the agent
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

**Recommended**: Use the start script (sets PYTHONPATH automatically):

```bash
./start.sh
```

The agent will be available at `http://localhost:9001`

**Note**: If you see import errors, make sure PYTHONPATH is set correctly. The start script handles this automatically.

### Test the Agent

```bash
# Get agent info
curl http://localhost:9001/v1/agent/info

# Check health
curl http://localhost:9001/v1/agent/health

# Submit DevOps copilot task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
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
    }
  }'

# Get task status (use task_id from previous response)
curl http://localhost:9001/v1/tasks/{task_id}

# Stream events
curl -N http://localhost:9001/v1/events
```

## Demo Scenarios

Three pre-canned prompts for testing:

1. **"Summarize the last production deployment"**
2. **"What does p95 latency mean and why should I care?"**
3. **"Give a 5-step incident triage checklist for CrashLoopBackOff"**

## Hardware Support

### Mocked Mode (Default)

The agent runs in mocked mode by default, simulating gestures without hardware. Perfect for:
- Development and testing
- CI/CD pipelines
- Demonstrations without hardware

### Real Hardware

To use with real Reachy Mini hardware:

1. Install Reachy SDK:
   ```bash
   pip install reachy-sdk
   ```

2. Update `reachy_driver.py`:
   - Set `mocked=False`
   - Provide connection string
   - Implement hardware control

3. Update `gestures.py`:
   - Implement real gesture sequences
   - Connect to Reachy hardware

## API Endpoints

All endpoints from common framework, plus Reachy-specific implementations:

- `GET /v1/agent/info` - Reachy agent info with capabilities
- `GET /v1/agent/health` - Health status with driver checks
- `POST /v1/tasks` - Submit DevOps copilot task
- `GET /v1/tasks/{task_id}` - Task status
- `GET /v1/metrics` - Prometheus metrics
- `GET /v1/events` - SSE event stream

## Task Flow

1. **Task Submitted** → `task_created` event
2. **Acknowledged** → `ack_sent` event + ACK gesture
3. **Inference Started** → `inference_started` event + THINKING gesture
4. **AIM Backend Called** → OpenAI-compatible API
5. **Inference Done** → `inference_done` event + DONE gesture
6. **Task Completed** → `task_done` event with metrics

## Observability

- **Metrics**: Prometheus metrics at `/v1/metrics`
- **Logs**: Structured JSON logs
- **Events**: Real-time SSE stream
- **SLO Tracking**: End-to-end latency vs SLO

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html
```

## Architecture

```
Reachy Agent
├── Common Framework (agents/common/)
│   ├── Models, Settings, Observability
│   └── Base API endpoints
├── Reachy-Specific
│   ├── backend_client.py (AIM integration)
│   ├── gestures.py (Gesture control)
│   ├── reachy_driver.py (Hardware driver)
│   └── main.py (Task execution)
└── Extensions
    └── DevOps copilot task handler
```

## Next Steps

- Add more task types
- Implement real hardware integration
- Add gesture customization
- Enhance error recovery

## Documentation

- [Common Framework](../common/README.md)
- [Fleet Architecture](../../docs/fleet/fleet-architecture.md)
- [Implementation Plan](../../FLEET_IMPLEMENTATION_PLAN.md)

