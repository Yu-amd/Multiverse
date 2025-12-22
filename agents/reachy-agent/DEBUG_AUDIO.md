# Debugging Audio Not Speaking

## Issue
The agent returns a correct response, but the robot doesn't speak.

## What to Check

### 1. Check Agent Logs

Look for these log messages when you submit a task:

**Expected logs:**
```
{"message": "Audio: Robot connected, audio enabled", "has_media": true, ...}
{"message": "Audio: Robot and media available, speaking...", ...}
{"message": "Audio: Starting text-to-speech conversion", "text_length": <number>, ...}
{"message": "Audio: Generated audio file", "file": "/tmp/...", ...}
{"message": "Using ALSA directly for audio playback", "device": "reachymini_audio_sink", ...}
{"message": "Audio: Successfully played via ALSA", ...}
```

**If you see these instead:**
```
{"message": "Audio: Hardware mocked, using mocked audio", ...}
```
→ Robot is in mocked mode. Set `REACHY_MOCKED=false`

```
{"message": "Audio: Robot not connected, using mocked mode", ...}
```
→ Robot connection failed. Check daemon is running.

```
{"message": "Audio: Robot instance is None", ...}
```
→ Robot instance not available. Check driver connection.

```
{"message": "Audio: Speaking (mocked)", ...}
```
→ Audio controller thinks robot is mocked. Check `is_mocked` flag.

### 2. Check Environment Variables

When starting the agent, ensure:

```bash
export REACHY_MOCKED=false
export REACHY_AUDIO_ENABLED=true
export REACHY_USE_ALSA_DIRECT=true  # Default, but explicit is better
./start.sh
```

### 3. Verify Robot Connection

```bash
# Check if daemon is running
pgrep -f reachy-mini-daemon

# Check agent health
curl http://localhost:9001/v1/agent/health

# Should show:
# {"status": "healthy", "sensors_ok": true, ...}
```

### 4. Test Audio Directly

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
python test_robot_audio.py
```

If this works but agent doesn't speak, the issue is in the integration.

### 5. Check Response Content

The agent extracts `response_content` from the AIM response. Check logs for:

```
{"message": "Chat completion successful", "content": "...", ...}
```

If `response_content` is empty, nothing will be spoken.

### 6. Common Issues

**Issue: Robot not connected when audio is called**
- **Fix**: The code tries to connect, but if it fails, audio falls back to mocked mode
- **Check**: Look for "Audio: Robot not connected" in logs

**Issue: Audio controller thinks it's mocked**
- **Fix**: Ensure `audio_controller.is_mocked = False` is set after robot connects
- **Check**: Look for "Audio: Speaking (mocked)" in logs

**Issue: ALSA device not found**
- **Fix**: Check `.asoundrc` exists and `reachymini_audio_sink` is defined
- **Check**: Run `aplay -D reachymini_audio_sink /tmp/test.wav` manually

**Issue: Response content is empty**
- **Fix**: Check AIM response format matches expected structure
- **Check**: Look at `result["content"]` in logs

## Quick Test

Run this to test the full integration:

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate

# Make sure daemon is running
pgrep -f reachy-mini-daemon || ./start_daemon_fixed.sh

# Start agent with hardware enabled
export REACHY_MOCKED=false
export REACHY_AUDIO_ENABLED=true
./start.sh

# In another terminal, submit a task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "Say hello"},
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'

# Watch the agent logs for audio messages
```

## Next Steps

1. **Check the agent logs** when you submit a task
2. **Look for the log messages** listed above
3. **Share the relevant log lines** so we can diagnose the issue

The most likely issues are:
- Robot not connected when audio is called
- `response_content` is empty
- Audio controller thinks it's mocked
- ALSA device routing issue

