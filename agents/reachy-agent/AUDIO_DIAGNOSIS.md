# Audio Diagnosis Guide

## Issue: Robot Doesn't Speak After Task Completion

You've confirmed:
- ✅ Response is correct (task completes successfully)
- ✅ Robot hardware works (`test_robot_audio.py` works)
- ❌ Robot doesn't speak the response

## Enhanced Logging Added

I've added detailed logging to help diagnose the issue. When you submit a task, look for these log messages:

### 1. Audio Configuration Check
```
{"message": "Audio check", "audio_enabled": true, "response_content_length": <number>, ...}
```
- **If `audio_enabled` is false**: Set `REACHY_AUDIO_ENABLED=true`
- **If `response_content_length` is 0**: Response content is empty (check AIM response format)

### 2. Robot Connection Status
```
{"message": "Audio: Robot connected, audio enabled", "has_media": true, ...}
```
- **If you see this**: Robot is connected and ready
- **If you see "Audio: Robot not connected"**: Robot connection failed
- **If you see "Audio: Hardware mocked"**: `REACHY_MOCKED=false` not set

### 3. Before Speaking
```
{"message": "Audio: Robot and media available, speaking...", ...}
```
- **If you see this**: Robot is ready to speak
- **If you see "Audio: Robot or media not available"**: Robot instance not set correctly

### 4. During Speaking
```
{"message": "Audio: Starting text-to-speech conversion", "text_length": <number>, ...}
{"message": "Audio: Generated audio file", "file": "/tmp/...", ...}
{"message": "Using ALSA directly for audio playback", "device": "reachymini_audio_sink", ...}
{"message": "Audio: Successfully played via ALSA", ...}
```
- **If you see all of these**: Audio should have played
- **If you see "Audio: Speaking (mocked)"**: Audio controller thinks it's mocked

### 5. After Speaking
```
{"message": "Audio: Speak completed", "success": true, ...}
```
- **If `success` is false**: Audio playback failed (check earlier logs for error)

## What to Do Next

1. **Restart the agent** with enhanced logging:
   ```bash
   cd ~/Desktop/Multiverse/agents/reachy-agent
   source venv/bin/activate
   export REACHY_MOCKED=false
   export REACHY_AUDIO_ENABLED=true
   ./start.sh
   ```

2. **Submit a task**:
   ```bash
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
   ```

3. **Check the agent logs** for the messages above

4. **Share the relevant log lines** so we can identify the issue

## Most Likely Issues

Based on the code, here are the most likely causes:

### Issue 1: Robot Not Connected When Audio is Called
**Symptom**: Logs show "Audio: Robot not connected, using mocked mode"
**Fix**: Ensure daemon is running and robot is powered on

### Issue 2: Response Content is Empty
**Symptom**: Logs show `response_content_length: 0`
**Fix**: Check AIM response format matches OpenAI format (`choices[0].message.content`)

### Issue 3: Audio Controller Thinks It's Mocked
**Symptom**: Logs show "Audio: Speaking (mocked)"
**Fix**: Ensure `audio_controller.is_mocked = False` is set after robot connects

### Issue 4: ALSA Device Not Found
**Symptom**: Logs show ALSA playback failed
**Fix**: Check `.asoundrc` exists and `reachymini_audio_sink` is defined

## Quick Test

Run this to verify everything works:

```bash
# Test 1: Direct audio test (you confirmed this works)
python test_robot_audio.py

# Test 2: Check audio controller integration
python test_audio_integration.py

# Test 3: Submit task and check logs
curl -X POST http://localhost:9001/v1/tasks ... (as above)
# Then check agent logs for audio messages
```

## Summary

The enhanced logging will help us identify exactly where the audio pipeline is failing. Please:
1. Restart the agent
2. Submit a task
3. Share the log messages related to audio

This will help us pinpoint the issue and fix it!

