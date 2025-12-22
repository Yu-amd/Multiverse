#!/usr/bin/env python3
"""
Test script to diagnose Reachy Mini connection issues.
Run this to verify the robot is accessible.
"""
import sys
from pathlib import Path

# Add common framework to path if needed
common_path = Path(__file__).parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

print("=" * 60)
print("Reachy Mini Connection Diagnostic")
print("=" * 60)
print()

# Step 1: Check SDK installation
print("Step 1: Checking SDK installation...")
try:
    import reachy_mini
    print(f"✅ reachy_mini SDK installed: {reachy_mini.__version__ if hasattr(reachy_mini, '__version__') else 'version unknown'}")
except ImportError:
    print("❌ reachy_mini SDK not installed!")
    print("   Install with: pip install reachy_mini")
    sys.exit(1)

print()

# Step 2: Check if we can import ReachyMini
print("Step 2: Checking ReachyMini import...")
try:
    from reachy_mini import ReachyMini
    print("✅ ReachyMini class imported successfully")
except ImportError as e:
    print(f"❌ Failed to import ReachyMini: {e}")
    sys.exit(1)

print()

# Step 3: Try to create ReachyMini instance
print("Step 3: Attempting to connect to Reachy Mini...")
print("   (This may take a few seconds)")
print()

try:
    robot = ReachyMini()
    print("✅ ReachyMini instance created successfully")
    print()
    
    # Step 4: Test basic access
    print("Step 4: Testing robot access...")
    if hasattr(robot, 'head'):
        print("✅ Robot head accessible")
    else:
        print("⚠️  Robot head not accessible (but connection succeeded)")
    
    # Step 5: Test a small movement
    print()
    print("Step 5: Testing small head movement...")
    try:
        from reachy_mini.utils import create_head_pose
        
        print("   Moving head slightly...")
        robot.goto_target(
            head=create_head_pose(z=5, roll=0, degrees=True, mm=True),
            duration=1.0
        )
        print("✅ Head movement successful!")
        
        # Return to neutral
        print("   Returning to neutral...")
        robot.goto_target(
            head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
            duration=0.5
        )
        print("✅ Returned to neutral position")
        
    except Exception as e:
        print(f"⚠️  Movement test failed: {e}")
        print("   (Connection works, but movement failed)")
    
    print()
    print("=" * 60)
    print("✅ CONNECTION SUCCESSFUL!")
    print("=" * 60)
    print()
    print("The robot is accessible. The agent should be able to connect.")
    print("If the agent still fails, check:")
    print("  1. Agent is using the same Python environment")
    print("  2. REACHY_MOCKED=false is set correctly")
    print("  3. Agent logs for specific error messages")
    
except Exception as e:
    error_str = str(e)
    error_type = type(e).__name__
    
    print()
    print("=" * 60)
    print("❌ CONNECTION FAILED")
    print("=" * 60)
    print()
    print(f"Error type: {error_type}")
    print(f"Error message: {error_str}")
    print()
    
    # Provide specific guidance based on error
    if "zenoh" in error_str.lower() or "7447" in error_str or "ZError" in error_type:
        print("This is a Zenoh connection error. Possible causes:")
        print()
        print("1. Reachy Mini service not running:")
        print("   - Check if robot firmware is up to date")
        print("   - Try restarting the robot")
        print("   - Check robot's status LED")
        print()
        print("2. USB connection (Reachy Mini Lite):")
        print("   - Try unplugging and reconnecting USB cable")
        print("   - Try a different USB port")
        print("   - Check USB cable is not damaged")
        print("   - On Linux: check USB permissions (sudo usermod -a -G dialout $USER)")
        print()
        print("3. Network connection (Reachy Mini Wireless):")
        print("   - Ensure robot is on the same network")
        print("   - Check robot's IP address")
        print("   - Verify network connectivity")
        print("   - Check firewall settings (port 7447)")
        print()
        print("4. Robot state:")
        print("   - Ensure robot is fully booted (wait 30 seconds after power on)")
        print("   - Check robot's status indicators")
        print("   - Try power cycling the robot")
        print()
        print("5. SDK version:")
        print("   - Try updating: pip install --upgrade reachy_mini")
        print("   - Check compatibility with your robot firmware")
    else:
        print("Unexpected error. Check:")
        print("  - Robot is powered on")
        print("  - SDK is up to date")
        print("  - Python environment is correct")
    
    print()
    print("For more help, see:")
    print("  - TROUBLESHOOTING.md")
    print("  - https://github.com/pollen-robotics/reachy_mini")
    
    sys.exit(1)

