"""
Audio/text-to-speech functionality for Reachy Mini.
Converts AI responses to speech and plays through robot's speaker.
"""
import sys
import os
import asyncio
import tempfile
from pathlib import Path
from typing import Optional

# Add common framework to path
common_path = Path(__file__).parent.parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

from app.observability import StructuredLogger

logger = StructuredLogger(__name__)


class AudioController:
    """
    Controller for Reachy Mini audio/text-to-speech.
    
    Converts text to speech and plays through robot's speaker.
    """
    
    def __init__(self, robot=None):
        """
        Initialize audio controller.
        
        Args:
            robot: ReachyMini instance (None for mocked mode)
        """
        self.robot = robot
        self.is_mocked = robot is None
        self._temp_dir = None
        
        if not self.is_mocked:
            self._temp_dir = tempfile.mkdtemp(prefix="reachy_audio_")
            logger.info("Audio controller initialized for real hardware")
        else:
            logger.info("Audio controller initialized in MOCKED mode")
    
    async def speak(self, text: str) -> bool:
        """
        Convert text to speech and play through robot's speaker.
        
        Args:
            text: Text to speak
            
        Returns:
            True if successful, False otherwise
        """
        # Check if we should use mocked mode
        # Update is_mocked based on current robot state
        if self.robot is None:
            self.is_mocked = True
        
        # Ensure temp directory exists if we have a robot
        if self.robot and self._temp_dir is None:
            self._temp_dir = tempfile.mkdtemp(prefix="reachy_audio_")
            logger.debug("Created temp directory for audio", temp_dir=self._temp_dir)
        
        if self.is_mocked or not self.robot:
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
            
            logger.info("Audio: Playing sound through robot speaker", file=audio_file)
            
            # ALSA direct is more reliable for device routing - SDK falls back to default device
            # Always prefer ALSA direct to ensure audio goes to robot speaker, not monitor
            use_alsa_direct = os.getenv("REACHY_USE_ALSA_DIRECT", "true").lower() in ("true", "1", "yes", "on")
            
            # SDK method often routes to wrong device (monitor) when it can't find Reachy device
            # Only use SDK if ALSA direct is explicitly disabled AND robot is connected
            use_sdk_method = not use_alsa_direct and self.robot is not None and hasattr(self.robot, 'media') and hasattr(self.robot.media, 'play_sound')
            
            logger.info("Audio playback check", robot_available=self.robot is not None, has_media=hasattr(self.robot, 'media') if self.robot else False, has_play_sound=hasattr(self.robot.media, 'play_sound') if self.robot and hasattr(self.robot, 'media') else False, use_sdk_method=use_sdk_method, use_alsa_direct=use_alsa_direct, is_mocked=self.is_mocked)
            
            # If robot is not connected, we can still try ALSA direct
            # The robot speaker should work via ALSA even if SDK connection failed
            
            if use_sdk_method:
                logger.info("Using SDK play_sound method (robot connected)")
                try:
                    loop = asyncio.get_event_loop()
                    
                    # Try to configure SDK to use correct audio device
                    # SoundDevice shows Reachy Mini Audio with 0 channels, so SDK can't find it
                    # We need to force it to use device ID 6 (Reachy Mini Audio)
                    try:
                        if hasattr(self.robot.media, 'audio'):
                            audio_backend = type(self.robot.media.audio).__name__
                            logger.debug("Audio backend type", backend=audio_backend)
                            
                            # For SoundDevice backend, try to set device ID 6 (Reachy Mini Audio)
                            if 'SoundDevice' in audio_backend:
                                import sounddevice as sd
                                # Device ID 6 is Reachy Mini Audio (even though it shows 0 channels)
                                reachy_device_id = 6
                                try:
                                    # Try to set the device ID before starting stream
                                    if hasattr(self.robot.media.audio, '_output_device_id'):
                                        self.robot.media.audio._output_device_id = reachy_device_id
                                        logger.info("Forced SDK to use Reachy Mini Audio device", device_id=reachy_device_id)
                                except Exception as e:
                                    logger.debug("Could not set audio device ID (may be read-only)", error=str(e))
                    except Exception as e:
                        logger.debug("Could not configure audio device", error=str(e))
                    
                    # Ensure audio output stream is started (SoundDevice backend needs this)
                    if hasattr(self.robot.media, 'audio') and hasattr(self.robot.media.audio, 'start_playing'):
                        try:
                            if not hasattr(self.robot.media.audio, '_output_stream') or self.robot.media.audio._output_stream is None:
                                logger.debug("Starting audio output stream")
                                self.robot.media.audio.start_playing()
                        except Exception as e:
                            logger.debug("Could not start audio stream (may already be started)", error=str(e))
                    
                    # Play the audio file using SDK
                    logger.debug("Calling robot.media.play_sound", file=audio_file, robot_type=type(self.robot).__name__)
                    
                    # Call play_sound in executor to avoid blocking
                    try:
                        await loop.run_in_executor(None, self.robot.media.play_sound, audio_file)
                        
                        # Wait for playback to complete (estimate based on file size)
                        file_size_kb = os.path.getsize(audio_file) / 1024
                        wait_time = max(2.0, file_size_kb / 16.0)  # Increased wait time
                        logger.debug("Waiting for audio playback to complete", wait_time=wait_time, file_size_kb=file_size_kb)
                        await asyncio.sleep(wait_time)
                        
                        logger.info("Audio: Successfully played via SDK", text_preview=text[:50] + "..." if len(text) > 50 else text)
                        return True
                    except Exception as play_error:
                        logger.error("play_sound call failed", error=str(play_error), error_type=type(play_error).__name__)
                        raise  # Re-raise to trigger fallback
                except Exception as e:
                    logger.warning("SDK play_sound failed, falling back to ALSA", error=str(e), error_type=type(e).__name__)
                    # Fall through to ALSA method
            
            # Use ALSA directly (preferred method to ensure correct device routing)
            if use_alsa_direct:
                # First, try to stop any SDK audio streams that might be holding the device
                try:
                    if self.robot and hasattr(self.robot, 'media') and hasattr(self.robot.media, 'audio') and hasattr(self.robot.media.audio, 'stop_playing'):
                        try:
                            logger.debug("Stopping SDK audio stream to release device for ALSA")
                            self.robot.media.audio.stop_playing()
                            await asyncio.sleep(1.0)  # Give it more time to release
                            logger.debug("Stopped SDK audio stream before ALSA playback")
                        except Exception as e:
                            logger.debug("Could not stop SDK audio stream (may not be started)", error=str(e))
                except Exception:
                    pass  # Ignore if audio object doesn't exist
                
                # Try multiple ALSA device names in order of preference
                # Use plughw first as it handles format conversion and may allow sharing
                alsa_devices = ["plughw:4,0", "reachymini_audio_sink", "hw:4,0"]
                
                for device in alsa_devices:
                    try:
                        import subprocess
                        logger.info("Using ALSA directly for audio playback", device=device)
                        
                        # Use aplay with ALSA device name (ensures correct routing)
                        result = await asyncio.create_subprocess_exec(
                            "aplay", "-D", device, audio_file,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=30.0)
                        
                        if result.returncode == 0:
                            logger.info("Audio: Successfully played via ALSA", device=device, text_preview=text[:50] + "..." if len(text) > 50 else text)
                            return True
                        else:
                            error_msg = stderr.decode() if stderr else "Unknown error"
                            logger.debug(f"ALSA device {device} failed", error=error_msg)
                            # Try next device
                            continue
                    except FileNotFoundError:
                        logger.warning("aplay command not found")
                        break  # Can't try other devices if aplay doesn't exist
                    except asyncio.TimeoutError:
                        logger.error("Audio playback timed out")
                        return False
                    except Exception as e:
                        logger.debug(f"ALSA device {device} failed with exception", error=str(e))
                        continue  # Try next device
                
                # All ALSA devices failed
                logger.error("All audio playback methods failed")
                return False
            
            # No audio method available
            logger.error("No audio playback method available", robot_available=self.robot is not None, has_media=hasattr(self.robot, 'media') if self.robot else False)
            return False
            
            # Wait for playback to complete
            file_size_kb = os.path.getsize(audio_file) / 1024
            wait_time = max(1.0, file_size_kb / 16.0)
            await asyncio.sleep(wait_time)
            
            logger.info("Audio: Successfully played text", text_preview=text[:50] + "..." if len(text) > 50 else text)
            return True
                
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
        Convert text to speech audio file.
        
        Reachy Mini's SoundDevice backend prefers WAV files, so we convert MP3 to WAV.
        
        Args:
            text: Text to convert
            
        Returns:
            Path to audio file (WAV format), or None if failed
        """
        # Ensure temp directory exists (may not be set if robot was None at init)
        if self._temp_dir is None:
            self._temp_dir = tempfile.mkdtemp(prefix="reachy_audio_")
            logger.debug("Created temp directory for audio in _text_to_speech", temp_dir=self._temp_dir)
        
        try:
            # Try edge-tts first (better quality, free, no API key needed)
            try:
                import edge_tts
                
                mp3_file = os.path.join(self._temp_dir, "speech.mp3")
                wav_file = os.path.join(self._temp_dir, "speech.wav")
                
                # Generate speech asynchronously (MP3 format)
                communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
                await communicate.save(mp3_file)
                
                logger.debug("Generated MP3 audio using edge-tts", file=mp3_file)
                
                # Convert MP3 to WAV (Reachy Mini SoundDevice prefers WAV)
                # Also convert to stereo (2 channels) as ALSA config expects 2 channels
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_mp3(mp3_file)
                    
                    # Convert to stereo if mono (ALSA config expects 2 channels)
                    if audio.channels == 1:
                        logger.debug("Converting mono to stereo for ALSA compatibility")
                        audio = audio.set_channels(2)
                    
                    # Set sample rate to 16000 Hz (matches ALSA config)
                    if audio.frame_rate != 16000:
                        logger.debug(f"Resampling from {audio.frame_rate} Hz to 16000 Hz")
                        audio = audio.set_frame_rate(16000)
                    
                    audio.export(wav_file, format="wav")
                    logger.debug("Converted MP3 to WAV (stereo, 16kHz)", wav_file=wav_file, channels=audio.channels, rate=audio.frame_rate)
                    return wav_file
                except ImportError:
                    logger.warning("pydub not installed, trying MP3 directly. Install: pip install pydub")
                    # Try MP3 anyway - GStreamer backend might support it
                    return mp3_file
                except Exception as e:
                    logger.warning("Failed to convert MP3 to WAV, using MP3", error=str(e))
                    return mp3_file
                
            except ImportError:
                # Fallback to gTTS (requires internet)
                try:
                    from gtts import gTTS
                    
                    mp3_file = os.path.join(self._temp_dir, "speech.mp3")
                    wav_file = os.path.join(self._temp_dir, "speech.wav")
                    
                    # Generate speech (MP3 format)
                    tts = gTTS(text=text, lang='en', slow=False)
                    tts.save(mp3_file)
                    
                    logger.debug("Generated MP3 audio using gTTS", file=mp3_file)
                    
                    # Convert MP3 to WAV (stereo, 16kHz for ALSA compatibility)
                    try:
                        from pydub import AudioSegment
                        audio = AudioSegment.from_mp3(mp3_file)
                        
                        # Convert to stereo if mono
                        if audio.channels == 1:
                            audio = audio.set_channels(2)
                        
                        # Set sample rate to 16000 Hz
                        if audio.frame_rate != 16000:
                            audio = audio.set_frame_rate(16000)
                        
                        audio.export(wav_file, format="wav")
                        logger.debug("Converted MP3 to WAV (stereo, 16kHz)", wav_file=wav_file)
                        return wav_file
                    except ImportError:
                        logger.warning("pydub not installed, trying MP3 directly")
                        return mp3_file
                    except Exception as e:
                        logger.warning("Failed to convert MP3 to WAV, using MP3", error=str(e))
                        return mp3_file
                    
                except ImportError:
                    logger.warning("No TTS library available. Install: pip install edge-tts or pip install gtts")
                    return None
                    
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

