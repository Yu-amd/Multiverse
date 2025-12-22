# Activating Reachy Mini Service

## Current Status

✅ **USB devices detected:**
- Reachy Mini Camera
- Reachy Mini Audio

❌ **Reachy service NOT running:**
- Port 7447 not accessible
- Zenoh service not started

## The Issue

The robot hardware is connected, but the **Reachy service (Zenoh)** that provides the API isn't running. This service needs to be active for the SDK to connect.

## Activation Methods

### Method 1: Check Robot's Physical State

**Reachy Mini Lite** may need to be "activated" or "woken up":

1. **Check LED Indicators:**
   - What color is the LED?
   - Is it solid or blinking?
   - Different colors indicate different states

2. **Try Physical Interaction:**
   - Press any buttons on the robot
   - Move the robot's head/arms slightly
   - Some models need to be "woken up"

3. **Check for Power Button:**
   - Some models have a power/activation button
   - Try pressing and holding
   - Check robot's documentation

### Method 2: Check Robot's Web Interface

Some Reachy Mini models have a web interface:

1. **Try accessing:**
   ```bash
   # Common addresses
   http://reachy-mini.local
   http://192.168.1.XXX  # Check your network
   http://localhost:8080  # Some models use this
   ```

2. **Check for service controls:**
   - Look for "Start Service" or "Activate" button
   - Check service status
   - Enable API/service if needed

### Method 3: Check Robot's Documentation

1. **Official Setup Guide:**
   - https://github.com/pollen-robotics/reachy_mini
   - Check `docs/platforms/reachy_mini_lite/` folder
   - Look for "Getting Started" or "First Use"

2. **Model-Specific Instructions:**
   - Your model might have specific activation steps
   - Check the manual/quick start guide
   - Look for "Service Startup" section

### Method 4: Try Robot's Official Examples

Sometimes running an official example can activate the service:

```bash
# Clone Reachy Mini repo
git clone https://github.com/pollen-robotics/reachy_mini.git
cd reachy_mini/examples

# Try a simple example
python basic_movement.py
# or
python hello_world.py
```

This might trigger the service to start.

### Method 5: Check if Service Needs Manual Start

Some models require the service to be started manually:

1. **Check if robot has SSH access:**
   ```bash
   # Try SSH (if robot has network)
   ssh pi@reachy-mini.local
   # or check robot's IP
   ```

2. **On the robot, check service:**
   ```bash
   # Check if service exists
   systemctl list-units | grep reachy
   
   # Try starting service
   sudo systemctl start reachy
   # or
   sudo systemctl start reachy-mini
   ```

### Method 6: Firmware/Software Update

The robot might need a firmware update:

1. **Check robot's current firmware version**
2. **Update if needed:**
   - Follow robot's update instructions
   - Check for updates via web interface (if available)
   - Use robot's official update tool

## What to Check on Your Robot

### Physical Checks:

1. **LED Status:**
   - [ ] What color is the LED?
   - [ ] Is it blinking or solid?
   - [ ] Does it change when you interact?

2. **Buttons/Switches:**
   - [ ] Are there any buttons?
   - [ ] Try pressing/holding buttons
   - [ ] Check for power/activation switch

3. **Display (if available):**
   - [ ] Any status messages?
   - [ ] Error messages?
   - [ ] Service status?

4. **Robot Movement:**
   - [ ] Can you move the head/arms manually?
   - [ ] Does the robot respond to physical input?

### Software Checks:

1. **Web Interface:**
   - [ ] Try `http://reachy-mini.local`
   - [ ] Try `http://localhost:8080`
   - [ ] Check network for robot's IP

2. **Official Examples:**
   - [ ] Try running official SDK examples
   - [ ] Do they trigger service startup?

3. **Documentation:**
   - [ ] Check robot's getting started guide
   - [ ] Look for "First Use" or "Activation" steps

## Quick Test After Activation

Once you've tried activating the robot:

```bash
# Check if service started
./check_robot_service.sh

# Test connection
python test_connection.py
```

## Common Activation Patterns

### Pattern 1: Button Press
- Press and hold power button for 3 seconds
- LED changes color
- Service starts

### Pattern 2: Movement Trigger
- Move robot's head/arms
- Robot "wakes up"
- Service activates

### Pattern 3: Web Interface
- Access web interface
- Click "Start Service" or "Activate"
- Service starts

### Pattern 4: Auto-Start on Connection
- Service should auto-start when USB connected
- Wait 30-60 seconds
- Check if it starts automatically

## Still Not Working?

If none of these work:

1. **Check Robot's Model:**
   - What exact model do you have?
   - Reachy Mini Lite (USB)?
   - Reachy Mini (Wireless)?
   - Check serial number/model number

2. **Contact Support:**
   - Reachy Mini Discord
   - GitHub Issues: https://github.com/pollen-robotics/reachy_mini/issues
   - Include your model and the diagnostic output

3. **Check Robot's Warranty/Support:**
   - Robot might need service
   - Hardware issue possible
   - Contact manufacturer

## Next Steps

1. **Check robot's LED and physical state** - What do you see?
2. **Try accessing web interface** - Does it exist?
3. **Try running official examples** - Do they work?
4. **Check robot's documentation** - Any activation steps?

**Share what you find:**
- LED color/pattern
- Any buttons/switches
- Web interface accessible?
- Official examples work?

This will help narrow down the solution!

