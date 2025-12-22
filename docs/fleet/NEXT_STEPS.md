# What's Next: Phase 1 Implementation

## Current Status

✅ **Phase 0 Complete**: Common agent framework is fully implemented, tested, and documented.

## Next Phase: Phase 1 - Reachy Agent

### Overview

Implement the **Reachy Agent** with a DevOps copilot scenario. This will be the first concrete robot agent that extends the common framework.

### Goals

1. **Extend Common Framework**: Build Reachy-specific agent on top of Phase 0
2. **DevOps Copilot**: Answer DevOps questions with physical gestures
3. **AIM Integration**: Connect to AIM backend for inference
4. **Observability**: Full metrics and logging
5. **Demo Ready**: Three pre-canned scenarios working end-to-end

### What You'll Build

```
agents/reachy-agent/
├── app/
│   ├── main.py              # Extends common framework
│   ├── reachy_driver.py     # Hardware driver
│   ├── gestures.py          # Gesture library
│   └── backend_client.py    # AIM/OpenAI client
├── tests/
│   ├── test_reachy_driver.py
│   ├── test_gestures.py
│   └── test_integration.py
└── README.md
```

### Key Features

- **Gesture Control**: Acknowledge, thinking, done, error gestures
- **AIM Backend**: OpenAI-compatible API calls
- **Task Execution**: `reachy_devops_copilot` task type
- **Event Streaming**: Real-time SSE events
- **Metrics**: Full observability integration

### Demo Scenarios

1. "Summarize the last production deployment"
2. "What does p95 latency mean and why should I care?"
3. "Give a 5-step incident triage checklist for CrashLoopBackOff"

## Implementation Steps

### Step 1: Create Reachy Agent Structure

```bash
cd /home/yw/Desktop/Multiverse/agents/reachy-agent
mkdir -p app tests
```

### Step 2: Extend Common Framework

- Import and extend `agents.common.app.main`
- Override agent info with Reachy-specific capabilities
- Implement task execution logic

### Step 3: Implement Hardware Driver

- Connect to Reachy Mini (ROS 2 or direct API)
- Implement gesture functions
- Add safety checks

### Step 4: Implement Backend Client

- OpenAI-compatible API wrapper
- AIM backend integration
- Latency measurement

### Step 5: Testing

- Unit tests for gestures
- Integration tests for AIM calls
- End-to-end scenario tests

## Prerequisites

### Hardware (Optional for Development)

- **Reachy Mini**: Physical robot (can mock for development)
- **Strix Halo**: Edge device (can develop on ROG Ally X first)

### Software

- Python 3.10+ (already set up)
- ROS 2 (if using real Reachy hardware)
- AIM backend access (or mock server)

### Development Setup

```bash
# Create Reachy agent directory
cd /home/yw/Desktop/Multiverse/agents/reachy-agent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies (will include common framework)
pip install -r requirements.txt
```

## Alternative: Start Without Hardware

You can implement Phase 1 with **mocked hardware**:

1. **Mock Reachy Driver**: Simulate gestures without real hardware
2. **Mock AIM Backend**: Use local mock server or OpenAI API
3. **Full Testing**: All logic works, just without physical robot

This allows you to:
- ✅ Complete Phase 1 implementation
- ✅ Test all code paths
- ✅ Verify observability
- ✅ Demo the system (with simulated gestures)

Then add real hardware integration later.

## Timeline Estimate

- **With Hardware**: 1-2 weeks
- **Without Hardware (Mocked)**: 3-5 days

## Quick Start Commands

Once Phase 1 is implemented:

```bash
# Start Reachy agent
cd agents/reachy-agent
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 9001

# Test from ROG Ally X or another device
curl -X POST http://<agent-ip>:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "Summarize the last production deployment"},
    "routing": {"backend": "aim", "base_url": "https://aim.example.com/v1"}
  }'
```

## Decision Point

**Choose your path:**

### Option A: Full Implementation (Recommended)
- Implement with real Reachy hardware
- Full end-to-end demo
- Production-ready code

### Option B: Mocked Implementation (Faster)
- Mock hardware driver
- Complete all logic
- Add hardware later

### Option C: Skip to Phase 4 (UI First)
- Build fleet UI first
- Connect to mocked agents
- Add real agents later

## Recommended Next Actions

1. **Review Phase 1 Plan**: Read `FLEET_IMPLEMENTATION_PLAN.md` Phase 1 section
2. **Decide on Hardware**: Do you have Reachy Mini available?
3. **Set Up Development**: Create Reachy agent structure
4. **Start Implementation**: Begin with mocked driver, add hardware later

## Questions to Consider

- ✅ Do you have Reachy Mini hardware available?
- ✅ Do you have AIM backend access (or will you mock it)?
- ✅ Do you want to start with mocked hardware for faster development?
- ✅ Should we implement Phase 4 (Fleet UI) first to visualize agents?

## Resources

- **Implementation Plan**: `FLEET_IMPLEMENTATION_PLAN.md`
- **Phase 0 Docs**: `docs/fleet/PHASE0_COMPLETE.md`
- **Testing Guide**: `docs/fleet/testing-guide.md`
- **Architecture**: `docs/fleet/fleet-architecture.md`

---

**Ready to start Phase 1?** Let me know if you'd like me to:
1. Begin implementing Phase 1 (with or without hardware)
2. Create a detailed Phase 1 implementation guide
3. Set up the Reachy agent structure
4. Something else?

