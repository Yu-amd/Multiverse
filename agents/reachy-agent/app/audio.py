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
            
            # Check robot and media availability
            if not hasattr(self.robot, 'media'):
                logger.error("Robot does not have 'media' attribute")
                return False
            
            if not hasattr(self.robot.media, 'play_sound'):
                logger.error("Robot media does not have 'play_sound' method")
                return False
            
            logger.info("Audio: Playing sound through robot speaker", file=audio_file)
            
            # Try using ALSA directly first (more reliable for device routing)
            # This bypasses SoundDevice backend which may route to wrong device
            use_alsa_direct = os.getenv("REACHY_USE_ALSA_DIRECT", "true").lower() in ("true", "1", "yes", "on")
            
            if use_alsa_direct:
                try:
                    import subprocess
                    logger.info("Using ALSA directly for audio playback", device="reachymini_audio_sink")
                    
                    # Use aplay with ALSA device name (ensures correct routing)
                    result = await asyncio.create_subprocess_exec(
                        "aplay", "-D", "reachymini_audio_sink", audio_file,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=30.0)
                    
                    if result.returncode == 0:
                        logger.info("Audio: Successfully played via ALSA", text_preview=text[:50] + "..." if len(text) > 50 else text)
                        return True
                    else:
                        error_msg = stderr.decode() if stderr else "Unknown error"
                        logger.warning("ALSA playback failed, falling back to SDK", error=error_msg)
                        # Fall through to SDK method
                except FileNotFoundError:
                    logger.warning("aplay command not found, using SDK method")
                    # Fall through to SDK method
                except asyncio.TimeoutError:
                    logger.error("Audio playback timed out")
                    return False
                except Exception as e:
                    logger.warning("ALSA direct playback failed, using SDK", error=str(e))
                    # Fall through to SDK method
            
            # Fallback: Use SDK's play_sound method
            loop = asyncio.get_event_loop()
            
            # Ensure audio output stream is started (SoundDevice backend needs this)
            if hasattr(self.robot.media, 'audio') and hasattr(self.robot.media.audio, 'start_playing'):
                try:
                    if not hasattr(self.robot.media.audio, '_output_stream') or self.robot.media.audio._output_stream is None:
                        logger.debug("Starting audio output stream")
                        self.robot.media.audio.start_playing()
                except Exception as e:
                    logger.warning("Could not start audio stream (may already be started)", error=str(e))
            
            # Play the audio file
            await loop.run_in_executor(None, self.robot.media.play_sound, audio_file)
            
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

