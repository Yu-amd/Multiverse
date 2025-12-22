#!/usr/bin/env python3
"""Test which audio device Reachy Mini SDK is using."""
import sounddevice as sd
from reachy_mini import ReachyMini

print("=" * 60)
print("Reachy Mini Audio Device Test")
print("=" * 60)
print()

# List all audio devices
print("Available audio devices:")
devices = sd.query_devices()
for i, dev in enumerate(devices):
    if "reachy" in dev["name"].lower() or "respeaker" in dev["name"].lower():
        print(f"  [{i}] {dev['name']}")
        print(f"      Output channels: {dev['max_output_channels']}")
        print(f"      Input channels: {dev['max_input_channels']}")
        print()

# Check default device
print("Default output device:")
default = sd.query_devices(None, "output")
print(f"  [{default['index']}] {default['name']}")
print()

# Connect to robot and check which device it's using
print("Connecting to Reachy Mini...")
try:
    robot = ReachyMini()
    
    if hasattr(robot, 'media') and hasattr(robot.media, 'audio'):
        audio = robot.media.audio
        
        if hasattr(audio, '_output_device_id'):
            device_id = audio._output_device_id
            device = sd.query_devices(device_id)
            print(f"✅ Robot is using audio device:")
            print(f"   Device ID: {device_id}")
            print(f"   Device name: {device['name']}")
            print()
            
            if "reachy" in device["name"].lower():
                print("✅ Correct device selected (Reachy Mini Audio)")
            else:
                print("⚠️  Wrong device selected!")
                print("   Audio will play from:", device['name'])
                print("   Should be: Reachy Mini Audio")
        else:
            print("⚠️  Could not determine audio device ID")
    else:
        print("❌ Robot media/audio not available")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)

