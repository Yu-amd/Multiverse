#!/usr/bin/env python3
"""Test script to verify audio generation works."""
import asyncio
import os
import sys

async def test_edge_tts():
    """Test edge-tts audio generation."""
    try:
        import edge_tts
        print("✅ edge-tts imported successfully")
    except ImportError:
        print("❌ edge-tts not installed. Install with: pip install edge-tts")
        return False
    
    try:
        audio_file = "/tmp/test_audio.mp3"
        text = "Hello, this is a test of text to speech"
        
        print(f"Generating audio for: '{text}'")
        communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
        await communicate.save(audio_file)
        
        if os.path.exists(audio_file):
            size = os.path.getsize(audio_file)
            print(f"✅ Audio file created: {audio_file}")
            print(f"   Size: {size} bytes")
            return True
        else:
            print("❌ Audio file was not created")
            return False
    except Exception as e:
        print(f"❌ Error generating audio: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_mp3_to_wav():
    """Test MP3 to WAV conversion."""
    try:
        from pydub import AudioSegment
        print("✅ pydub imported successfully")
    except ImportError:
        print("⚠️  pydub not installed. Install with: pip install pydub")
        print("   (MP3 files should still work, but WAV is preferred)")
        return False
    
    try:
        mp3_file = "/tmp/test_audio.mp3"
        wav_file = "/tmp/test_audio.wav"
        
        if not os.path.exists(mp3_file):
            print("⚠️  MP3 file not found, generating it first...")
            await test_edge_tts()
        
        print(f"Converting {mp3_file} to {wav_file}...")
        audio = AudioSegment.from_mp3(mp3_file)
        audio.export(wav_file, format="wav")
        
        if os.path.exists(wav_file):
            size = os.path.getsize(wav_file)
            print(f"✅ WAV file created: {wav_file}")
            print(f"   Size: {size} bytes")
            return True
        else:
            print("❌ WAV file was not created")
            return False
    except Exception as e:
        print(f"❌ Error converting audio: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all audio tests."""
    print("=" * 60)
    print("Audio Generation Test")
    print("=" * 60)
    print()
    
    print("Step 1: Testing edge-tts...")
    tts_ok = await test_edge_tts()
    print()
    
    if tts_ok:
        print("Step 2: Testing MP3 to WAV conversion...")
        conversion_ok = await test_mp3_to_wav()
        print()
    
    print("=" * 60)
    if tts_ok:
        print("✅ Audio generation is working!")
        print("   The agent should be able to generate audio files.")
    else:
        print("❌ Audio generation failed")
        print("   Install dependencies: pip install edge-tts pydub")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

