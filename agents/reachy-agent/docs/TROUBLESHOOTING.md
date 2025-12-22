# Troubleshooting Reachy Mini Connection

## Common Connection Errors

### Error: "Unable to connect to any of [tcp/localhost:7447]!"

This error indicates that the Reachy Mini SDK cannot find the robot on the expected connection endpoint.

**Possible Causes:**

1. **Reachy Mini not powered on**
   - Check that the robot is powered on
   - LED indicators should be active

2. **USB connection (Reachy Mini Lite)**
   - Ensure USB cable is properly connected
   - Try a different USB port
   - Check USB cable is not damaged

3. **Network connection (Reachy Mini Wireless)**
   - Ensure robot is on the same network as your computer
   - Check network connectivity
   - Verify robot's IP address if using custom network config

4. **Reachy service not running**
   - The Reachy Mini service may need to be started
   - Check if robot firmware is up to date

## Solutions

### Step 1: Verify Robot is Accessible

Test the connection directly using the SDK:

```python
from reachy_mini import ReachyMini

try:
    with ReachyMini() as mini:
        print("✅ Connection successful!")
        # Test a small movement
        from reachy_mini.utils import create_head_pose
        mini.goto_target(
            head=create_head_pose(z=5, roll=0, degrees=True, mm=True),
            duration=1.0
        )
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

### Step 2: Check Reachy Mini Status

**For Reachy Mini Lite (USB):**
- Check USB connection in system
- Try reconnecting the USB cable
- Check if robot appears in device manager

**For Reachy Mini Wireless:**
- Check robot's network status
- Verify robot is on same WiFi network
- Check robot's IP address (if configured)

### Step 3: Verify SDK Installation

```bash
pip show reachy_mini
```

Should show version information. If not installed:

```bash
pip install reachy_mini
```

### Step 4: Check Zenoh Connection

The error mentions Zenoh (the communication protocol). Check if Zenoh is accessible:

```bash
# Check if port 7447 is in use (Zenoh default port)
netstat -an | grep 7447
# or
ss -tuln | grep 7447
```

### Step 5: Use Mocked Mode (Fallback)

If hardware is not available, the agent will automatically fall back to mocked mode:

```bash
# Explicitly enable mocked mode
export REACHY_MOCKED=true
./start.sh
```

Or the agent will automatically use mocked mode if connection fails.

## Connection Retry

The agent will attempt to connect when gestures are executed. If connection fails:

1. **First attempt:** Logs error and continues in mocked mode
2. **Subsequent attempts:** Will retry on each gesture
3. **No blocking:** Agent continues to work in mocked mode

## Debugging Steps

### 1. Enable Verbose Logging

Check the agent logs for detailed error messages:

```bash
./start.sh
# Watch for connection attempts in logs
```

### 2. Test Direct Connection

Run a simple Python script to test connection:

```python
#!/usr/bin/env python3
"""Test Reachy Mini connection"""
from reachy_mini import ReachyMini
from reachy_mini.utils import create_head_pose

print("Attempting to connect to Reachy Mini...")
try:
    with ReachyMini() as mini:
        print("✅ Connected!")
        print("Testing head movement...")
        mini.goto_target(
            head=create_head_pose(z=10, roll=0, degrees=True, mm=True),
            duration=1.0
        )
        print("✅ Movement successful!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print(f"Error type: {type(e).__name__}")
```

### 3. Check System Requirements

- **Python:** 3.10+ required
- **OS:** Linux, macOS, or Windows
- **Dependencies:** All SDK dependencies installed

### 4. Network Configuration (Wireless)

If using Reachy Mini Wireless, you may need to configure network settings:

```python
# Custom connection (if needed)
from reachy_mini import ReachyMini

# If robot has specific IP/port
# (Check Reachy Mini documentation for custom connection options)
```

## Common Solutions

### Solution 1: Restart Robot

1. Power off Reachy Mini
2. Wait 10 seconds
3. Power on
4. Wait for robot to fully boot
5. Try connection again

### Solution 2: Reinstall SDK

```bash
pip uninstall reachy_mini
pip install reachy_mini
```

### Solution 3: Check USB Permissions (Linux)

```bash
# Add user to dialout group (for USB access)
sudo usermod -a -G dialout $USER
# Log out and back in for changes to take effect
```

### Solution 4: Firewall Settings (Wireless)

If using Reachy Mini Wireless, ensure firewall allows Zenoh port (7447):

```bash
# Check firewall status
sudo ufw status
# Allow Zenoh port if needed
sudo ufw allow 7447/tcp
```

## Getting Help

If issues persist:

1. **Check Reachy Mini Documentation:**
   - https://github.com/pollen-robotics/reachy_mini
   - Platform-specific guides in `docs/platforms/`

2. **Check Agent Logs:**
   - Look for detailed error messages
   - Check connection attempts

3. **Test with SDK Examples:**
   - Try examples from Reachy Mini repository
   - Verify SDK works independently

4. **Community Support:**
   - Reachy Mini Discord
   - GitHub Issues

## Expected Behavior

### Successful Connection

When connected successfully, you should see:

```
{"message": "Reachy driver connected to hardware successfully", ...}
```

### Failed Connection (Graceful Fallback)

When connection fails, you should see:

```
{"message": "Failed to connect to Reachy Mini hardware", "error": "...", "help": "..."}
{"message": "Gesture: ACK (mocked)", ...}  # Falls back to mocked mode
```

The agent will continue to work in mocked mode, so tasks will still execute successfully.

## Summary

- ✅ Connection errors are handled gracefully
- ✅ Agent falls back to mocked mode automatically
- ✅ Detailed error messages help diagnose issues
- ✅ No blocking - agent continues to work even if hardware unavailable
