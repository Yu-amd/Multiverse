# Reachy Mini Service Start Guide

## Problem

The diagnostic shows:
```
❌ CONNECTION FAILED
Error: Unable to connect to any of [tcp/localhost:7447]
```

This means the **Reachy service (Zenoh)** is not running on the robot.

## Solution by Robot Type

### Reachy Mini Lite (USB)

The Reachy Mini Lite should automatically start the service when connected via USB.

**Steps:**

1. **Check USB Connection:**
   ```bash
   ./check_robot_service.sh
   ```

2. **Verify USB Device:**
   ```bash
   lsusb
   # Look for Reachy/Pollen Robotics device
   ```

3. **Check USB Permissions (Linux):**
   ```bash
   sudo usermod -a -G dialout $USER
   # Log out and back in
   ```

4. **Try Reconnecting:**
   - Unplug USB cable
   - Wait 5 seconds
   - Plug back in
   - Wait 30 seconds for service to start

5. **Check Robot Status:**
   - Look at robot's LED indicators
   - Green/blue LED = service running
   - Red LED = error state

### Reachy Mini (Wireless)

The Wireless version runs the service on the robot itself (Raspberry Pi).

**Steps:**

1. **Check Robot is On Same Network:**
   ```bash
   # Find robot's IP (if known)
   ping <robot-ip>
   ```

2. **Access Robot's Interface:**
   - Some models have a web interface
   - Check robot's documentation for access method
   - Default might be: http://reachy-mini.local or http://<robot-ip>

3. **SSH into Robot (if enabled):**
   ```bash
   ssh pi@reachy-mini.local
   # or
   ssh pi@<robot-ip>
   ```

4. **Check Service Status:**
   ```bash
   # On the robot
   systemctl status reachy
   # or
   ps aux | grep zenoh
   ```

5. **Start Service (if needed):**
   ```bash
   # On the robot
   sudo systemctl start reachy
   # or check robot's startup scripts
   ```

## Common Issues

### Issue 1: Service Not Auto-Starting

**Symptoms:**
- Robot is powered on
- USB/network connected
- But port 7447 not accessible

**Solution:**
1. Check robot's firmware is up to date
2. Check robot's documentation for service startup
3. Try restarting robot (power cycle)

### Issue 2: USB Permissions (Linux)

**Symptoms:**
- USB device detected
- But service can't access it

**Solution:**
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER

# Check current groups
groups

# Log out and back in for changes to take effect
```

### Issue 3: Network Firewall (Wireless)

**Symptoms:**
- Robot on network
- But port 7447 blocked

**Solution:**
```bash
# Allow port 7447
sudo ufw allow 7447/tcp

# Or disable firewall temporarily for testing
sudo ufw disable
```

### Issue 4: Robot Firmware Outdated

**Symptoms:**
- Service should start but doesn't
- Connection worked before but stopped

**Solution:**
1. Check robot's firmware version
2. Update firmware if needed
3. Follow robot's update instructions

## Verification

After starting the service, verify it's running:

```bash
# Check port 7447
./check_robot_service.sh

# Or test connection
python test_connection.py
```

## Robot-Specific Instructions

### Check Robot Documentation

1. **Official Docs:**
   - https://github.com/pollen-robotics/reachy_mini
   - Check `docs/platforms/` for your specific model

2. **Robot's Web Interface:**
   - Some models have a dashboard
   - Check for service status/controls

3. **Robot's LED Indicators:**
   - Green = service running
   - Blue = connected
   - Red = error
   - Flashing = booting

## Still Not Working?

1. **Check Robot's Status:**
   - LED indicators
   - Any display/status screen
   - Error messages

2. **Try Robot's Examples:**
   ```bash
   git clone https://github.com/pollen-robotics/reachy_mini.git
   cd reachy_mini/examples
   # Try running official examples
   ```

3. **Community Support:**
   - Reachy Mini Discord
   - GitHub Issues: https://github.com/pollen-robotics/reachy_mini/issues

4. **Check Robot Model:**
   - Different models have different startup procedures
   - Verify you're following the correct guide for your model

## Quick Checklist

- [ ] Robot is powered on
- [ ] Waited 30 seconds after power on
- [ ] USB connected (Lite) or network accessible (Wireless)
- [ ] USB permissions set (Linux, Lite)
- [ ] Port 7447 accessible (check with `check_robot_service.sh`)
- [ ] Robot firmware up to date
- [ ] Robot's LED shows service running
- [ ] Tried power cycling robot

## Next Steps

Once the service is running:

1. Run `python test_connection.py` - should show ✅
2. Restart agent: `./start.sh`
3. Submit a task - gestures should work!

