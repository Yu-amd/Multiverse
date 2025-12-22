# Enterprise Robotics Fleet Implementation Plan

## Overview

This plan outlines the phased implementation of a production-ready robotics fleet control system using Multiverse on ROG as the control plane, with AMD Strix Halo edge devices and AIM (MI300X) backend inference.

**Core Architecture:**
- **ROG Handheld**: Fleet control plane UI (Multiverse)
- **Strix Halo**: Edge execution + safety for each robot
- **AIM (MI300X)**: Inference service backend
- **Agent API**: Standardized HTTP/SSE contract between control plane and robots

---

## Phase 0: Foundation & Setup (Week 1)

### Goals
- Establish common agent infrastructure
- Define API contracts
- Set up development environment

### Tasks

#### 0.1 Repository Structure
```
reachy-aim-enterprise-demo/
├── agents/
│   ├── common/              # Shared agent framework
│   │   ├── app/
│   │   │   ├── main.py      # FastAPI app skeleton
│   │   │   ├── models.py    # Pydantic models
│   │   │   ├── settings.py  # Configuration
│   │   │   ├── observability.py  # Metrics & logging
│   │   │   └── security.py  # Auth middleware
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   ├── reachy-agent/        # Reachy-specific agent
│   ├── lekiwi-agent/        # LeKiwi-specific agent
│   └── so101-agent/         # SO-101-specific agent
├── multiverse-fleet-ui/     # ROG control plane (existing Multiverse)
├── contracts/
│   └── openapi.yaml         # API specification
└── docs/
    ├── demo-runbook.md
    └── fleet-architecture.md
```

#### 0.2 Common Agent Framework (`agents/common/`)

**0.2.1 Models (`app/models.py`)**
- `TaskRequest`: task_type, input, routing, policy, trace
- `TaskStatus`: state, progress, latency_ms, result
- `AgentInfo`: robot_id, type, capabilities, version
- `HealthStatus`: status, last_seen, sensors_ok, actuators_ok
- `RoutingConfig`: backend (local|aim), base_url, api_key
- `PolicyConfig`: e2e_slo_ms, timeout_ms

**0.2.2 Settings (`app/settings.py`)**
- Environment-based configuration
- `AGENT_ID`, `ROBOT_TYPE`
- `AIM_BASE_URL_DEFAULT`
- `E2E_SLO_MS_DEFAULT` (2500ms)
- `AUTH_MODE` (none|api_key)

**0.2.3 Observability (`app/observability.py`)**
- Prometheus metrics:
  - `task_e2e_ms` (histogram)
  - `aim_latency_ms` (histogram)
  - `task_errors_total` (counter)
  - `tasks_active` (gauge)
- Structured JSON logging
- Request tracing (session_id, request_id)

**0.2.4 Security (`app/security.py`)**
- Optional API key middleware
- `X-API-Key` header validation
- Rate limiting (future)

**0.2.5 Main App (`app/main.py`)**
- FastAPI application
- Routes:
  - `GET /v1/agent/info`
  - `GET /v1/agent/health`
  - `POST /v1/tasks`
  - `GET /v1/tasks/{task_id}`
  - `GET /v1/metrics` (Prometheus)
  - `GET /v1/events` (SSE stream)
- SSE event emitter for live updates

#### 0.3 API Contract (`contracts/openapi.yaml`)
- OpenAPI 3.0 specification
- All endpoints documented
- Request/response schemas
- Example payloads

#### 0.4 Documentation
- `docs/fleet-architecture.md`: System architecture diagram
- `docs/demo-runbook.md`: Step-by-step demo execution guide

### Deliverables
- ✅ Common agent framework with all routes stubbed
- ✅ OpenAPI contract document
- ✅ Basic observability (metrics + logs)
- ✅ Development environment setup guide

### Testing
- Unit tests for models and utilities
- Integration test for agent API endpoints (without robot hardware)

---

## Phase 1: Reachy Agent - DevOps Copilot (Week 2)

### Goals
- Implement Reachy agent with DevOps copilot scenario
- Demonstrate OpenAI-compatible inference portability
- Show latency-aware UX (ack/thinking/done gestures)

### Tasks

#### 1.1 Reachy Agent Implementation (`agents/reachy-agent/`)

**1.1.1 Driver Integration (`app/reachy_driver.py`)**
- Connect to Reachy Mini hardware
- Implement gesture control:
  - `ack_gesture()`: Acknowledge task received
  - `thinking_gesture()`: Processing indicator
  - `done_gesture()`: Task complete
  - `error_gesture()`: Error state
- Safety checks (joint limits, emergency stop)

**1.1.2 Gesture Library (`app/gestures.py`)**
- Predefined gesture sequences
- Smooth motion planning
- Non-blocking gesture execution

**1.1.3 Main Agent (`app/main.py`)**
- Extend common agent framework
- Implement `reachy_devops_copilot` task type:
  1. Receive task request
  2. Emit `ack_sent` event → trigger `ack_gesture()`
  3. Emit `inference_started` event → trigger `thinking_gesture()`
  4. Call AIM backend (OpenAI-compatible API)
  5. Measure `aim_latency_ms`
  6. Emit `inference_done` event
  7. Trigger `done_gesture()`
  8. Return result with metrics
  9. Emit `task_done` event

**1.1.4 Backend Routing (`app/backend_client.py`)**
- OpenAI-compatible client wrapper
- Support `local` (future) and `aim` backends
- Handle API keys, timeouts, retries
- Measure latency for observability

#### 1.2 Demo Scenarios
Three pre-canned prompts:
1. "Summarize the last production deployment"
2. "What does p95 latency mean and why should I care?"
3. "Give a 5-step incident triage checklist for CrashLoopBackOff"

#### 1.3 Enterprise Features
- **SLO Tracking**: Compare `e2e_ms` vs `e2e_slo_ms` in response
- **Metrics**: Increment counters after each task
- **Structured Logs**: Include `request_id`, `session_id`, `backend_used`, `aim_ms`, `e2e_ms`, `slo_pass`
- **Error Handling**: Graceful degradation if AIM unavailable

### Deliverables
- ✅ Reachy agent running on Strix Halo
- ✅ DevOps copilot scenario working end-to-end
- ✅ Observable metrics and logs
- ✅ SSE events streaming to client

### Testing
- Manual testing with Reachy hardware
- Unit tests for gesture sequences
- Integration tests for AIM backend calls
- Latency measurement validation

---

## Phase 2: LeKiwi Agent - Inspection Run (Week 3)

### Goals
- Implement LeKiwi agent with inspection scenario
- Demonstrate edge perception + backend reasoning separation
- Show structured outputs for enterprise integration

### Tasks

#### 2.1 LeKiwi Agent Implementation (`agents/lekiwi-agent/`)

**2.1.1 Driver Integration (`app/lekiwi_driver.py`)**
- Connect to LeKiwi mobile base
- Navigation control (start/stop)
- Camera capture (snapshots or stream)
- Safety: emergency stop, obstacle detection

**2.1.2 Main Agent (`app/main.py`)**
- Implement `lekiwi_inspection_run` task type:
  1. Start navigation (predefined route or waypoints)
  2. Capture N snapshots (e.g., 10) at intervals
  3. Collect images → send batch to AIM for analysis
  4. AIM returns structured report (JSON):
     - Detected items count
     - Anomalies (missing label, mismatch, etc.)
     - Ticket draft (human-readable summary)
  5. Return structured result

**2.1.3 Vision Processing**
- Image capture and encoding
- Batch processing for efficiency
- Error handling for camera failures

**2.1.4 Structured Output Parser**
- Parse AIM response into standardized format
- Validate JSON schema
- Generate human-readable summary

#### 2.2 Demo Scenario
- **Input**: "Run inspection of Zone A"
- **Behavior**: 
  - LeKiwi navigates predefined route
  - Captures 10 snapshots
  - Sends to AIM for analysis
- **Output**: JSON report + human summary

#### 2.3 Enterprise Features
- **Job Tracking**: Each inspection is a "job" with ID
- **Artifact Storage**: Save images and reports (local or remote)
- **Structured Logs**: Include job_id, snapshot_count, anomalies_detected
- **Metrics**: Track inspection duration, images processed, anomalies found

### Deliverables
- ✅ LeKiwi agent running on Strix Halo
- ✅ Inspection run scenario working end-to-end
- ✅ Structured JSON output + human summary
- ✅ Job tracking and artifact management

### Testing
- Manual testing with LeKiwi hardware
- Mock camera for unit tests
- AIM integration tests with sample images
- Structured output validation

---

## Phase 3: SO-101 Agent - Workcell Executor (Week 4)

### Goals
- Implement SO-101 agent with procedure executor
- Demonstrate deterministic actuation with policy guardrails
- Show safe bounded actions with pause/resume/abort

### Tasks

#### 3.1 SO-101 Agent Implementation (`agents/so101-agent/`)

**3.1.1 Driver Integration (`app/so101_driver.py`)**
- Connect to SO-101 robotic arm
- Motion control (joint positions, trajectories)
- Safety: workspace limits, collision detection, emergency stop
- Calibration and homing

**3.1.2 Procedure Executor (`app/procedure_executor.py`)**
- Whitelisted command set:
  - `move_to(position, speed)`
  - `pick(object_id)`
  - `place(position)`
  - `open_gripper()` / `close_gripper()`
- Procedure versioning
- Execution state machine: `idle` → `running` → `paused` → `completed` → `aborted`

**3.1.3 Main Agent (`app/main.py`)**
- Implement `so101_workcell_executor` task type:
  1. Receive procedure steps (from AIM or pre-scripted)
  2. Validate against whitelist
  3. Execute steps sequentially
  4. Emit progress events
  5. Support pause/resume/abort commands
  6. Return execution log

**3.1.4 Safety Guardrails**
- Workspace boundary checks
- Speed limits
- Force/torque monitoring
- Emergency stop handling

#### 3.2 Demo Scenario
- **Input**: "Execute cup stacking procedure"
- **Behavior**:
  - AIM generates procedure steps (text)
  - Agent validates and executes whitelisted commands
  - Real-time progress updates
- **Output**: Execution log with timestamps

#### 3.3 Enterprise Features
- **Procedure Versioning**: Track which procedure version was executed
- **Execution Log**: Detailed log with timestamps, positions, errors
- **Control Commands**: Pause/resume/abort via API
- **Metrics**: Track execution time, success rate, safety stops

### Deliverables
- ✅ SO-101 agent running on Strix Halo
- ✅ Workcell executor scenario working end-to-end
- ✅ Procedure versioning and execution logs
- ✅ Pause/resume/abort controls

### Testing
- Manual testing with SO-101 hardware
- Unit tests for procedure executor
- Safety guardrail validation
- Control command tests (pause/resume/abort)

---

## Phase 4: Multiverse Fleet UI on ROG (Week 5)

### Goals
- Extend Multiverse to support fleet control
- Create fleet overview and robot detail views
- Integrate with Agent API endpoints

### Tasks

#### 4.1 Fleet UI Components

**4.1.1 Fleet Overview Screen**
- Fleet health bar: `X online • Y degraded • Z offline`
- Robot cards (tap to open):
  - Robot name, status, edge device, backend, p95 latency
  - Visual status indicators
- Backend selector (global default): `Local (Strix Halo)` / `Remote (AIM MI300X)`
- Bottom bar: `Run Demo`, `Observability`, `Settings`

**4.1.2 Robot Detail Screen**
- Tabs: **Task**, **State**, **Logs**
- Task tab:
  - Suggested tasks (pre-canned demos)
  - Prompt input box (natural language)
  - Backend routing override (per-request)
- State tab:
  - Current robot state (sensors, actuators, navigation)
  - Real-time status updates
- Logs tab:
  - Structured log viewer
  - Filter by level, time range

**4.1.3 Scenario Picker**
- List of available scenarios:
  - `Reachy: DevOps Copilot`
  - `LeKiwi: Inspection Run`
  - `SO-101: Workcell Pick/Place`
  - `Fleet: Coordinated Run` (future)
- Each scenario shows:
  - Expected duration
  - What will be visible
  - Expected latency tier

**4.1.4 Observability Screen**
- Minimal metrics (handheld-friendly):
  - Requests/min
  - p50/p95 latency
  - Error rate
  - SLO pass %
- Optional "View full Grafana" link

#### 4.2 Agent API Integration

**4.2.1 API Client (`src/services/fleetApi.ts`)**
- HTTP client for Agent API endpoints
- SSE client for event streaming
- Error handling and retries
- Request/response type safety

**4.2.2 State Management**
- Robot status polling
- Event stream connection management
- Task submission and tracking
- Backend routing configuration

**4.2.3 Real-time Updates**
- SSE event handling
- Live status updates
- Progress indicators
- Error notifications

#### 4.3 UI/UX Polish
- Responsive design for ROG handheld
- Loading states and animations
- Error messages and retry logic
- Offline detection and handling

### Deliverables
- ✅ Fleet overview screen
- ✅ Robot detail screens
- ✅ Scenario picker
- ✅ Observability dashboard
- ✅ Agent API integration
- ✅ Real-time event streaming

### Testing
- Manual testing on ROG handheld
- Mock agent servers for development
- Integration tests with real agents
- UI responsiveness testing

---

## Phase 5: Fleet Orchestration (Week 6)

### Goals
- Implement coordinated fleet operations
- Demonstrate one control plane managing multiple robots
- Show enterprise-scale orchestration

### Tasks

#### 5.1 Fleet Coordinator

**5.1.1 Task Orchestration (`multiverse-fleet-ui/src/services/fleetCoordinator.ts`)**
- Multi-robot task submission
- Dependency management (e.g., LeKiwi inspects before SO-101 acts)
- Parallel execution where safe
- Sequential execution where required

**5.1.2 Fleet Scenario: "Coordinated Run"**
- Story: Multiverse issues three tasks simultaneously:
  1. Reachy explains what's happening (DevOps copilot)
  2. LeKiwi inspects Zone A
  3. SO-101 performs pick/place action
- Each agent handles safety + execution locally
- AIM provides heavy reasoning
- Centralized observability

#### 5.2 Enhanced Observability
- Fleet-wide metrics aggregation
- Cross-robot correlation
- Timeline visualization
- Performance comparison

#### 5.3 Enterprise Features
- **Fleet Health Dashboard**: Aggregate status across all robots
- **Resource Management**: Track AIM backend utilization
- **SLO Tracking**: Fleet-wide SLO compliance
- **Audit Log**: All fleet operations logged

### Deliverables
- ✅ Fleet orchestration working
- ✅ Coordinated run scenario
- ✅ Fleet-wide observability
- ✅ Enterprise audit logging

### Testing
- End-to-end fleet scenario testing
- Concurrent task handling
- Error propagation and recovery
- Performance under load

---

## Phase 6: Enterprise Polish & Documentation (Week 7)

### Goals
- Add production-ready features
- Complete documentation
- Prepare for demos and presentations

### Tasks

#### 6.1 Security Hardening
- API key authentication
- TLS/HTTPS for all communications
- Rate limiting
- Input validation and sanitization

#### 6.2 Reliability Features
- Health check improvements
- Automatic recovery from failures
- Graceful degradation
- Circuit breakers for backend calls

#### 6.3 Documentation
- **README.md**: Complete project overview
- **docs/architecture.md**: Detailed architecture diagrams
- **docs/api-reference.md**: Complete API documentation
- **docs/demo-runbook.md**: Step-by-step demo guide
- **docs/deployment.md**: Production deployment guide
- **docs/troubleshooting.md**: Common issues and solutions

#### 6.4 Demo Preparation
- Pre-recorded demo videos
- Screenshots for documentation
- Presentation slides
- Live demo script

#### 6.5 Performance Optimization
- Latency optimization
- Resource usage optimization
- Caching strategies
- Connection pooling

### Deliverables
- ✅ Production-ready security
- ✅ Complete documentation
- ✅ Demo materials
- ✅ Performance optimizations

### Testing
- Security audit
- Load testing
- Stress testing
- Documentation review

---

## Implementation Checklist

### Phase 0: Foundation
- [ ] Create repository structure
- [ ] Implement common agent framework
- [ ] Define OpenAPI contract
- [ ] Set up observability (metrics + logs)
- [ ] Write architecture documentation

### Phase 1: Reachy Agent
- [ ] Implement Reachy driver
- [ ] Create gesture library
- [ ] Integrate AIM backend
- [ ] Implement DevOps copilot scenario
- [ ] Add SLO tracking
- [ ] Test end-to-end

### Phase 2: LeKiwi Agent
- [ ] Implement LeKiwi driver
- [ ] Add camera capture
- [ ] Implement inspection run scenario
- [ ] Add structured output parsing
- [ ] Implement job tracking
- [ ] Test end-to-end

### Phase 3: SO-101 Agent
- [ ] Implement SO-101 driver
- [ ] Create procedure executor
- [ ] Add safety guardrails
- [ ] Implement workcell executor scenario
- [ ] Add pause/resume/abort controls
- [ ] Test end-to-end

### Phase 4: Fleet UI
- [ ] Create fleet overview screen
- [ ] Create robot detail screens
- [ ] Implement scenario picker
- [ ] Add observability dashboard
- [ ] Integrate Agent API client
- [ ] Implement SSE event streaming
- [ ] Test on ROG handheld

### Phase 5: Fleet Orchestration
- [ ] Implement fleet coordinator
- [ ] Create coordinated run scenario
- [ ] Add fleet-wide observability
- [ ] Implement audit logging
- [ ] Test end-to-end fleet scenario

### Phase 6: Enterprise Polish
- [ ] Add security features
- [ ] Improve reliability
- [ ] Complete documentation
- [ ] Prepare demo materials
- [ ] Optimize performance

---

## Success Metrics

### Technical Metrics
- **Latency**: p95 < 2.5s for all tasks
- **Reliability**: 99%+ task success rate
- **Observability**: 100% of tasks logged and metered
- **Security**: All endpoints authenticated (production)

### Business Metrics
- **Demo Readiness**: All three robot scenarios working
- **Fleet Capability**: Coordinated multi-robot operations
- **Enterprise Readiness**: Production-grade security and observability
- **Documentation**: Complete and accurate

---

## Risk Mitigation

### Technical Risks
- **Hardware Integration**: Start with mock drivers, test early with real hardware
- **AIM Backend Availability**: Implement fallback to local models (future)
- **Network Latency**: Design for edge-first, backend-optional architecture
- **Concurrent Operations**: Use proper locking and state management

### Timeline Risks
- **Scope Creep**: Stick to MVP features, defer nice-to-haves
- **Hardware Delays**: Plan for hardware unavailability with simulation
- **Integration Complexity**: Test integration points early and often

---

## Next Steps

1. **Review and approve this plan**
2. **Set up development environment** (Phase 0)
3. **Begin Phase 1 implementation** (Reachy Agent)
4. **Iterate based on learnings** from each phase

---

## Notes

- Each phase builds on the previous one
- Test with real hardware as early as possible
- Keep enterprise features (SLOs, observability, security) in mind from the start
- Document as you go, not at the end
- Prioritize working demos over perfect code

