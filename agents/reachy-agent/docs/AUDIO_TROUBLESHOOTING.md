# Audio Troubleshooting Guide

## Issue: Nothing Plays on Speaker

If audio is not playing, follow these steps:

### Step 1: Check Logs

Look for audio-related log messages:

```bash
# Check agent logs for:
# - "Audio: Starting text-to-speech conversion"
# - "Audio: Generated audio file"
# - "Audio: Playing sound through robot speaker"
# - Any error messages
```

### Step 2: Verify TTS Library Installed

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
pip show edge-tts
# or
pip show gtts
```

If not installed:
```bash
pip install edge-tts
```

### Step 3: Check Robot Connection

```bash
curl http://localhost:9001/v1/agent/health
# Should show sensors_ok: true if connected
```

### Step 4: Check Audio Enabled

```bash
echo $REACHY_AUDIO_ENABLED
# Should be empty or "true"
```

### Step 5: Test Audio Generation

Test if TTS is working:

```python
import asyncio
import edge_tts
import tempfile
import os

async def test_tts():
    text = "Hello, this is a test"
    audio_file = os.path.join(tempfile.gettempdir(), "test.mp3")
    
    communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
    await communicate.save(audio_file)
    
    if os.path.exists(audio_file):
        print(f"✅ Audio file generated: {audio_file}")
        print(f"   Size: {os.path.getsize(audio_file)} bytes")
    else:
        print("❌ Audio file not generated")

asyncio.run(test_tts())
```

### Step 6: Test Robot Media

Test if robot's media.play_sound works:

```python
from reachy_mini import ReachyMini

with ReachyMini() as robot:
    # Check if media is available
    if hasattr(robot, 'media'):
        print("✅ Robot has media attribute")
        if hasattr(robot.media, 'play_sound'):
            print("✅ Robot media has play_sound method")
            # Try playing a test file (if you have one)
            # robot.media.play_sound("test.wav")
        else:
            print("❌ Robot media does not have play_sound")
    else:
        print("❌ Robot does not have media attribute")
```

### Step 7: Check Audio File Format

The Reachy Mini SDK expects:
- **WAV files** (preferred for SoundDevice backend)
- **MP3 files** (should work with GStreamer backend)

If using edge-tts (generates MP3), you may need to convert to WAV:

```python
# Convert MP3 to WAV
from pydub import AudioSegment

audio = AudioSegment.from_mp3("speech.mp3")
audio.export("speech.wav", format="wav")
```

### Step 8: Check Audio Backend

The Reachy Mini uses different audio backends:
- **SoundDevice** (default for Lite) - expects WAV files
- **GStreamer** (for Wireless) - supports MP3

Check which backend is being used in the daemon logs.

## Common Issues

### Issue 1: Audio File Not Generated

**Symptoms:**
- Log shows "Failed to generate audio from text"
- No audio file created

**Solutions:**
1. Install TTS library: `pip install edge-tts`
2. Check internet connection (for gTTS)
3. Check disk space for temp directory

### Issue 2: Robot Media Not Available

**Symptoms:**
- Log shows "Robot media not available"
- `hasattr(robot, 'media')` returns False

**Solutions:**
1. Ensure robot is connected: `reachy_driver.is_connected()`
2. Check daemon is running: `pgrep -f reachy-mini-daemon`
3. Restart daemon if needed

### Issue 3: Audio File Format Not Supported

**Symptoms:**
- Audio file generated but doesn't play
- Error about file format

**Solutions:**
1. Convert MP3 to WAV (if using SoundDevice backend)
2. Install pydub: `pip install pydub`
3. Update audio.py to convert format

### Issue 4: No Sound Output

**Symptoms:**
- Everything seems to work but no sound

**Solutions:**
1. Check robot's speaker is working
2. Check volume settings
3. Test with a known WAV file:
   ```python
   robot.media.play_sound("wake_up.wav")  # Built-in sound
   ```

## Debug Mode

Enable detailed logging:

```python
# In app/audio.py, add more logging
logger.setLevel("DEBUG")
```

Or check agent logs for detailed error messages.

## Quick Test

Run this to test the full audio pipeline:

```python
import asyncio
from app.audio import AudioController
from reachy_mini import ReachyMini

async def test():
    robot = ReachyMini()
    controller = AudioController(robot=robot)
    await controller.speak("Hello, this is a test")
    robot.__exit__(None, None, None)

asyncio.run(test())
```

## Still Not Working?

1. **Check daemon logs** - Look for audio-related errors
2. **Check agent logs** - Look for audio playback errors
3. **Test with built-in sounds** - Try `robot.media.play_sound("wake_up.wav")`
4. **Check audio backend** - Verify which backend is being used

