# Audio/Text-to-Speech Feature

## Overview

The Reachy agent now supports **text-to-speech** - AI responses are automatically converted to speech and played through the Reachy Mini's built-in 5W speaker!

## Features

✅ **Automatic TTS** - AI responses are spoken automatically
✅ **High Quality** - Uses edge-tts (Microsoft's neural voices)
✅ **Free** - No API keys required
✅ **Fallback Support** - Falls back to gTTS if edge-tts unavailable
✅ **Mocked Mode** - Works in mocked mode (logs audio, no actual playback)

## Installation

### Step 1: Install TTS Library

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
pip install edge-tts
```

**Alternative (if edge-tts doesn't work):**
```bash
pip install gtts
```

### Step 2: Enable Audio (Default: Enabled)

Audio is enabled by default. To disable:

```bash
export REACHY_AUDIO_ENABLED=false
./start.sh
```

## Usage

### Basic Usage

Just submit a task as normal - audio will play automatically:

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "What is p95 latency?"},
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

**What happens:**
1. Robot performs ACK gesture
2. Robot performs THINKING gesture
3. AI generates response
4. Robot performs DONE gesture
5. **Robot speaks the response through speaker!** 🎤

### Disable Audio

If you want to disable audio for a session:

```bash
export REACHY_AUDIO_ENABLED=false
./start.sh
```

## How It Works

### 1. Text-to-Speech Conversion

The agent uses **edge-tts** (preferred) or **gTTS** (fallback) to convert text to audio:

- **edge-tts**: Microsoft's neural TTS, high quality, free, no API key
- **gTTS**: Google TTS, requires internet, free

### 2. Audio Playback

The generated audio is played through Reachy Mini's speaker using:

```python
robot.media.play_sound(audio_file)
```

### 3. Temporary Files

Audio files are temporarily stored and automatically cleaned up after playback.

## Configuration

### Environment Variables

- `REACHY_AUDIO_ENABLED` - Enable/disable audio (default: `true`)
  - Set to `false`, `0`, `no`, or `off` to disable

### TTS Library Selection

The agent automatically tries:
1. **edge-tts** (preferred) - Better quality, no internet required
2. **gTTS** (fallback) - Requires internet connection

## Voice Selection

### edge-tts Voices

Default voice: `en-US-AriaNeural` (female, natural)

To change the voice, edit `app/audio.py`:

```python
# Change voice
communicate = edge_tts.Communicate(text, "en-US-GuyNeural")  # Male voice
# or
communicate = edge-tts.Communicate(text, "en-GB-SoniaNeural")  # British accent
```

Available voices:
- `en-US-AriaNeural` (female, default)
- `en-US-GuyNeural` (male)
- `en-GB-SoniaNeural` (British female)
- Many more - see edge-tts documentation

### List Available Voices

```python
import edge_tts
voices = edge_tts.list_voices()
for voice in voices:
    if "en" in voice["Locale"]:
        print(voice["Name"], voice["Locale"])
```

## Troubleshooting

### Audio Not Playing

1. **Check robot is connected:**
   ```bash
   curl http://localhost:9001/v1/agent/health
   # Should show sensors_ok: true
   ```

2. **Check TTS library installed:**
   ```bash
   pip show edge-tts
   # or
   pip show gtts
   ```

3. **Check audio enabled:**
   ```bash
   echo $REACHY_AUDIO_ENABLED
   # Should be empty or "true"
   ```

4. **Check logs:**
   - Look for "Audio: Spoke text" messages
   - Check for TTS errors

### TTS Library Not Found

```bash
# Install edge-tts (preferred)
pip install edge-tts

# Or install gTTS (alternative)
pip install gtts
```

### Audio Quality Issues

1. **Try different voice:**
   - Edit `app/audio.py` to use different edge-tts voice
   - Some voices are clearer than others

2. **Check robot's speaker:**
   - Ensure speaker is working
   - Check volume settings

### Audio Too Fast/Slow

The speaking speed is controlled by the TTS engine. To adjust:

1. **edge-tts**: Voice selection affects speed
2. **gTTS**: Use `slow=True` parameter:
   ```python
   tts = gTTS(text=text, lang='en', slow=True)
   ```

## Advanced Usage

### Custom Audio Processing

You can customize audio processing in `app/audio.py`:

```python
async def speak(self, text: str) -> bool:
    # Add custom text processing
    processed_text = self._process_text(text)
    
    # Generate audio
    audio_file = await self._text_to_speech(processed_text)
    
    # Add custom audio processing
    processed_audio = self._process_audio(audio_file)
    
    # Play
    self.robot.media.play_sound(processed_audio)
```

### Multiple Languages

Support multiple languages by detecting language and selecting appropriate voice:

```python
# Detect language
language = detect_language(text)

# Select voice based on language
if language == "en":
    voice = "en-US-AriaNeural"
elif language == "fr":
    voice = "fr-FR-DeniseNeural"
# etc.
```

## Summary

✅ **Audio feature is ready to use!**

Just:
1. Install TTS library: `pip install edge-tts`
2. Start agent: `./start.sh`
3. Submit tasks - responses will be spoken automatically!

The robot will now:
- ✅ Perform gestures
- ✅ Generate AI responses
- ✅ **Speak responses through speaker** 🎤

Enjoy your talking robot! 🤖🔊

