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
    
    # Step 1: Try to connect to robot (may fail if camera not available)
    print("Step 1: Connecting to robot...")
    robot = None
    camera_error = False
    try:
        from reachy_mini import ReachyMini
        robot = ReachyMini()
        print("✅ Robot connected")
    except RuntimeError as e:
        if "Camera not found" in str(e):
            print("⚠️  Camera not found (this is OK for audio-only testing)")
            print("   Will test audio using ALSA directly instead")
            camera_error = True
        else:
            print(f"❌ Failed to connect to robot: {e}")
            return False, False
    except Exception as e:
        print(f"❌ Failed to connect to robot: {e}")
        return False, False
    
    # Step 2: Check media availability (if robot connected)
    print()
    print("Step 2: Checking media availability...")
    if robot is None:
        print("⚠️  Robot not connected (camera issue), will use ALSA directly")
        # If robot is None, we can't test SDK method, so skip to ALSA test
        # But we still need to generate audio first
        pass
    else:
        if not hasattr(robot, 'media'):
            print("❌ Robot does not have 'media' attribute")
            return False, camera_error
        print("✅ Robot has 'media' attribute")
        
        if not hasattr(robot.media, 'play_sound'):
            print("❌ Robot media does not have 'play_sound' method")
            return False, camera_error
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
        
        # Convert to WAV with proper format (stereo, 16kHz) for Reachy Mini
        audio = AudioSegment.from_mp3(mp3_file)
        
        # Convert to stereo if mono (ALSA config expects 2 channels)
        if audio.channels == 1:
            audio = audio.set_channels(2)
        
        # Set sample rate to 16000 Hz (matches ALSA config)
        if audio.frame_rate != 16000:
            audio = audio.set_frame_rate(16000)
        
        audio.export(wav_file, format="wav")
        
        print(f"✅ Generated audio file: {wav_file}")
        print(f"   Format: {audio.channels} channels, {audio.frame_rate} Hz")
        print(f"   Size: {os.path.getsize(wav_file)} bytes")
        
    except Exception as e:
        print(f"❌ Failed to generate audio: {e}")
        import traceback
        traceback.print_exc()
        return False, camera_error
    
    # Step 4: Test playback
    print()
    print("Step 4: Testing audio playback...")
    print("   (You should hear audio from the robot's speaker)")
    try:
        # Ensure audio file exists
        if not os.path.exists(wav_file):
            print(f"❌ Audio file not found: {wav_file}")
            return False, camera_error
        
        # Try playing the audio
        print(f"   Playing: {wav_file}")
        
        # If robot is connected, try SDK method first
        if robot and hasattr(robot, 'media') and hasattr(robot.media, 'play_sound'):
            try:
                robot.media.play_sound(wav_file)
                print("✅ play_sound() called successfully via SDK")
                await asyncio.sleep(2)
                return True, camera_error
            except Exception as e:
                print(f"⚠️  SDK play_sound() failed: {e}")
                print("   Trying ALSA directly...")
        
        # Fallback: Use ALSA directly (same as agent does)
        print("   Using ALSA directly (reachymini_audio_sink)...")
        try:
            import subprocess
            result = await asyncio.create_subprocess_exec(
                "aplay", "-D", "reachymini_audio_sink", wav_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=10.0)
            
            if result.returncode == 0:
                print("✅ Audio played successfully via ALSA")
                return True, camera_error
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                print(f"❌ ALSA playback failed: {error_msg}")
                print("\n   Troubleshooting:")
                print("   1. Check ALSA device: aplay -l")
                print("   2. Test device: aplay -D reachymini_audio_sink test.wav")
                print("   3. Check robot daemon is running")
                return False, camera_error
        except FileNotFoundError:
            print("❌ 'aplay' command not found. Install ALSA utils:")
            print("   sudo apt-get install alsa-utils")
            return False, camera_error
        except asyncio.TimeoutError:
            print("❌ Audio playback timed out")
            return False, camera_error
        except Exception as e:
            print(f"❌ ALSA playback failed: {e}")
            return False, camera_error
        
    except Exception as e:
        print(f"❌ Failed to play audio: {e}")
        import traceback
        traceback.print_exc()
        return False, camera_error

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
        
    except RuntimeError as e:
        if "Camera not found" in str(e):
            print("⚠️  Cannot test built-in sound - camera not found")
            print("   (Camera is required for SDK initialization)")
            print("   This is OK - custom audio can still work via ALSA")
            return False
        else:
            print(f"❌ Failed to play built-in sound: {e}")
            import traceback
            traceback.print_exc()
            return False
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
    custom_ok, camera_error = await test_robot_audio()
    
    # Test built-in sound
    builtin_ok = await test_builtin_sound()
    
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    if custom_ok:
        print("✅ Audio playback is working!")
        if camera_error:
            print("   Note: Camera not available, but audio works via ALSA")
        print("   If you didn't hear audio, check:")
        print("   1. Robot's speaker volume")
        print("   2. Robot's audio device configuration")
        print("   3. ALSA device: aplay -D reachymini_audio_sink test.wav")
        print("   4. Daemon audio backend settings")
    elif builtin_ok:
        print("⚠️  Built-in sounds work, but custom audio may have issues")
    else:
        print("❌ Audio playback failed")
        if camera_error:
            print("   Note: Camera not found - this prevents SDK initialization")
            print("   However, audio can still work via ALSA if configured correctly")
        print("   Check:")
        print("   1. Robot connection and daemon status")
        print("   2. ALSA device availability: aplay -l")
        print("   3. Audio configuration")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

