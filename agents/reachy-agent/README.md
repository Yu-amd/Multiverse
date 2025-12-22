# Reachy Agent - DevOps Copilot

Reachy agent implementation for the Multiverse fleet system, providing DevOps copilot functionality with gesture feedback and text-to-speech.

## Overview

The Reachy agent extends the common agent framework to provide:
- **DevOps Copilot**: Answer DevOps questions with AI assistance
- **Gesture Feedback**: Physical gestures (ack, thinking, done, error) via Reachy Mini robot
- **Text-to-Speech**: Speaks AI responses through robot's speaker
- **AIM Integration**: OpenAI-compatible inference via AIM backend
- **Observability**: Full metrics and structured logging
- **Hardware Support**: Works with real Reachy Mini hardware or in mocked mode

## Features

- ✅ Extends common agent framework
- ✅ DevOps copilot task handler
- ✅ Gesture control (mocked or real hardware)
- ✅ Real hardware integration with Reachy Mini SDK
- ✅ Text-to-speech audio playback through robot speaker
- ✅ AIM backend integration
- ✅ SLO tracking and metrics
- ✅ SSE event streaming
- ✅ Error handling and graceful degradation
- ✅ Connection retry logic with cooldown
- ✅ Comprehensive test suite

## Quick Start

### 1. Install Dependencies

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start Agent (Mocked Mode)

```bash
./start.sh
```

### 3. Test the Agent

```bash
# Check agent info
curl http://localhost:9001/v1/agent/info

# Submit a task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean?"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

**That's it!** The agent is running in mocked mode. See [Running with Real Hardware](#running-with-real-hardware) for hardware setup.

## Prerequisites

### System Requirements

- **Python**: 3.10 or higher
- **Operating System**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Common Framework**: Must be available in `../common/` directory
- **AIM Backend**: Configured AIM endpoint (or mock server for testing)

### For Real Hardware (Optional)

- **Reachy Mini Robot**: Reachy Mini (Wireless) or Reachy Mini Lite
- **USB Connection** (Lite): USB cable and proper USB permissions
- **Network Connection** (Wireless): Robot on same network as agent
- **Audio System**: ALSA configured (Linux) for audio playback

### System Dependencies (Linux)

For audio playback on Linux, ensure ALSA is installed:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y alsa-utils alsa-base

# Check audio devices
aplay -l
```

For USB access (Reachy Mini Lite):

```bash
# Add user to dialout group for USB serial access
sudo usermod -a -G dialout $USER
# Log out and back in for changes to take effect
```

## Installation

### Step 1: Clone Repository

Ensure you have the Multiverse repository cloned with the common framework:

```bash
cd ~/Desktop/Multiverse
# Verify common framework exists
ls agents/common/app/
```

### Step 2: Create Virtual Environment

```bash
cd agents/reachy-agent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
# Install base dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: The `requirements.txt` includes:
- Core framework dependencies (FastAPI, uvicorn, etc.)
- Reachy Mini SDK (commented out by default - uncomment for hardware)
- Text-to-speech libraries (`edge-tts`, `pydub`)
- Testing dependencies (`pytest`, etc.)

### Step 4: Install Hardware Dependencies (Optional)

If you want to use real Reachy Mini hardware:

```bash
# Uncomment reachy_mini in requirements.txt, or install directly:
pip install reachy_mini>=1.2.0
```

### Step 5: Verify Installation

```bash
# Test Python imports
python -c "import fastapi; import uvicorn; print('✅ Core dependencies installed')"

# Test Reachy SDK (if installed)
python -c "from reachy_mini import ReachyMini; print('✅ Reachy SDK installed')" 2>/dev/null || echo "⚠️  Reachy SDK not installed (OK for mocked mode)"

# Test TTS libraries
python -c "import edge_tts; import pydub; print('✅ Audio libraries installed')"
```

### Step 6: Verify Common Framework

```bash
# Check common framework is accessible
python -c "import sys; sys.path.insert(0, '../common'); from app import models; print('✅ Common framework accessible')"
```

## Configuration

### Environment Variables

Set environment variables or create a `.env` file in the `agents/reachy-agent` directory:

```bash
# Agent Identity
AGENT_ID=reachy-001
ROBOT_TYPE=reachy
AGENT_VERSION=0.1.0

# Hardware Configuration
REACHY_MOCKED=true              # Set to "false" to enable real hardware
REACHY_AUDIO_ENABLED=true        # Enable text-to-speech (requires hardware)
REACHY_USE_ALSA_DIRECT=true     # Use ALSA directly for audio (Linux)

# AIM Backend Configuration
AIM_BASE_URL_DEFAULT=http://localhost:8000
AIM_API_KEY_DEFAULT=sk-your-api-key

# Server Configuration
HOST=0.0.0.0
PORT=9001
LOG_LEVEL=INFO

# Security (optional)
AUTH_MODE=none  # or "api_key"
API_KEY=your-api-key
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `REACHY_MOCKED` | `true` | Set to `false` to connect to real hardware |
| `REACHY_AUDIO_ENABLED` | `true` | Enable text-to-speech audio playback |
| `REACHY_USE_ALSA_DIRECT` | `true` | Use ALSA directly for audio routing (Linux) |
| `PORT` | `9001` | Agent API port |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Running

### Quick Start (Mocked Mode)

The agent runs in mocked mode by default, perfect for development and testing:

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
./start.sh
```

The agent will be available at `http://localhost:9001`

### Running with Real Hardware

#### Step 1: Prepare the Robot

1. **Power on the Reachy Mini** - Wait 30 seconds for full boot
2. **Connect via USB** (Lite) or ensure network connectivity (Wireless)
3. **Start Reachy Mini Daemon** (if needed):

```bash
# Check if daemon is needed (usually auto-started by robot)
# If port 7447 is not accessible, start daemon:
./start_daemon_fixed.sh

# Or manually:
reachy-mini-daemon --fastapi-port 8001
```

#### Step 2: Test Connection

Before starting the agent, verify the robot is accessible:

```bash
# Run connection test script
python test_connection.py
```

Expected output:
```
✅ reachy_mini SDK installed
✅ ReachyMini class imported successfully
✅ ReachyMini instance created successfully
✅ CONNECTION SUCCESSFUL!
```

#### Step 3: Start Agent with Hardware

```bash
# Enable hardware mode
export REACHY_MOCKED=false
export REACHY_AUDIO_ENABLED=true

# Start the agent
./start.sh
```

#### Step 4: Verify Hardware Connection

```bash
# Check agent health
curl http://localhost:9001/v1/agent/health

# Should show:
# {
#   "status": "healthy",
#   "sensors_ok": true,
#   "actuators_ok": true,
#   ...
# }
```

### Using the Start Script

The `start.sh` script automatically:
- Activates the virtual environment
- Sets `PYTHONPATH` to include the common framework
- Verifies the common framework exists
- Checks and frees port 9001 if needed
- Starts uvicorn with proper configuration

**Manual Start** (if needed):

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate

# Set PYTHONPATH
export PYTHONPATH="$(cd ../common && pwd):$PYTHONPATH"

# Start uvicorn
python run.py
# Or directly:
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

### Testing the Agent

#### Basic API Tests

```bash
# 1. Get agent info (should show robot_type: "reachy")
curl http://localhost:9001/v1/agent/info

# Expected response:
# {
#   "robot_id": "reachy-001",
#   "robot_type": "reachy",
#   "capabilities": ["devops_copilot", "gestures", "openai_compatible_inference"],
#   "version": "0.1.0",
#   "backend_default": "aim"
# }

# 2. Check health
curl http://localhost:9001/v1/agent/health

# 3. Submit DevOps copilot task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean and why should I care?"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    },
    "policy": {
      "e2e_slo_ms": 2500,
      "timeout_ms": 2200
    }
  }'

# Save the task_id from the response, then:

# 4. Get task status
curl http://localhost:9001/v1/tasks/{task_id}

# 5. Stream events (real-time updates)
curl -N http://localhost:9001/v1/events
```

#### Testing with Real Hardware

When hardware is connected, you should observe:

1. **ACK Gesture** - Quick nod when task is acknowledged
2. **THINKING Gesture** - Side-to-side head movement during inference
3. **DONE Gesture** - Nod up when task completes successfully
4. **Audio Playback** - AI response spoken through robot speaker (if enabled)

#### Running the Test Suite

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py -v

# Run specific test
pytest tests/test_api.py::TestAgentInfo::test_get_agent_info -v
```

**Test Coverage**: The test suite includes:
- API endpoint tests
- Task execution tests
- Gesture controller tests
- Backend client tests
- Driver connection tests

## Demo Scenarios

Three pre-canned prompts for testing:

1. **"Summarize the last production deployment"**
2. **"What does p95 latency mean and why should I care?"**
3. **"Give a 5-step incident triage checklist for CrashLoopBackOff"**

Example request:

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean and why should I care?"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

Watch the robot perform gestures and hear the AI response!

## Hardware Support

### Mocked Mode (Default)

The agent runs in **mocked mode by default**, simulating gestures without hardware. Perfect for:
- Development and testing
- CI/CD pipelines
- Demonstrations without hardware
- Testing API functionality

In mocked mode:
- Gestures are logged but not executed
- Audio is disabled
- All API endpoints work normally
- Tasks execute successfully

### Real Hardware Setup

#### Prerequisites

1. **Reachy Mini Robot**
   - Reachy Mini (Wireless) or Reachy Mini Lite
   - Properly assembled and powered on
   - Firmware up to date

2. **Connection Type**
   - **Lite**: USB cable connected
   - **Wireless**: Robot on same network as agent

3. **Reachy Mini SDK**
   ```bash
   pip install reachy_mini>=1.2.0
   ```

4. **Reachy Mini Daemon** (usually auto-started by robot)
   - Daemon runs on port 7447 (Zenoh)
   - Dashboard on port 8000 (or 8001 if port conflict)
   - Check with: `./check_robot_service.sh`

#### Step-by-Step Hardware Setup

**Step 1: Install SDK**

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
pip install reachy_mini>=1.2.0
```

**Step 2: Verify Robot Connection**

```bash
# Test connection script
python test_connection.py
```

**Step 3: Start Reachy Mini Daemon** (if needed)

```bash
# Check if daemon is running
./check_robot_service.sh

# If not running, start it
./start_daemon_fixed.sh
```

**Step 4: Enable Hardware Mode**

```bash
export REACHY_MOCKED=false
export REACHY_AUDIO_ENABLED=true  # Optional: enable audio
./start.sh
```

**Step 5: Verify Hardware Connection**

```bash
# Check health endpoint
curl http://localhost:9001/v1/agent/health

# Should show sensors_ok: true and actuators_ok: true
```

#### Gestures with Real Hardware

The agent implements the following gestures:

1. **ACK Gesture** - Quick nod (head down then up) when task acknowledged
2. **THINKING Gesture** - Slow side-to-side head movement during inference
3. **DONE Gesture** - Nod up when task completes successfully
4. **ERROR Gesture** - Shake head side to side on errors
5. **REST Gesture** - Return to neutral position

#### Audio/Text-to-Speech Setup

The agent can speak AI responses through the robot's speaker:

**Prerequisites:**
- Real hardware connected (`REACHY_MOCKED=false`)
- Audio enabled (`REACHY_AUDIO_ENABLED=true`)
- ALSA configured (Linux) with `reachymini_audio_sink` device

**Verify Audio Setup:**

```bash
# Check ALSA devices
aplay -l

# Test audio generation
python test_audio_generation.py

# Test robot audio playback
python test_robot_audio.py
```

**Audio Configuration:**

The agent uses `edge-tts` for high-quality text-to-speech:
- Converts text to MP3
- Converts MP3 to WAV (16kHz, stereo) for robot compatibility
- Plays through ALSA device `reachymini_audio_sink`

**Troubleshooting Audio:**

- Check ALSA device: `aplay -D reachymini_audio_sink test.wav`
- Verify robot media: `robot.media.audio` should be accessible
- Check logs for audio errors
- See `AUDIO_TROUBLESHOOTING.md` for detailed help

## Troubleshooting

### Common Issues

#### 1. Import Errors / Module Not Found

**Error**: `ModuleNotFoundError: No module named 'pydantic'` or similar

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Verify PYTHONPATH (start script handles this)
./start.sh
```

#### 2. Common Framework Not Found

**Error**: `ImportError: Failed to import common framework modules`

**Solution**:
```bash
# Verify common framework exists
ls ../common/app/

# Check PYTHONPATH includes common framework
export PYTHONPATH="$(cd ../common && pwd):$PYTHONPATH"
echo $PYTHONPATH

# Use start script (handles this automatically)
./start.sh
```

#### 3. Reachy Mini Connection Failed

**Error**: `ZError: Unable to connect to any of [tcp/localhost:7447]`

**Solutions**:

1. **Check robot is powered on** - Wait 30 seconds after power on
2. **Check USB connection** (Lite) - Try reconnecting USB cable
3. **Check network** (Wireless) - Ensure robot is on same network
4. **Check daemon is running**:
   ```bash
   ./check_robot_service.sh
   # Or manually:
   nc -zv localhost 7447
   ```
5. **Start daemon if needed**:
   ```bash
   ./start_daemon_fixed.sh
   ```
6. **Test connection directly**:
   ```bash
   python test_connection.py
   ```

**Fallback**: Agent automatically falls back to mocked mode if connection fails.

#### 4. Port Already in Use

**Error**: `ERROR: [Errno 98] address already in use`

**Solution**:
```bash
# Check what's using port 9001
lsof -i :9001

# Kill the process (start script does this automatically)
lsof -ti :9001 | xargs kill

# Or use start script (handles this automatically)
./start.sh
```

#### 5. Audio Not Playing

**Symptoms**: No sound from robot speaker

**Solutions**:

1. **Check audio is enabled**:
   ```bash
   export REACHY_AUDIO_ENABLED=true
   ```

2. **Check hardware is connected**:
   ```bash
   export REACHY_MOCKED=false
   curl http://localhost:9001/v1/agent/health
   ```

3. **Test audio generation**:
   ```bash
   python test_audio_generation.py
   ```

4. **Test robot audio**:
   ```bash
   python test_robot_audio.py
   ```

5. **Check ALSA device**:
   ```bash
   aplay -l
   aplay -D reachymini_audio_sink test.wav
   ```

6. **Check logs** for audio errors:
   ```bash
   # Look for audio-related log messages
   grep -i audio logs/*.log
   ```

See `AUDIO_TROUBLESHOOTING.md` for detailed audio troubleshooting.

#### 6. AIM Backend 404 Error

**Error**: `Client error '404 Not Found' for url 'http://localhost:8000/chat/completions'`

**Solution**:
- Ensure AIM backend is running
- Check base_url includes `/v1` prefix: `http://localhost:8000/v1`
- Verify AIM endpoint is accessible:
  ```bash
  curl http://localhost:8000/v1/chat/completions
  ```

#### 7. Tasks Stuck in "acknowledged" State

**Symptoms**: Task created but never executes

**Solution**:
- Check background tasks are running (logs should show "Background task started")
- Verify AIM backend is accessible
- Check logs for errors in task execution
- Ensure agent is not in mocked mode if hardware is required

### Diagnostic Scripts

The agent includes several diagnostic scripts:

```bash
# Test Reachy Mini connection
python test_connection.py

# Check robot service status
./check_robot_service.sh

# Test audio generation
python test_audio_generation.py

# Test robot audio playback
python test_robot_audio.py

# Start Reachy Mini daemon
./start_daemon_fixed.sh
```

### Getting Help

1. **Check Logs**: Look for structured JSON logs with error details
2. **Review Documentation**:
   - `TROUBLESHOOTING.md` - General troubleshooting
   - `HARDWARE_SETUP.md` - Hardware setup guide
   - `AUDIO_TROUBLESHOOTING.md` - Audio-specific issues
   - `CONNECTION_RETRY.md` - Connection retry logic
3. **Run Tests**: `pytest tests/ -v` to verify installation
4. **Check Health**: `curl http://localhost:9001/v1/agent/health`

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

### Running Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py -v

# Run specific test
pytest tests/test_api.py::TestAgentInfo::test_get_agent_info -v
```

### Test Coverage

The test suite includes:
- ✅ API endpoint tests (`test_api.py`)
- ✅ Task execution tests (`test_tasks.py`)
- ✅ Gesture controller tests (`test_gestures.py`)
- ✅ Backend client tests (`test_backend_client.py`)
- ✅ Driver connection tests (`test_driver.py`)

**Current Coverage**: ~80% (exceeds 40% requirement)

### Test Requirements

- Python 3.10+
- Virtual environment activated
- Dependencies installed (`pip install -r requirements.txt`)
- Common framework accessible

**Note**: Some tests require mocked hardware. Real hardware tests are optional.

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

### Completed ✅

- ✅ Basic agent structure and API
- ✅ DevOps copilot task handler
- ✅ Real hardware integration with Reachy Mini SDK
- ✅ Gesture control (mocked and real hardware)
- ✅ Text-to-speech audio playback
- ✅ Connection retry logic with cooldown
- ✅ Comprehensive test suite
- ✅ Error handling and graceful degradation

### Future Enhancements

- [ ] Add more task types (beyond DevOps copilot)
- [ ] Gesture customization via API
- [ ] Arm movement gestures (currently head-only)
- [ ] Camera integration for visual feedback
- [ ] Multi-robot support
- [ ] Advanced audio features (voice selection, speed control)
- [ ] WebSocket support for real-time control
- [ ] Performance optimizations

## Documentation

- [Common Framework](../common/README.md)
- [Fleet Architecture](../../docs/fleet/fleet-architecture.md)
- [Implementation Plan](../../FLEET_IMPLEMENTATION_PLAN.md)

