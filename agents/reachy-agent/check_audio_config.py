#!/usr/bin/env python3
"""Check if audio is configured correctly in the agent."""
import os
import sys
from pathlib import Path

# Add paths
common_path = Path(__file__).parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

reachy_agent_path = Path(__file__).parent
if str(reachy_agent_path) not in sys.path:
    sys.path.insert(0, str(reachy_agent_path))

print("=" * 60)
print("Audio Configuration Check")
print("=" * 60)
print()

# Check environment variables
print("Environment Variables:")
print(f"  REACHY_MOCKED: {os.getenv('REACHY_MOCKED', 'not set (default: true)')}")
print(f"  REACHY_AUDIO_ENABLED: {os.getenv('REACHY_AUDIO_ENABLED', 'not set (default: true)')}")
print(f"  REACHY_USE_ALSA_DIRECT: {os.getenv('REACHY_USE_ALSA_DIRECT', 'not set (default: true)')}")
print()

# Check if audio controller can be imported
print("Checking audio controller...")
try:
    from app.audio import AudioController
    print("✅ AudioController imported successfully")
except Exception as e:
    print(f"❌ Failed to import AudioController: {e}")
    sys.exit(1)

# Check if robot can connect
print()
print("Checking robot connection...")
try:
    from app.reachy_driver import ReachyDriver
    
    driver = ReachyDriver(mocked=False)
    print(f"  Driver mocked: {driver.mocked}")
    print(f"  Driver connected: {driver.is_connected()}")
    
    if not driver.is_connected():
        print("  ⚠️  Robot not connected (will connect on first use)")
    else:
        robot = driver.get_robot()
        if robot:
            print(f"  ✅ Robot instance available")
            print(f"     Has media: {hasattr(robot, 'media')}")
            if hasattr(robot, 'media'):
                print(f"     Media has play_sound: {hasattr(robot.media, 'play_sound')}")
        else:
            print("  ❌ Robot instance is None")
            
except Exception as e:
    print(f"❌ Error checking robot: {e}")
    import traceback
    traceback.print_exc()

# Check TTS libraries
print()
print("Checking TTS libraries...")
try:
    import edge_tts
    print("✅ edge-tts available")
except ImportError:
    print("❌ edge-tts not installed (pip install edge-tts)")

try:
    from pydub import AudioSegment
    print("✅ pydub available")
except ImportError:
    print("❌ pydub not installed (pip install pydub)")

# Check aplay command
print()
print("Checking ALSA tools...")
import shutil
if shutil.which("aplay"):
    print("✅ aplay command available")
else:
    print("❌ aplay command not found")

print()
print("=" * 60)
print("Summary")
print("=" * 60)
print()
print("For audio to work in the agent:")
print("  1. REACHY_MOCKED=false (or not set if hardware connected)")
print("  2. REACHY_AUDIO_ENABLED=true (default)")
print("  3. Robot must be connected when task executes")
print("  4. TTS libraries installed (edge-tts, pydub)")
print("  5. ALSA tools available (aplay)")
print()
print("Check agent logs for:")
print("  - 'Audio: Robot connected, audio enabled'")
print("  - 'Audio: Starting text-to-speech conversion'")
print("  - 'Audio: Successfully played via ALSA'")
print("=" * 60)

