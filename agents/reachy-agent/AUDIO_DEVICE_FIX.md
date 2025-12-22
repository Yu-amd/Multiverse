# Fix Audio Device Routing

## Problem

Audio is playing from your **monitor** instead of the **Reachy Mini speaker** because:
- SoundDevice backend shows Reachy Mini Audio device has 0 output channels
- SDK falls back to default device (monitor)
- Audio format mismatch (mono vs stereo expected by ALSA)

## Solution

### Option 1: Use ALSA Direct (Recommended)

Force the agent to use ALSA directly, which properly routes to the robot's speaker:

```bash
export REACHY_USE_ALSA_DIRECT=true
export REACHY_MOCKED=false
./start.sh
```

This uses `aplay -D reachymini_audio_sink` directly, bypassing the SoundDevice backend.

### Option 2: Fix Audio Format

The code now automatically:
- ✅ Converts mono to stereo (ALSA config expects 2 channels)
- ✅ Resamples to 16kHz (matches ALSA config)
- ✅ Uses WAV format (preferred by SoundDevice)

### Option 3: Check Audio Backend

The SDK might be using SoundDevice when it should use GStreamer. Check which backend is active:

```python
from reachy_mini import ReachyMini
robot = ReachyMini()
print(robot.media.audio.__class__.__name__)
# Should show: GStreamerAudio or SoundDeviceAudio
```

GStreamer backend uses ALSA device names directly and should work better.

## Testing

### Test ALSA Direct Playback

```bash
# Generate test audio
python test_audio_generation.py

# Test ALSA playback
aplay -D reachymini_audio_sink /tmp/test_audio.wav
# Should play from robot speaker
```

### Test with Agent

```bash
# Enable ALSA direct mode
export REACHY_USE_ALSA_DIRECT=true
export REACHY_MOCKED=false
./start.sh

# Submit a task - audio should come from robot speaker
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "Hello"},
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

## What Changed

1. **Audio format conversion:**
   - Mono → Stereo (2 channels)
   - Any sample rate → 16kHz
   - MP3 → WAV

2. **ALSA direct mode:**
   - Bypasses SoundDevice backend
   - Uses `aplay -D reachymini_audio_sink` directly
   - Ensures correct device routing

3. **Better error handling:**
   - Falls back to SDK method if ALSA fails
   - Detailed logging for debugging

## Summary

**Quick fix:** Set `REACHY_USE_ALSA_DIRECT=true` to force audio to robot speaker!

The audio format is now automatically converted to match ALSA requirements (stereo, 16kHz, WAV).

