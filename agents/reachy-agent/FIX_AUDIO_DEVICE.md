# Fix Audio Device Issue

## Problem

Audio is playing from your **monitor** instead of the **Reachy Mini speaker** because:
- Reachy Mini Audio device shows **0 output channels**
- SDK falls back to default device (monitor)
- Audio device needs proper ALSA configuration

## Solution

The Reachy Mini SDK expects an ALSA configuration file (`~/.asoundrc`) that maps the USB audio device to a named device.

### Step 1: Check Current Audio Devices

```bash
aplay -l | grep -i reachy
```

### Step 2: Create ALSA Configuration

The SDK should auto-create this, but if it's missing, create `~/.asoundrc`:

```bash
cat > ~/.asoundrc << 'EOF'
pcm.reachymini_audio_sink {
    type plug
    slave {
        pcm "hw:4,0"  # Adjust based on your aplay -l output
        rate 48000
        channels 2
    }
}

pcm.reachymini_audio_src {
    type plug
    slave {
        pcm "hw:4,0"
        rate 48000
        channels 2
    }
}
EOF
```

**Important:** Replace `hw:4,0` with the correct device from `aplay -l` output.

### Step 3: Test Audio Device

```bash
# Test if device works
aplay -D reachymini_audio_sink /tmp/test_audio.wav
```

### Step 4: Verify SDK Detection

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
python test_audio_device.py
```

Should show Reachy Mini Audio device with output channels > 0.

## Alternative: Use System Audio Routing

If ALSA configuration doesn't work, you can:

1. **Set system default to Reachy Mini:**
   ```bash
   # Use pavucontrol or similar to set default output
   pavucontrol
   # Or use pactl
   pactl set-default-sink <reachy-device-name>
   ```

2. **Force device in code:**
   - Modify audio.py to explicitly set the device
   - Use device ID 7 (from your system)

## Quick Test

After fixing, test with:

```bash
python test_robot_audio.py
```

Audio should now come from the robot's speaker!

