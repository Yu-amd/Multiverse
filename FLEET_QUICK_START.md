# Fleet System Quick Start Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ROG Handheld (Multiverse)                │
│              Fleet Control Plane UI                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Fleet View   │  │ Robot Detail │  │ Observability │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/SSE
                          │ Agent API
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│ Strix Halo 1 │  │ Strix Halo 2 │  │ Strix Halo 3 │
│ Reachy Agent │  │ LeKiwi Agent │  │ SO-101 Agent │
│              │  │              │  │              │
│  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │
│  │ Reachy │  │  │  │LeKiwi  │  │  │  │ SO-101 │  │
│  │  Mini  │  │  │  │  Base  │  │  │  │  Arm   │  │
│  └────────┘  │  │  └────────┘  │  │  └────────┘  │
└───────┬──────┘  └───────┬──────┘  └───────┬──────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │ OpenAI-compatible API
                  ┌───────▼───────┐
                  │  AIM Backend  │
                  │  (MI300X)     │
                  │  Kubernetes   │
                  └───────────────┘
```

## Key Concepts

### Agent API Contract
All robots expose the same HTTP/SSE API:
- `GET /v1/agent/info` - Robot identity and capabilities
- `GET /v1/agent/health` - Health status
- `POST /v1/tasks` - Submit task
- `GET /v1/tasks/{task_id}` - Task status
- `GET /v1/events` - SSE stream for live updates
- `GET /v1/metrics` - Prometheus metrics

### Task Flow
1. **ROG UI** submits task via `POST /v1/tasks`
2. **Agent** acknowledges, emits `ack_sent` event
3. **Agent** calls **AIM backend** (if needed)
4. **Agent** executes robot-specific actions
5. **Agent** emits progress events via SSE
6. **Agent** returns result with metrics

### Enterprise Features
- **SLO Tracking**: Every task includes `e2e_slo_ms` and `e2e_ms`
- **Observability**: Prometheus metrics + structured JSON logs
- **Backend Routing**: Per-task override (local vs AIM)
- **Safety Guardrails**: Whitelisted commands, workspace limits

## Development Commands

### Run Reachy Agent
```bash
cd agents/reachy-agent
uvicorn app.main:app --host 0.0.0.0 --port 9001
```

### Run LeKiwi Agent
```bash
cd agents/lekiwi-agent
uvicorn app.main:app --host 0.0.0.0 --port 9002
```

### Run SO-101 Agent
```bash
cd agents/so101-agent
uvicorn app.main:app --host 0.0.0.0 --port 9003
```

### Test Agent API
```bash
# Get agent info
curl http://localhost:9001/v1/agent/info

# Check health
curl http://localhost:9001/v1/agent/health

# Submit task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": { "prompt": "Summarize the last production deployment" },
    "routing": { "backend": "aim", "base_url": "https://aim.example.com/v1" },
    "policy": { "e2e_slo_ms": 2500, "timeout_ms": 2200 },
    "trace": { "session_id": "demo-001" }
  }'

# Stream events (SSE)
curl http://localhost:9001/v1/events
```

## Demo Scenarios

### 1. Reachy: DevOps Copilot
**What it proves**: OpenAI-compatible inference portability, latency-aware UX

**Task**: Answer DevOps questions with gestures
- "Summarize the last production deployment"
- "What does p95 latency mean?"
- "5-step incident triage checklist"

**Expected behavior**:
1. Reachy acknowledges (gesture)
2. Reachy "thinks" (gesture)
3. Calls AIM backend
4. Reachy completes (gesture)
5. Returns answer + metrics

### 2. LeKiwi: Inspection Run
**What it proves**: Edge perception + backend reasoning separation

**Task**: Navigate and inspect zone, generate report
- LeKiwi navigates predefined route
- Captures 10 snapshots
- Sends to AIM for analysis
- Returns structured JSON report

**Expected behavior**:
1. LeKiwi starts navigation
2. Captures images at intervals
3. Sends batch to AIM
4. Returns report: detected items, anomalies, ticket draft

### 3. SO-101: Workcell Executor
**What it proves**: Deterministic actuation with policy guardrails

**Task**: Execute pick/place procedure
- AIM generates procedure steps
- Agent validates against whitelist
- Executes safely
- Returns execution log

**Expected behavior**:
1. Receives procedure steps
2. Validates commands
3. Executes sequentially
4. Supports pause/resume/abort
5. Returns detailed log

### 4. Fleet: Coordinated Run (Future)
**What it proves**: One control plane, multiple endpoints

**Task**: Coordinate three robots simultaneously
- Reachy explains what's happening
- LeKiwi inspects Zone A
- SO-101 performs action

**Expected behavior**:
- All three tasks submitted in parallel
- Centralized observability
- Coordinated completion

## File Structure Quick Reference

```
agents/
├── common/              # Shared framework
│   └── app/
│       ├── main.py      # FastAPI app
│       ├── models.py    # Pydantic models
│       ├── settings.py  # Config
│       ├── observability.py
│       └── security.py
│
├── reachy-agent/        # Reachy-specific
│   └── app/
│       ├── main.py
│       ├── reachy_driver.py
│       └── gestures.py
│
├── lekiwi-agent/        # LeKiwi-specific
│   └── app/
│       ├── main.py
│       └── lekiwi_driver.py
│
└── so101-agent/         # SO-101-specific
    └── app/
        ├── main.py
        ├── so101_driver.py
        └── procedure_executor.py

multiverse-fleet-ui/     # ROG control plane
└── src/
    ├── components/
    │   ├── FleetOverview.tsx
    │   ├── RobotDetail.tsx
    │   └── ScenarioPicker.tsx
    └── services/
        └── fleetApi.ts

contracts/
└── openapi.yaml         # API specification
```

## Next Steps

1. **Start with Phase 0**: Set up common agent framework
2. **Implement Phase 1**: Reachy agent (simplest, good proof of concept)
3. **Iterate**: Test with real hardware early
4. **Build up**: Add LeKiwi, then SO-101, then fleet UI

## Key Principles

1. **Open Standards**: ROS 2, OpenAI-compatible APIs, Kubernetes
2. **Edge-First**: Fast inference on Strix Halo, heavy reasoning on AIM
3. **Observability**: Every task logged and metered
4. **Safety**: Guardrails and whitelisted commands
5. **Enterprise-Ready**: SLOs, security, audit logs from day one

