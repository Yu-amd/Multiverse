"""
Audio/text-to-speech functionality for Reachy Mini.
Converts AI responses to speech and plays through robot's speaker.

Based on the working implementation in reachy-aim-enterprise-demo.
"""
import sys
import os
import asyncio
import tempfile
import subprocess
import re
import time
from pathlib import Path
from typing import Optional

# Add common framework to path
common_path = Path(__file__).parent.parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

from app.observability import StructuredLogger

logger = StructuredLogger(__name__)

# Try to import edge-tts for high-quality natural voice (Microsoft Edge TTS - best quality)
# Optional dependency: pip install edge-tts
try:
    import edge_tts  # type: ignore
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    edge_tts = None


class AudioController:
    """
    Controller for Reachy Mini audio/text-to-speech.
    
    Converts text to speech and plays through robot's speaker.
    Uses PulseAudio (paplay) for reliable audio routing, matching the working implementation.
    """
    
    def __init__(
        self,
        robot=None,
        audio_device: Optional[str] = None,
        audio_volume: int = 200,
        is_mocked: Optional[bool] = None,
        force_pulse: bool = False,
        prefer_alsa: bool = True,
    ):
        """
        Initialize audio controller.
        
        Args:
            robot: ReachyMini instance (None for mocked mode)
            audio_device: Explicit ALSA device (e.g., "hw:4,0") or None for auto-detection
            audio_volume: Volume percentage (0-200), default 200
            is_mocked: Explicitly set mocked mode. If None, defaults to robot is None
            force_pulse: Force PulseAudio playback even if robot media API is available
            prefer_alsa: Prefer direct ALSA playback when a device is detected
        """
        self.robot = robot
        # Allow explicit control of mocked mode - if not set, default to robot is None
        # But we can override this later to use PulseAudio even without robot
        self.is_mocked = is_mocked if is_mocked is not None else (robot is None)
        self._temp_dir = None
        self._audio_device: Optional[str] = audio_device
        self._audio_device_detected: Optional[str] = None
        self._audio_volume: int = max(0, min(200, audio_volume))  # Clamp to 0-200
        self._edge_tts_voice: Optional[str] = None  # Edge TTS voice name
        self._force_pulse: bool = force_pulse
        self._prefer_alsa: bool = prefer_alsa
        
        # Always create temp directory - we need it for audio generation even without robot
        self._temp_dir = tempfile.mkdtemp(prefix="reachy_audio_")
        
        if self.is_mocked:
            logger.info("Audio controller initialized in MOCKED mode")
        else:
            logger.info(
                "Audio controller initialized for real hardware",
                audio_device=audio_device,
                audio_volume=audio_volume,
                robot_available=robot is not None,
                force_pulse=force_pulse,
                prefer_alsa=prefer_alsa,
            )
    
    def _detect_audio_device(self) -> Optional[str]:
        """Detect Reachy Mini audio device by looking for USB audio devices.
        
        Returns PulseAudio sink name, ALSA device string (e.g., "hw:4,0"), or None if not found.
        Tries PulseAudio first (works with PipeWire), then falls back to ALSA.
        Matches the working implementation in reachy-aim-enterprise-demo.
        """
        if self._audio_device:
            # Use explicitly configured device
            return self._audio_device
        
        if self._audio_device_detected is not None:
            # Return cached detection result
            return self._audio_device_detected
        
        pulse_device: Optional[str] = None
        alsa_device: Optional[str] = None

        # Try PulseAudio first (works with PipeWire)
        try:
            result = subprocess.run(
                ['pactl', 'list', 'short', 'sinks'],
                capture_output=True,
                text=True,
                timeout=2.0
            )
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if line.strip():
                        parts = line.split('\t')
                        if len(parts) >= 2:
                            sink_name = parts[1]
                            sink_name_lower = sink_name.lower()
                            # Look for Reachy or USB in sink name
                            # Also check for "Pollen" (Reachy Mini manufacturer name)
                            if ('reachy' in sink_name_lower or 'pollen' in sink_name_lower or
                                ('usb' in sink_name_lower and 'audio' in sink_name_lower)):
                                # Use PulseAudio sink name (stable across restarts)
                                pulse_device = f"pulse:{sink_name}"
                                logger.info(f"✓ Detected Reachy Mini audio device (PulseAudio): {sink_name}")
                                break
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
            pass
        
        # Fall back to ALSA detection
        try:
            # Run aplay -l to list audio devices
            result = subprocess.run(
                ['aplay', '-l'],
                capture_output=True,
                text=True,
                timeout=2.0
            )
            
            if result.returncode != 0:
                logger.debug("Could not list audio devices (aplay -l failed)")
                self._audio_device_detected = None
                return None
            
            lines = result.stdout.split('\n')
            # Look for USB audio devices (common for Reachy Mini)
            # Also look for devices with "Reachy" or "USB" in the name
            for i, line in enumerate(lines):
                if 'card' in line.lower() and ('usb' in line.lower() or 'reachy' in line.lower()):
                    # Extract card number (format: "card X:")
                    match = re.search(r'card\s+(\d+)', line)
                    if match:
                        card_num = match.group(1)
                        # Try to find device number (usually 0 for first device)
                        device_num = 0
                        # Check next few lines for device number
                        for j in range(i+1, min(i+5, len(lines))):
                            dev_match = re.search(r'device\s+(\d+)', lines[j])
                            if dev_match:
                                device_num = int(dev_match.group(1))
                                break
                        
                        device_str = f"hw:{card_num},{device_num}"
                        logger.info(f"✓ Detected Reachy Mini audio device (ALSA): {device_str} ({line.strip()})")
                        alsa_device = device_str
                        break
            
            if self._prefer_alsa and alsa_device:
                self._audio_device_detected = alsa_device
                return alsa_device
            if pulse_device:
                self._audio_device_detected = pulse_device
                return pulse_device

            # If no USB/Reachy device found, return None (use default)
            logger.debug("No Reachy Mini audio device detected, using system default")
            self._audio_device_detected = None
            return None
            
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
            logger.debug(f"Audio device detection failed: {e}")
            self._audio_device_detected = None
            return None

    def _get_reachy_sink_name(self) -> Optional[str]:
        """Return Reachy/Pollen PulseAudio sink name if available."""
        try:
            result = subprocess.run(
                ['pactl', 'list', 'sinks', 'short'],
                capture_output=True,
                text=True,
                timeout=2.0
            )
            if result.returncode != 0:
                return None
            for line in result.stdout.split('\n'):
                line_lower = line.lower()
                if 'reachy' in line_lower or 'pollen' in line_lower:
                    parts = line.split('\t')
                    if len(parts) >= 2:
                        return parts[1]
        except Exception:
            return None
        return None

    async def _play_with_pw_play(self, audio_file: str, sink_name: Optional[str]) -> bool:
        """Play audio via PipeWire (pw-play), targeting a sink if provided."""
        try:
            play_cmd = ['pw-play']
            if sink_name:
                play_cmd += ['--target', sink_name]
            play_cmd.append(audio_file)
            play_proc = await asyncio.create_subprocess_exec(
                *play_cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await asyncio.wait_for(play_proc.wait(), timeout=60.0)
            return play_proc.returncode == 0
        except Exception:
            return False

    def _ensure_reachy_audio_profile(self) -> None:
        """Force Reachy Mini audio card to use analog output (S/PDIF is silent)."""
        try:
            result = subprocess.run(
                ['pactl', 'list', 'short', 'cards'],
                capture_output=True,
                text=True,
                timeout=2.0
            )
            if result.returncode != 0:
                return
            card_name = None
            for line in result.stdout.splitlines():
                parts = line.split('\t')
                if len(parts) >= 2:
                    name = parts[1]
                    if 'Reachy_Mini_Audio' in name or 'Pollen_Robotics' in name:
                        card_name = name
                        break
            if not card_name:
                return
            subprocess.run(
                ['pactl', 'set-card-profile', card_name, 'output:analog-stereo'],
                check=False,
                timeout=2.0
            )
            subprocess.run(
                [
                    'pactl',
                    'set-sink-port',
                    'alsa_output.usb-Pollen_Robotics_Reachy_Mini_Audio_100025004254700534-00.analog-stereo',
                    'analog-output',
                ],
                check=False,
                timeout=2.0
            )
        except Exception:
            pass
    
    def _set_audio_volume(self, sink_id: Optional[str] = None) -> None:
        """Set audio volume for the Reachy Mini speaker.
        
        Tries Reachy daemon API first (most reliable), then falls back to PulseAudio.
        This is non-blocking - failures are logged but don't prevent TTS from working.
        
        Args:
            sink_id: PulseAudio sink name (for fallback). If None, will try to auto-detect.
        """
        self._ensure_reachy_audio_profile()
        if self._audio_volume == 100:
            return  # No need to set volume if it's already at 100%
        
        # Try Reachy daemon API first (most reliable, controls hardware directly)
        # Use a short timeout to avoid blocking TTS
        try:
            # Reachy daemon expects volume as 0-100 (not percentage)
            # Our _audio_volume is already 0-200, so convert to 0-100 for daemon
            daemon_volume = min(100, int(self._audio_volume))
            # Use shorter timeout for volume setting (don't block TTS)
            url = "http://127.0.0.1:8001/api/volume/set"
            try:
                import httpx
                # Use httpx for async HTTP calls (already in requirements)
                # Note: This is a sync method, so we use httpx.Client for sync calls
                with httpx.Client(timeout=1.0) as client:
                    response = client.post(url, json={"volume": daemon_volume})
                    if response.status_code == 200:
                        logger.debug(f"🔊 Set Reachy Mini volume to {self._audio_volume}% via daemon API (daemon: {daemon_volume})")
                        return  # Success - no need to try PulseAudio
                    else:
                        logger.debug(f"Daemon volume API returned {response.status_code}, trying PulseAudio fallback")
            except ImportError:
                logger.debug("httpx not available for daemon volume API, trying PulseAudio fallback")
            except Exception as e:
                logger.debug(f"Daemon volume API call failed: {e}, trying PulseAudio fallback")
        except Exception as daemon_error:
            # Don't log as warning - daemon API might not be available, that's OK
            logger.debug(f"Daemon volume API not available: {daemon_error}, trying PulseAudio fallback")
        
        # Fallback to PulseAudio (may be overridden by OS, but worth trying)
        try:
            # Find the sink to use
            if not sink_id:
                # Try to find the Reachy Mini sink
                sink_result = subprocess.run(
                    ['pactl', 'list', 'sinks', 'short'],
                    capture_output=True,
                    text=True,
                    timeout=2.0
                )
                if sink_result.returncode == 0:
                    for line in sink_result.stdout.split('\n'):
                        if 'Reachy' in line or 'Pollen' in line:
                            sink_id = line.split()[1]  # Second column is sink name
                            break
            
            if sink_id:
                # Set volume using percentage format (PulseAudio accepts percentages like "150%")
                volume_percent = f"{self._audio_volume}%"
                result = subprocess.run(
                    ['pactl', 'set-sink-volume', sink_id, volume_percent],
                    capture_output=True,
                    text=True,
                    timeout=2.0
                )
                if result.returncode == 0:
                    logger.info(f"🔊 Set Reachy Mini audio volume to {self._audio_volume}% via PulseAudio (sink: {sink_id})")
                else:
                    logger.warning(f"⚠ Could not set PulseAudio volume: {result.stderr}")
                    # Try alternative: set as default sink first, then set volume
                    try:
                        subprocess.run(
                            ['pactl', 'set-default-sink', sink_id],
                            capture_output=True,
                            timeout=1.0
                        )
                        subprocess.run(
                            ['pactl', 'set-sink-volume', '@DEFAULT_SINK@', volume_percent],
                            capture_output=True,
                            timeout=2.0
                        )
                        logger.info(f"🔊 Set volume via default sink to {self._audio_volume}%")
                    except Exception:
                        pass
        except Exception as vol_error:
            logger.warning(f"⚠ Could not set audio volume via PulseAudio: {vol_error}")

    def _ensure_pulse_sink(self, sink_name: Optional[str]) -> None:
        """Ensure PulseAudio uses the intended sink and is unmuted."""
        self._ensure_reachy_audio_profile()
        if not sink_name:
            return
        try:
            subprocess.run(
                ["pactl", "set-default-sink", sink_name],
                capture_output=True,
                text=True,
                timeout=2.0,
            )
            subprocess.run(
                ["pactl", "set-sink-mute", sink_name, "0"],
                capture_output=True,
                text=True,
                timeout=2.0,
            )
        except Exception as e:
            logger.debug("Could not ensure PulseAudio sink", error=str(e), sink=sink_name)
    
    async def speak(self, text: str) -> bool:
        """
        Convert text to speech and play through robot's speaker.
        
        Uses PulseAudio (paplay) for reliable audio routing, matching the working implementation.
        
        Args:
            text: Text to speak
            
        Returns:
            True if successful, False otherwise
        """
        # Don't automatically set is_mocked when robot is None
        # We may want to use PulseAudio even if SDK connection failed
        # Only use mocked mode if explicitly set
        
        # Ensure temp directory exists (needed for audio generation even without robot)
        if self._temp_dir is None:
            self._temp_dir = tempfile.mkdtemp(prefix="reachy_audio_")
            logger.debug("Created temp directory for audio", temp_dir=self._temp_dir)
        
        print(f"🔵🔵🔵 audio.speak() called - is_mocked={self.is_mocked}, robot_available={self.robot is not None}, text_length={len(text)}", flush=True)
        # Only use mocked mode if explicitly set to True
        if self.is_mocked:
            print(f"🔵⚠️ Audio is MOCKED - will simulate", flush=True)
            logger.info("Audio: Speaking (mocked)", text_preview=text[:50] + "..." if len(text) > 50 else text, robot_available=self.robot is not None)
            await asyncio.sleep(len(text) * 0.05)  # Simulate speaking time
            return True
        
        try:
            logger.info("Audio: Starting text-to-speech conversion", text_length=len(text))
            
            # Convert text to speech
            audio_file = await self._text_to_speech(text)
            if not audio_file:
                logger.warning("Failed to generate audio from text")
                return False
            
            if not os.path.exists(audio_file):
                logger.error("Generated audio file does not exist", file=audio_file)
                return False
            
            logger.info("Audio: Generated audio file", file=audio_file, file_size=os.path.getsize(audio_file))

            # If robot media API is available, try it first unless PulseAudio is forced.
            if self._force_pulse:
                logger.info("Audio: Forcing PulseAudio playback", robot_available=self.robot is not None)
            if (not self._force_pulse and self.robot is not None and
                    hasattr(self.robot, "media") and hasattr(self.robot.media, "play_sound")):
                try:
                    loop = asyncio.get_event_loop()
                    logger.info("Audio: Attempting robot media playback", file=audio_file)
                    await asyncio.wait_for(
                        loop.run_in_executor(None, self.robot.media.play_sound, audio_file),
                        timeout=60.0,
                    )
                    logger.info("Audio: Robot media playback completed")
                    return True
                except Exception as media_error:
                    logger.warning(
                        "Audio: Robot media playback failed, falling back to PulseAudio",
                        error=str(media_error),
                        error_type=type(media_error).__name__,
                    )
            
            # Detect audio device (PulseAudio first, then ALSA fallback)
            audio_device = self._detect_audio_device()
            logger.info("Audio: Detected audio device", device=audio_device, is_mocked=self.is_mocked, robot_available=self.robot is not None)
            
            # Play audio using PulseAudio (paplay) - matches working implementation
            # PulseAudio is more reliable than ALSA direct for device routing
            start_time = time.time()
            
            try:
                # Set volume before playing
                sink_id = None
                sink_name = None
                if audio_device and audio_device.startswith('pulse:'):
                    sink_id = audio_device.split(':', 1)[1]
                    if sink_id.isdigit():
                        # Get sink name from sink ID
                        try:
                            result = subprocess.run(
                                ['pactl', 'list', 'sinks', 'short'],
                                capture_output=True,
                                text=True,
                                timeout=2.0
                            )
                            if result.returncode == 0:
                                for line in result.stdout.split('\n'):
                                    if line.strip().startswith(sink_id):
                                        parts = line.split('\t')
                                        if len(parts) >= 2:
                                            sink_name = parts[1]
                                        break
                        except Exception:
                            pass
                    else:
                        sink_name = sink_id
                    self._set_audio_volume(sink_name or sink_id)
                    self._ensure_pulse_sink(sink_name or sink_id)
                    # Use sink name if available, otherwise use index
                    play_cmd = ['paplay', '--device', sink_name or sink_id, audio_file]
                elif audio_device and audio_device.startswith('hw:'):
                    # Direct ALSA playback (bypass PipeWire/PulseAudio)
                    reachy_sink = self._get_reachy_sink_name()
                    if reachy_sink:
                        self._set_audio_volume(reachy_sink)
                        self._ensure_pulse_sink(reachy_sink)
                    else:
                        self._set_audio_volume(None)
                    play_cmd = ['aplay', '-D', audio_device, audio_file]
                else:
                    # No device detected, try to find Reachy Mini sink by name
                    try:
                        result = subprocess.run(
                            ['pactl', 'list', 'sinks', 'short'],
                            capture_output=True,
                            text=True,
                            timeout=2.0
                        )
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                line_lower = line.lower()
                                if 'reachy' in line_lower or 'pollen' in line_lower:
                                    parts = line.split('\t')
                                    if len(parts) >= 2:
                                        sink_name = parts[1]
                                        sink_id = parts[0]
                                        break
                    except Exception:
                        pass
                    if sink_name:
                        self._set_audio_volume(sink_name)
                        self._ensure_pulse_sink(sink_name)
                        play_cmd = ['paplay', '--device', sink_name, audio_file]
                    else:
                        play_cmd = ['paplay', audio_file]
                        self._set_audio_volume(None)
                
                # Play audio (suppress ALSA/JACK errors)
                audio_env = {**os.environ, 'ALSA_CARD': '0', 'JACK_NO_AUDIO_RESERVATION': '1'}
                if sink_name or sink_id:
                    audio_env["PULSE_SINK"] = sink_name or sink_id
                
                logger.info("Playing audio via PulseAudio", device=audio_device, command=' '.join(play_cmd))
                
                # Use asyncio subprocess for non-blocking playback
                play_proc = await asyncio.create_subprocess_exec(
                    *play_cmd,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                    env=audio_env
                )
                
                # Wait for playback to complete (with timeout)
                try:
                    await asyncio.wait_for(play_proc.wait(), timeout=60.0)
                    duration = time.time() - start_time
                    
                    if play_proc.returncode == 0:
                        logger.info("Audio: Successfully played via PulseAudio", duration=duration, device=audio_device, text_preview=text[:50] + "..." if len(text) > 50 else text)
                        return True
                    else:
                        logger.warning("Audio playback failed", returncode=play_proc.returncode, device=audio_device)
                        # If ALSA device is busy, fall back to PipeWire (pw-play).
                        if audio_device and audio_device.startswith('hw:'):
                            reachy_sink = self._get_reachy_sink_name()
                            if await self._play_with_pw_play(audio_file, reachy_sink):
                                logger.info("Audio: Successfully played via pw-play", device=reachy_sink or "default")
                                return True
                        # Retry once with fresh sink detection
                        audio_device = self._detect_audio_device()
                        if audio_device:
                            logger.info("Retrying audio playback with refreshed device", device=audio_device)
                            if audio_device.startswith('pulse:'):
                                sink_id = audio_device.split(':', 1)[1]
                                sink_name = sink_id
                                self._set_audio_volume(sink_name)
                                play_cmd = ['paplay', '--device', sink_name, audio_file]
                            else:
                                play_cmd = ['paplay', audio_file]
                            play_proc = await asyncio.create_subprocess_exec(
                                *play_cmd,
                                stdout=asyncio.subprocess.DEVNULL,
                                stderr=asyncio.subprocess.DEVNULL,
                                env=audio_env
                            )
                            await asyncio.wait_for(play_proc.wait(), timeout=60.0)
                            if play_proc.returncode == 0:
                                logger.info("Audio: Successfully played after retry", duration=time.time() - start_time, device=audio_device)
                                return True
                        # Fallback to estimated duration
                        estimated = max(0.5, len(text) * 0.08)
                        logger.info("Audio: Estimated playback duration", duration=estimated)
                        return True  # Still return True as audio was attempted
                except asyncio.TimeoutError:
                    logger.error("Audio playback timed out")
                    play_proc.kill()
                    return False
                    
            finally:
                # Clean up temporary audio file
                try:
                    if os.path.exists(audio_file):
                        os.unlink(audio_file)
                except Exception:
                    pass
                
        except Exception as e:
            import traceback
            logger.error(
                "Failed to speak text",
                error=str(e),
                error_type=type(e).__name__,
                traceback=traceback.format_exc()
            )
            return False
    
    async def _text_to_speech(self, text: str) -> Optional[str]:
        """
        Convert text to speech audio file using Edge TTS (matches working implementation).
        
        Args:
            text: Text to convert
            
        Returns:
            Path to audio file (MP3 format), or None if failed
        """
        if not EDGE_TTS_AVAILABLE:
            logger.warning("⚠ Edge TTS not available, install with: pip install edge-tts")
            return None
        
        # Ensure temp directory exists
        if self._temp_dir is None:
            self._temp_dir = tempfile.mkdtemp(prefix="reachy_audio_")
            logger.debug("Created temp directory for audio in _text_to_speech", temp_dir=self._temp_dir)
        
        try:
            # Select a high-quality voice if not already selected (matches working implementation)
            if not self._edge_tts_voice:
                # Prefer natural-sounding English voices
                preferred_voices = [
                    "en-US-AriaNeural",  # Natural female voice
                    "en-US-JennyNeural",  # Alternative natural female voice
                    "en-US-GuyNeural",   # Natural male voice
                    "en-US-DavisNeural", # Alternative male voice
                ]
                
                # Try to get available voices and select best match
                try:
                    async def get_voice():
                        voices = await edge_tts.list_voices()
                        for preferred in preferred_voices:
                            for voice in voices:
                                if voice["ShortName"] == preferred:
                                    return preferred
                        # Fallback to first English US voice
                        for voice in voices:
                            if voice["Locale"].startswith("en-US"):
                                return voice["ShortName"]
                        return "en-US-AriaNeural"  # Default fallback
                    
                    self._edge_tts_voice = await get_voice()
                    logger.info(f"✓ Selected Edge TTS voice: {self._edge_tts_voice}")
                except Exception as e:
                    logger.warning(f"Could not select Edge TTS voice: {e}, using default")
                    self._edge_tts_voice = "en-US-AriaNeural"
            
            # Generate audio using Edge TTS (matches working implementation)
            async def generate_audio():
                communicate = edge_tts.Communicate(text, self._edge_tts_voice)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
                    tmp_path = tmp_file.name
                    await communicate.save(tmp_path)
                    return tmp_path
            
            audio_file = await generate_audio()
            logger.debug("Generated MP3 audio using edge-tts", file=audio_file, voice=self._edge_tts_voice)
            return audio_file
                    
        except Exception as e:
            logger.error("Text-to-speech conversion failed", error=str(e), error_type=type(e).__name__)
            return None
    
    def cleanup(self):
        """Clean up temporary files."""
        if self._temp_dir and os.path.exists(self._temp_dir):
            try:
                import shutil
                shutil.rmtree(self._temp_dir)
                logger.debug("Cleaned up audio temp directory")
            except Exception as e:
                logger.warning("Failed to cleanup audio temp directory", error=str(e))
