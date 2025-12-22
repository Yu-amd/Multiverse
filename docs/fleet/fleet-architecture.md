# Fleet System Architecture

## Overview

The fleet system is a production-ready robotics control platform that enables centralized management of multiple robots through a standardized API.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ROG Handheld (Multiverse)                │
│              Fleet Control Plane UI                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Fleet View   │  │ Robot Detail │  │ Observability │      │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/SSE
                          │ Agent API
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│ Strix Halo 1 │  │ Strix Halo 2 │  │ Strix Halo 3  │
│ Reachy Agent │  │ LeKiwi Agent │  │ SO-101 Agent  │
│              │  │              │  │               │
│  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐   │
│  │ Reachy │  │  │  │LeKiwi  │  │  │  │ SO-101 │   │
│  │  Mini  │  │  │  │  Base  │  │  │  │  Arm   │   │
│  └────────┘  │  │  └────────┘  │  │  └────────┘   │
└───────┬──────┘  └───────┬──────┘  └───────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │ OpenAI-compatible API
                  ┌───────▼───────┐
                  │  AIM Backend  │
                  │  (MI300X)     │
                  │  Kubernetes   │
                  └───────────────┘
```

## Components

### 1. ROG Handheld (Multiverse)

**Role:** Fleet control plane UI

**Responsibilities:**
- Display fleet overview and robot status
- Submit tasks to agents
- Monitor real-time events via SSE
- View observability metrics
- Manage backend routing

**Technology:**
- React/TypeScript frontend
- HTTP client for Agent API
- SSE client for event streaming

### 2. Agent Framework (Common)

**Role:** Standardized API infrastructure

**Responsibilities:**
- HTTP/SSE API endpoints
- Task management and tracking
- Observability (metrics + logs)
- Security (API key authentication)
- Configuration management

**Technology:**
- FastAPI (Python)
- Prometheus metrics
- Structured JSON logging
- Pydantic models

### 3. Robot Agents

**Role:** Robot-specific execution

**Components:**
- **Reachy Agent**: DevOps copilot with gestures
- **LeKiwi Agent**: Inspection runs with vision
- **SO-101 Agent**: Workcell procedure executor

**Responsibilities:**
- Hardware driver integration
- Task execution logic
- Safety guardrails
- Backend inference calls

**Technology:**
- Python (extends common framework)
- ROS 2 (for hardware communication)
- OpenAI-compatible API client

### 4. Edge Devices (Strix Halo)

**Role:** Edge execution and safety

**Responsibilities:**
- Real-time robot control
- Local AI inference (optional)
- Safety monitoring
- Communication with backend

**Technology:**
- AMD Ryzen AI APU
- Linux OS
- ROS 2 runtime

### 5. AIM Backend (MI300X)

**Role:** Inference service

**Responsibilities:**
- Heavy AI reasoning
- Model serving
- Multi-tenant GPU sharing
- Autoscaling

**Technology:**
- AMD Instinct MI300X GPUs
- Kubernetes orchestration
- OpenAI-compatible API
- Enterprise AI Suite

## Data Flow

### Task Submission Flow

1. **User** submits task via ROG UI
2. **ROG UI** sends `POST /v1/tasks` to Agent
3. **Agent** acknowledges task, emits `task_created` event
4. **Agent** executes robot-specific logic
5. **Agent** calls **AIM backend** (if needed) for inference
6. **Agent** updates task status, emits progress events
7. **Agent** returns result with metrics
8. **ROG UI** displays result and updates observability

### Event Streaming Flow

1. **ROG UI** connects to `GET /v1/events` (SSE)
2. **Agent** emits events as tasks progress:
   - `task_created`
   - `ack_sent`
   - `inference_started`
   - `inference_done`
   - `task_done`
3. **ROG UI** receives events in real-time and updates UI

## API Contract

All agents expose the same standardized API:

- `GET /v1/agent/info` - Agent identity
- `GET /v1/agent/health` - Health status
- `POST /v1/tasks` - Submit task
- `GET /v1/tasks/{task_id}` - Task status
- `GET /v1/metrics` - Prometheus metrics
- `GET /v1/events` - SSE event stream

See [OpenAPI specification](../../contracts/openapi.yaml) for details.

## Security

### Authentication

- Optional API key authentication via `X-API-Key` header
- Configurable via `AUTH_MODE` environment variable
- Default: `none` (no authentication for local dev)

### Network Security

- HTTPS/TLS for production
- Network isolation for edge devices
- Secure backend API keys

## Observability

### Metrics (Prometheus)

- `task_e2e_ms` - End-to-end task latency
- `aim_latency_ms` - AIM backend latency
- `task_errors_total` - Error counter
- `tasks_active` - Active tasks gauge
- `tasks_total` - Total tasks counter

### Logging

- Structured JSON logs
- Request tracing (session_id, request_id)
- Task-level logging with metrics

### Events (SSE)

- Real-time event streaming
- Task lifecycle events
- Progress updates

## Scalability

### Horizontal Scaling

- Multiple agents can run independently
- Fleet UI can manage N robots
- AIM backend scales via Kubernetes

### Vertical Scaling

- Edge devices handle real-time control
- Backend handles heavy inference
- Clear separation of concerns

## Deployment

### Development

- Agents run locally on development machines
- Mock hardware drivers for testing
- Local AIM backend or mock server

### Production

- Agents run on Strix Halo edge devices
- Fleet UI on ROG handheld
- AIM backend on Kubernetes cluster
- Network isolation and security

## Future Enhancements

- **Fleet Orchestration**: Coordinate multiple robots
- **Resource Management**: Dynamic backend allocation
- **Advanced Safety**: Multi-level safety checks
- **Simulation**: Digital twin integration
- **Analytics**: Fleet-wide performance analysis

