# Reachy Mini Hardware Integration Guide

## Current Status

**The agent is currently in MOCKED mode** - it works perfectly for testing and development, but does not control real hardware yet.

## What's Working Now

✅ **Agent API** - Fully functional
✅ **Task Execution** - Background tasks working
✅ **AIM Integration** - Successfully calling AI endpoints
✅ **Gesture Simulation** - Mocked gestures (logs only)
✅ **Observability** - Metrics and logging working

## What's Needed for Real Hardware

### 1. Install Reachy SDK

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
pip install reachy-sdk
```

**Note:** Check the official Reachy documentation for the correct SDK package name and installation instructions. It may be:
- `reachy-sdk`
- `reachy-python-sdk`
- Or require ROS 2 setup

### 2. Enable Hardware Mode

Update `app/main.py` to use real hardware:

```python
# Change this line (around line 211):
reachy_driver = ReachyDriver(mocked=True)

# To:
reachy_driver = ReachyDriver(mocked=False, connection_string="your-connection-string")
```

Or use environment variable:

```bash
export REACHY_MOCKED=false
export REACHY_CONNECTION_STRING="your-connection-string"
```

### 3. Implement Hardware Control

You need to implement the actual hardware control in two files:

#### `app/reachy_driver.py`

Uncomment and implement the real hardware connection:

```python
async def connect(self) -> bool:
    if self.mocked:
        # ... existing mocked code ...
        return True
    
    # Real implementation
    try:
        import reachy_sdk  # or whatever the actual import is
        self.robot = reachy_sdk.ReachySDK(self.connection_string)
        self.connected = True
        logger.info("Reachy driver connected")
        return True
    except Exception as e:
        logger.error("Failed to connect to Reachy", error=str(e))
        return False
```

#### `app/gestures.py`

Implement real gesture sequences:

```python
async def ack_gesture(self) -> None:
    if self.is_mocked:
        # ... existing mocked code ...
        return
    
    # Real implementation
    try:
        # Example gestures (adjust based on actual Reachy SDK API):
        await self.driver.robot.head.nod()
        await self.driver.robot.left_arm.move_to_position(...)
        logger.info("Gesture: ACK", gesture="ack")
    except Exception as e:
        logger.error("Failed to execute ACK gesture", error=str(e))
```

### 4. Connection Setup

**Physical Connection:**
- Connect Reachy Mini via USB or network
- Ensure robot is powered on
- Check network connectivity if using network connection

**Connection String:**
- USB: May be a device path like `/dev/ttyUSB0` or port number
- Network: May be an IP address like `192.168.1.100` or hostname
- ROS 2: May be a node name or namespace

**Check Reachy Documentation** for the exact connection format.

### 5. Safety Considerations

Before enabling real hardware:

1. **Emergency Stop** - Ensure emergency stop is accessible
2. **Joint Limits** - Verify joint limits are set correctly
3. **Workspace** - Clear the robot's workspace
4. **Test Mode** - Start with small, safe movements
5. **Monitoring** - Watch the robot during first tests

## Recommended Approach

### Step 1: Run Tests First (Recommended)

Before connecting real hardware, create and run a test suite:

```bash
# Create test suite (we'll do this next)
pytest tests/

# Run with coverage
pytest --cov=app --cov-report=html
```

This ensures:
- Agent logic works correctly
- API endpoints function properly
- Error handling is robust
- No regressions when adding hardware code

### Step 2: Test in Mocked Mode

Verify everything works in mocked mode:

```bash
# Start agent
./start.sh

# Test all endpoints
curl http://localhost:9001/v1/agent/info
curl http://localhost:9001/v1/agent/health

# Submit a task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "Test prompt"},
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

### Step 3: Implement Hardware Integration

1. Install Reachy SDK
2. Update `reachy_driver.py` with real connection code
3. Update `gestures.py` with real gesture sequences
4. Test with hardware in a safe environment

### Step 4: Gradual Testing

1. **Connection Test** - Verify you can connect to the robot
2. **Simple Movement** - Test one joint/actuator
3. **Single Gesture** - Test one gesture (e.g., ACK)
4. **Full Sequence** - Test complete task flow

## Testing Checklist

Before connecting real hardware:

- [ ] Test suite passes
- [ ] Agent works in mocked mode
- [ ] All API endpoints functional
- [ ] Error handling tested
- [ ] Emergency stop accessible
- [ ] Workspace cleared
- [ ] Reachy SDK installed
- [ ] Connection string verified
- [ ] Safety checks implemented

## Troubleshooting

### Connection Issues

```bash
# Check if robot is accessible
ping <robot-ip-address>

# Check USB connection
lsusb | grep -i reachy

# Check serial ports
ls /dev/tty* | grep -i usb
```

### SDK Issues

```bash
# Verify SDK installation
python3 -c "import reachy_sdk; print(reachy_sdk.__version__)"

# Check SDK documentation
# Visit: https://docs.pollen-robotics.com/
```

### Permission Issues

```bash
# Add user to dialout group (for serial ports)
sudo usermod -a -G dialout $USER
# Log out and back in for changes to take effect
```

## Next Steps

1. **Create test suite** (recommended first step)
2. **Research Reachy SDK** - Find official documentation
3. **Implement hardware driver** - Add real connection code
4. **Implement gestures** - Add real gesture sequences
5. **Test with hardware** - Gradual, safe testing

## Resources

- Reachy Documentation: https://docs.pollen-robotics.com/
- Reachy SDK: Check official repository
- ROS 2 (if needed): https://docs.ros.org/

