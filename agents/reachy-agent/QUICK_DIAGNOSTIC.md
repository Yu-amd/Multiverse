# Quick Diagnostic Guide

## Robot is On But Connection Fails?

If your robot is powered on but you're getting connection errors, follow these steps:

### Step 1: Run Diagnostic Script

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
python test_connection.py
```

This will tell you exactly what's wrong.

### Step 2: Common Issues

#### Issue: "Unable to connect to any of [tcp/localhost:7447]"

This means the **Reachy service** is not running or not accessible.

**For Reachy Mini Lite (USB):**
1. **Check USB connection:**
   ```bash
   lsusb | grep -i reachy
   # or
   dmesg | tail -20
   ```

2. **Check USB permissions (Linux):**
   ```bash
   sudo usermod -a -G dialout $USER
   # Log out and back in for changes to take effect
   ```

3. **Try reconnecting USB:**
   - Unplug USB cable
   - Wait 5 seconds
   - Plug back in
   - Wait 30 seconds for robot to fully boot

**For Reachy Mini Wireless:**
1. **Check network connection:**
   ```bash
   ping <robot-ip-address>
   ```

2. **Check robot is on same network:**
   - Verify robot's WiFi is connected
   - Check robot's IP address matches your network

3. **Check firewall:**
   ```bash
   sudo ufw status
   # If needed, allow port 7447
   sudo ufw allow 7447/tcp
   ```

#### Issue: Robot Service Not Running

The robot might be on, but the Reachy service might not be running.

1. **Check robot status:**
   - Look at robot's LED indicators
   - Check if robot responds to touch/buttons

2. **Restart robot:**
   - Power off
   - Wait 10 seconds
   - Power on
   - Wait 30 seconds for full boot

3. **Check robot firmware:**
   - Ensure firmware is up to date
   - Check robot's documentation for firmware update instructions

### Step 3: Test Direct Connection

Test if the SDK can connect directly:

```python
from reachy_mini import ReachyMini

try:
    with ReachyMini() as mini:
        print("✅ Connected!")
        # Test movement
        from reachy_mini.utils import create_head_pose
        mini.goto_target(
            head=create_head_pose(z=5, roll=0, degrees=True, mm=True),
            duration=1.0
        )
except Exception as e:
    print(f"❌ Failed: {e}")
```

### Step 4: Check Agent Configuration

1. **Verify hardware mode is enabled:**
   ```bash
   echo $REACHY_MOCKED
   # Should be empty or "false"
   ```

2. **Check agent logs:**
   ```bash
   ./start.sh
   # Look for "Reachy driver initialized for real hardware"
   ```

3. **Verify Python environment:**
   ```bash
   source venv/bin/activate
   python -c "from reachy_mini import ReachyMini; print('OK')"
   ```

### Step 5: Platform-Specific Checks

#### Reachy Mini Lite (USB)

1. **USB device detection:**
   ```bash
   # Linux
   lsusb
   dmesg | grep -i usb
   
   # Check if device appears
   ls -la /dev/tty* | grep -i reachy
   ```

2. **USB permissions:**
   ```bash
   # Add user to dialout group
   sudo usermod -a -G dialout $USER
   # Log out and back in
   ```

3. **Try different USB port/cable**

#### Reachy Mini Wireless

1. **Network connectivity:**
   ```bash
   # Find robot's IP (if known)
   ping <robot-ip>
   
   # Or scan network
   nmap -sn <your-network>/24
   ```

2. **Check robot's network settings:**
   - Access robot's web interface (if available)
   - Verify WiFi connection
   - Check IP address assignment

3. **Firewall/port blocking:**
   ```bash
   # Check if port 7447 is accessible
   telnet <robot-ip> 7447
   # or
   nc -zv <robot-ip> 7447
   ```

### Step 6: SDK Version Check

```bash
pip show reachy_mini
pip install --upgrade reachy_mini
```

### Step 7: Still Not Working?

1. **Check Reachy Mini documentation:**
   - https://github.com/pollen-robotics/reachy_mini
   - Platform-specific guides in `docs/platforms/`

2. **Check robot's status:**
   - LED indicators
   - Any error messages on robot's display (if available)

3. **Try robot's official examples:**
   ```bash
   # Clone Reachy Mini repo
   git clone https://github.com/pollen-robotics/reachy_mini.git
   cd reachy_mini/examples
   # Try running examples
   ```

4. **Community support:**
   - Reachy Mini Discord
   - GitHub Issues

## Summary

Most connection issues are caused by:
1. ✅ Robot not fully booted (wait 30 seconds)
2. ✅ USB not connected properly (Lite)
3. ✅ Network not accessible (Wireless)
4. ✅ Reachy service not running
5. ✅ USB permissions (Linux)

Run `test_connection.py` first - it will tell you exactly what's wrong!

