# Reachy Mini Hardware Setup Guide

## Overview

This guide explains how to connect and use a real Reachy Mini robot with the Multiverse agent.

**Reference:** [Reachy Mini SDK on GitHub](https://github.com/pollen-robotics/reachy_mini)

## Prerequisites

1. **Reachy Mini Hardware**
   - Reachy Mini (Wireless) or Reachy Mini Lite
   - Properly assembled and powered on
   - Connected via USB (Lite) or accessible via network (Wireless)

2. **Python Environment**
   - Python 3.10+
   - Virtual environment activated

## Installation

### Step 1: Install Reachy Mini SDK

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
pip install reachy_mini
```

**Note:** The SDK is available on PyPI. For the latest version, you can also install from GitHub:

```bash
pip install git+https://github.com/pollen-robotics/reachy_mini.git
```

### Step 2: Verify Installation

```bash
python -c "from reachy_mini import ReachyMini; print('SDK installed successfully')"
```

### Step 3: Test Connection

Before enabling hardware mode in the agent, test the connection:

```python
from reachy_mini import ReachyMini
from reachy_mini.utils import create_head_pose

with ReachyMini() as mini:
    # Test head movement
    mini.goto_target(
        head=create_head_pose(z=10, roll=0, degrees=True, mm=True),
        duration=1.0
    )
    print("Connection successful!")
```

## Enabling Hardware Mode

### Option 1: Environment Variable (Recommended)

```bash
export REACHY_MOCKED=false
./start.sh
```

### Option 2: Update Code Directly

Edit `app/main.py` line ~211:

```python
# Change from:
reachy_driver = ReachyDriver(mocked=True)

# To:
reachy_driver = ReachyDriver(mocked=False)
```

## Connection Types

### Reachy Mini Lite (USB)

- Connect via USB cable
- The SDK will auto-detect the connection
- No additional configuration needed

### Reachy Mini (Wireless)

- Ensure robot is on the same network
- The SDK will auto-detect via network
- May require network configuration if using custom IP

## Gestures

The agent implements the following gestures using real hardware:

1. **ACK Gesture** - Quick nod (head down then up)
2. **THINKING Gesture** - Slow side-to-side head movement
3. **DONE Gesture** - Nod up (positive z)
4. **ERROR Gesture** - Shake head side to side
5. **REST Gesture** - Return to neutral position

## Safety Considerations

### Before First Use

1. **Clear Workspace** - Ensure robot has space to move
2. **Check Joint Limits** - Verify robot is within safe ranges
3. **Emergency Stop** - Know how to stop the robot quickly
4. **Start Small** - Test with small movements first

### During Operation

- Monitor the robot during gestures
- Watch for any unusual behavior
- Keep emergency stop accessible
- Check logs for any errors

## Testing Hardware Integration

### 1. Test Connection

```bash
# Start agent with hardware enabled
export REACHY_MOCKED=false
./start.sh
```

### 2. Check Health

```bash
curl http://localhost:9001/v1/agent/health
```

Should show `sensors_ok: true` and `actuators_ok: true` if connected.

### 3. Submit a Task

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What is p95 latency?"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

**Watch the robot** - it should perform:
1. ACK gesture (quick nod)
2. THINKING gesture (side-to-side movement)
3. DONE gesture (nod up) when task completes

## Troubleshooting

### Connection Error: "Unable to connect to any of [tcp/localhost:7447]!"

This is the most common error. It means the Reachy Mini SDK cannot find the robot.

**Quick Fixes:**
1. **Check robot is powered on** - LED indicators should be active
2. **Check USB connection** (Lite) - Try reconnecting USB cable
3. **Check network** (Wireless) - Ensure robot is on same network
4. **Restart robot** - Power off, wait 10 seconds, power on

**Test connection directly:**
```python
from reachy_mini import ReachyMini
with ReachyMini() as mini:
    print("Connected!")
```

**If connection fails:**
- Agent will automatically fall back to mocked mode
- Tasks will still execute successfully
- Check `TROUBLESHOOTING.md` for detailed solutions

### SDK Not Found

```
ImportError: cannot import name 'ReachyMini' from 'reachy_mini'
```

**Solution:**
```bash
pip install reachy_mini
```

### Connection Failed

```
Failed to connect to Reachy hardware
```

**Solutions:**
1. Check USB connection (for Lite)
2. Check network connection (for Wireless)
3. Verify robot is powered on
4. Check robot is accessible:
   ```python
   from reachy_mini import ReachyMini
   with ReachyMini() as mini:
       print("Connected!")
   ```

### Gesture Errors

If gestures fail, check:
1. Robot is connected (`/v1/agent/health`)
2. Robot has space to move
3. Joint limits are not exceeded
4. Check logs for specific error messages

## Gesture Customization

You can customize gestures by editing `app/gestures.py`:

```python
async def ack_gesture(self) -> None:
    robot = self._get_robot()
    from reachy_mini.utils import create_head_pose
    
    # Customize the gesture here
    robot.goto_target(
        head=create_head_pose(z=-10, roll=5, degrees=True, mm=True),
        duration=0.3
    )
    # ... more movements
```

## Advanced: Using Arms

The current implementation only uses head movements. To add arm gestures:

```python
# Example: Move left arm
robot.goto_target(
    left_arm={
        "shoulder_pitch": 45,  # degrees
        "shoulder_roll": 0,
        "elbow_yaw": 0,
        "elbow_pitch": -90,
        "wrist_pitch": 0,
        "wrist_roll": 0,
        "gripper": 0
    },
    duration=1.0
)
```

See [Reachy Mini SDK documentation](https://github.com/pollen-robotics/reachy_mini) for full API details.

## Resources

- **Reachy Mini SDK:** https://github.com/pollen-robotics/reachy_mini
- **Documentation:** Check the `docs/` folder in the SDK repository
- **Examples:** Check the `examples/` folder in the SDK repository
- **Community:** Join Discord for support

## Next Steps

1. ✅ Install SDK
2. ✅ Test connection
3. ✅ Enable hardware mode
4. ✅ Test gestures
5. ✅ Customize gestures (optional)
6. ✅ Add arm movements (optional)

