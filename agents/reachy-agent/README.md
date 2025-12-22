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

## Quick Start

### Installation

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run (Mocked Mode)

```bash
./start.sh
```

### Test

```bash
# Check agent info
curl http://localhost:9001/v1/agent/info

# Submit a task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "What does p95 latency mean?"},
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

## Prerequisites

- **Python**: 3.10+
- **OS**: Linux (Ubuntu 20.04+) or macOS
- **Common Framework**: Available in `../common/` directory
- **AIM Backend**: Configured endpoint (or mock server)

**For Real Hardware** (optional):
- Reachy Mini robot (Wireless or Lite)
- USB connection (Lite) or network access (Wireless)
- ALSA installed (Linux): `sudo apt-get install alsa-utils alsa-base`
- USB permissions (Lite): `sudo usermod -a -G dialout $USER`

## Configuration

Set environment variables or create `.env` file:

```bash
# Hardware
REACHY_MOCKED=true              # Set to "false" for real hardware
REACHY_AUDIO_ENABLED=true        # Enable text-to-speech
REACHY_USE_ALSA_DIRECT=true     # Use ALSA directly (Linux)

# AIM Backend
AIM_BASE_URL_DEFAULT=http://localhost:8000
AIM_API_KEY_DEFAULT=sk-your-api-key

# Server
PORT=9001
LOG_LEVEL=INFO
```

## Running

### Mocked Mode (Default)

```bash
./start.sh
```

The agent runs in mocked mode by default - gestures are logged but not executed.

### Real Hardware

1. **Install SDK** (if not already installed):
   ```bash
   pip install reachy_mini>=1.2.0
   ```

2. **Test connection**:
   ```bash
   python test_connection.py
   ```

3. **Start daemon** (if needed):
   ```bash
   ./check_robot_service.sh  # Check if running
   ./start_daemon_fixed.sh   # Start if not running
   ```

4. **Enable hardware mode**:
   ```bash
   export REACHY_MOCKED=false
   export REACHY_AUDIO_ENABLED=true
   ./start.sh
   ```

5. **Verify connection**:
   ```bash
   curl http://localhost:9001/v1/agent/health
   # Should show sensors_ok: true and actuators_ok: true
   ```

## Hardware Features

### Gestures

When hardware is connected, the robot performs:
- **ACK** - Quick nod when task acknowledged
- **THINKING** - Side-to-side head movement during inference
- **DONE** - Nod up when task completes
- **ERROR** - Shake head on errors
- **REST** - Return to neutral position

### Audio/Text-to-Speech

The agent speaks AI responses through the robot's speaker using `edge-tts`:
- Converts text to MP3, then WAV (16kHz, stereo)
- Plays through ALSA device `reachymini_audio_sink`

**Test audio**:
```bash
python test_audio_generation.py  # Test TTS generation
python test_robot_audio.py        # Test robot playback
```

## API Endpoints

- `GET /v1/agent/info` - Agent info with capabilities
- `GET /v1/agent/health` - Health status with driver checks
- `POST /v1/tasks` - Submit DevOps copilot task
- `GET /v1/tasks/{task_id}` - Task status
- `GET /v1/metrics` - Prometheus metrics
- `GET /v1/events` - SSE event stream

## Testing

```bash
# Run test suite
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

**Test Coverage**: ~80% (API, tasks, gestures, backend client, driver)

## Troubleshooting

### Common Issues

**Import Errors**: Ensure virtual environment is activated and dependencies installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Common Framework Not Found**: Use `./start.sh` (handles PYTHONPATH automatically)

**Reachy Connection Failed** (`ZError: Unable to connect to [tcp/localhost:7447]`):
- Check robot is powered on (wait 30 seconds after power on)
- Check USB connection (Lite) or network (Wireless)
- Verify daemon is running: `./check_robot_service.sh`
- Start daemon if needed: `./start_daemon_fixed.sh`
- Test connection: `python test_connection.py`
- **Fallback**: Agent automatically falls back to mocked mode

**Port Already in Use**: `./start.sh` handles this automatically

**Audio Not Playing**:
- Verify `REACHY_MOCKED=false` and `REACHY_AUDIO_ENABLED=true`
- Check hardware connection: `curl http://localhost:9001/v1/agent/health`
- Test audio: `python test_robot_audio.py`
- Check ALSA: `aplay -D reachymini_audio_sink test.wav`

**AIM Backend 404**: Ensure base_url includes `/v1` prefix: `http://localhost:8000/v1`

### Diagnostic Scripts

```bash
python test_connection.py        # Test robot connection
./check_robot_service.sh          # Check daemon status
python test_audio_generation.py   # Test TTS
python test_robot_audio.py       # Test audio playback
./start_daemon_fixed.sh           # Start daemon
```

### Additional Documentation

See the [`docs/`](docs/) directory for detailed guides:
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) - Detailed troubleshooting guide
- [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md) - Hardware setup guide
- [`docs/AUDIO_TROUBLESHOOTING.md`](docs/AUDIO_TROUBLESHOOTING.md) - Audio-specific issues
- [`docs/CONNECTION_RETRY.md`](docs/CONNECTION_RETRY.md) - Connection retry logic

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

## Task Flow

1. Task Submitted → `task_created` event
2. Acknowledged → ACK gesture
3. Inference Started → THINKING gesture
4. AIM Backend Called → OpenAI-compatible API
5. Inference Done → DONE gesture + audio playback
6. Task Completed → `task_done` event with metrics

## Next Steps

**Completed**: ✅ Basic agent, DevOps copilot, hardware integration, gestures, audio, tests

**Future**: More task types, gesture customization, arm movements, camera integration, multi-robot support

## Documentation

- [Common Framework](../common/README.md)
- [Fleet Architecture](../../docs/fleet/fleet-architecture.md)
