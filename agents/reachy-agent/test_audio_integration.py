#!/usr/bin/env python3
"""Test audio integration with the agent's audio controller."""
import asyncio
import sys
import os
from pathlib import Path

# Add paths
common_path = Path(__file__).parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

reachy_agent_path = Path(__file__).parent
if str(reachy_agent_path) not in sys.path:
    sys.path.insert(0, str(reachy_agent_path))

from app.audio import AudioController
from app.reachy_driver import ReachyDriver

async def test_audio_controller():
    """Test the audio controller with a real robot."""
    print("=" * 60)
    print("Audio Controller Integration Test")
    print("=" * 60)
    print()
    
    # Step 1: Initialize driver
    print("Step 1: Initializing Reachy driver...")
    driver = ReachyDriver(mocked=False)
    
    # Step 2: Connect to robot
    print("Step 2: Connecting to robot...")
    connected = await driver.connect()
    if not connected:
        print("❌ Failed to connect to robot")
        return False
    
    print("✅ Robot connected")
    
    # Step 3: Get robot instance
    print("Step 3: Getting robot instance...")
    robot = driver.get_robot()
    if not robot:
        print("❌ Robot instance is None")
        return False
    
    print("✅ Robot instance obtained")
    print(f"   Has media: {hasattr(robot, 'media')}")
    
    # Step 4: Initialize audio controller
    print()
    print("Step 4: Initializing audio controller...")
    audio_controller = AudioController(robot=robot)
    print(f"   Is mocked: {audio_controller.is_mocked}")
    print(f"   Robot set: {audio_controller.robot is not None}")
    
    # Step 5: Test speaking
    print()
    print("Step 5: Testing audio playback...")
    print("   (You should hear: 'Hello, this is a test of the audio controller')")
    
    test_text = "Hello, this is a test of the audio controller"
    success = await audio_controller.speak(test_text)
    
    if success:
        print("✅ Audio playback completed")
        return True
    else:
        print("❌ Audio playback failed")
        return False

async def main():
    """Run the test."""
    try:
        success = await test_audio_controller()
        print()
        print("=" * 60)
        if success:
            print("✅ All tests passed!")
            print("   Audio controller is working correctly.")
            print("   The agent should be able to speak responses.")
        else:
            print("❌ Tests failed")
            print("   Check the error messages above.")
        print("=" * 60)
    except Exception as e:
        print(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

