#!/usr/bin/env python3
"""Test script to verify robot audio playback works."""
import asyncio
import os
import sys
from pathlib import Path

# Add common framework to path if needed
common_path = Path(__file__).parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

async def test_robot_audio():
    """Test audio playback on robot."""
    print("=" * 60)
    print("Robot Audio Playback Test")
    print("=" * 60)
    print()
    
    # Step 1: Check if robot can connect
    print("Step 1: Connecting to robot...")
    try:
        from reachy_mini import ReachyMini
        robot = ReachyMini()
        print("✅ Robot connected")
    except Exception as e:
        print(f"❌ Failed to connect to robot: {e}")
        return False
    
    # Step 2: Check media availability
    print()
    print("Step 2: Checking media availability...")
    if not hasattr(robot, 'media'):
        print("❌ Robot does not have 'media' attribute")
        return False
    print("✅ Robot has 'media' attribute")
    
    if not hasattr(robot.media, 'play_sound'):
        print("❌ Robot media does not have 'play_sound' method")
        return False
    print("✅ Robot media has 'play_sound' method")
    
    # Step 3: Generate test audio
    print()
    print("Step 3: Generating test audio...")
    try:
        import edge_tts
        from pydub import AudioSegment
        
        text = "Hello, this is a test"
        mp3_file = "/tmp/robot_test.mp3"
        wav_file = "/tmp/robot_test.wav"
        
        # Generate MP3
        communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
        await communicate.save(mp3_file)
        
        # Convert to WAV
        audio = AudioSegment.from_mp3(mp3_file)
        audio.export(wav_file, format="wav")
        
        print(f"✅ Generated audio file: {wav_file}")
        print(f"   Size: {os.path.getsize(wav_file)} bytes")
        
    except Exception as e:
        print(f"❌ Failed to generate audio: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 4: Test playback
    print()
    print("Step 4: Testing audio playback...")
    print("   (You should hear audio from the robot's speaker)")
    try:
        # Ensure audio file exists
        if not os.path.exists(wav_file):
            print(f"❌ Audio file not found: {wav_file}")
            return False
        
        # Try playing the audio
        print(f"   Playing: {wav_file}")
        robot.media.play_sound(wav_file)
        print("✅ play_sound() called successfully")
        print("   (Check if you heard audio)")
        
        # Wait a bit for playback
        await asyncio.sleep(2)
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to play audio: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_builtin_sound():
    """Test playing a built-in sound file."""
    print()
    print("=" * 60)
    print("Testing Built-in Sound")
    print("=" * 60)
    print()
    
    try:
        from reachy_mini import ReachyMini
        robot = ReachyMini()
        
        print("Trying to play built-in 'wake_up.wav' sound...")
        robot.media.play_sound("wake_up.wav")
        print("✅ Built-in sound play_sound() called")
        print("   (Check if you heard the wake up sound)")
        
        await asyncio.sleep(2)
        return True
        
    except Exception as e:
        print(f"❌ Failed to play built-in sound: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all audio tests."""
    print("Testing robot audio playback...")
    print()
    
    # Test custom audio
    custom_ok = await test_robot_audio()
    
    # Test built-in sound
    builtin_ok = await test_builtin_sound()
    
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    if custom_ok and builtin_ok:
        print("✅ Audio playback is working!")
        print("   If you didn't hear audio, check:")
        print("   1. Robot's speaker volume")
        print("   2. Robot's audio device configuration")
        print("   3. Daemon audio backend settings")
    elif builtin_ok:
        print("⚠️  Built-in sounds work, but custom audio may have issues")
    else:
        print("❌ Audio playback failed")
        print("   Check robot connection and audio configuration")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

