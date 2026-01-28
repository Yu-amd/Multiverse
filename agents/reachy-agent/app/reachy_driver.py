"""
Reachy Mini hardware driver.
Provides interface to Reachy Mini robot hardware using the official SDK.
"""
import sys
import os
import time
from pathlib import Path
from typing import Optional

# Add common framework to path
common_path = Path(__file__).parent.parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

from app.observability import StructuredLogger

logger = StructuredLogger(__name__)


class ReachyDriver:
    """
    Driver for Reachy Mini robot using the official reachy_mini SDK.
    
    In mocked mode, this provides a safe interface without hardware.
    For real hardware, connects via the reachy_mini SDK.
    
    Reference: https://github.com/pollen-robotics/reachy_mini
    """
    
    def __init__(self, mocked: bool = True, connection_string: Optional[str] = None):
        """
        Initialize Reachy driver.
        
        Args:
            mocked: If True, run in mocked mode (no hardware)
            connection_string: Optional connection string (not used with reachy_mini SDK)
        """
        self.mocked = mocked
        self.connection_string = connection_string
        self.connected = False
        self.robot = None  # Will hold ReachyMini instance when connected
        
        # Connection retry management
        self._last_connection_attempt = 0.0
        self._connection_retry_cooldown = 30.0  # Wait 30 seconds between retry attempts
        self._connection_failed = False  # Track if connection has failed
        
        if mocked:
            logger.info("Reachy driver initialized in MOCKED mode")
        else:
            logger.info("Reachy driver initialized for real hardware")
    
    async def connect(self, force: bool = False) -> bool:
        """
        Connect to Reachy hardware using reachy_mini SDK.
        
        Args:
            force: If True, force connection attempt even if recently failed
        
        Returns:
            True if connected successfully
        """
        if self.mocked:
            self.connected = True
            logger.info("Reachy driver connected (mocked)")
            return True
        
        # If already connected, return success
        if self.connected and self.robot is not None:
            return True
        
        # Check if we should retry (cooldown period)
        current_time = time.time()
        time_since_last_attempt = current_time - self._last_connection_attempt
        
        if self._connection_failed and not force:
            if time_since_last_attempt < self._connection_retry_cooldown:
                # Still in cooldown period, but log that we're skipping
                logger.debug(
                    "Skipping connection retry (cooldown)",
                    seconds_remaining=self._connection_retry_cooldown - time_since_last_attempt
                )
                return False
            # Cooldown expired, reset failure flag and retry
            logger.info("Connection cooldown expired, retrying...")
            self._connection_failed = False
        
        # Real implementation using reachy_mini SDK
        self._last_connection_attempt = current_time
        
        try:
            from reachy_mini import ReachyMini
            
            # ReachyMini() connects automatically when used as context manager
            # For our use case, we'll create it and connect explicitly
            logger.info("Attempting to connect to Reachy Mini hardware...")
            self.robot = ReachyMini()
            # Verify robot was created successfully
            if self.robot is None:
                raise RuntimeError("ReachyMini() returned None")
            self.connected = True
            self._connection_failed = False
            logger.info("Reachy driver connected to hardware successfully", 
                       robot_type=type(self.robot).__name__, 
                       robot_has_head=hasattr(self.robot, 'head') if self.robot else False,
                       robot_has_goto_target=hasattr(self.robot, 'goto_target') if self.robot else False,
                       robot_has_media=hasattr(self.robot, 'media') if self.robot else False)
            return True
        except ImportError:
            logger.error(
                "reachy_mini SDK not installed. Install with: pip install reachy_mini",
                error="ImportError",
                help="Run: pip install reachy_mini"
            )
            self._connection_failed = True
            return False
        except Exception as e:
            error_str = str(e)
            error_type = type(e).__name__
            
            # If we hit a timeout, try restarting the daemon/Zenoh once and retry.
            if "timeout" in error_str.lower():
                try:
                    from app.daemon_manager import ensure_daemon_running, wait_for_zenoh_ready
                    ensure_daemon_running()
                    wait_for_zenoh_ready(timeout=8.0)
                    self.robot = ReachyMini()
                    if self.robot is not None:
                        self.connected = True
                        self._connection_failed = False
                        logger.info("Reachy driver connected after daemon restart", robot_type=type(self.robot).__name__)
                        return True
                except Exception as retry_error:
                    logger.warning(
                        "Reachy driver retry after daemon restart failed",
                        error=str(retry_error),
                        error_type=type(retry_error).__name__,
                    )
            
            # Special handling for "Camera not found" - this is often non-fatal
            # The robot may still be accessible for gestures/audio via Zenoh
            if "Camera not found" in error_str or "camera" in error_str.lower():
                logger.warning(
                    "Camera not found during Reachy Mini connection",
                    error=error_str,
                    error_type=error_type,
                    note="Camera is required for full SDK initialization, but gestures/audio may still work. Will attempt to use robot without camera."
                )
                # Don't mark as failed - we'll try to use the robot anyway
                # The robot might still be accessible via Zenoh even if camera init failed
                self.connected = False
                self.robot = None
                self._connection_failed = False  # Don't block retries for camera errors
                return False
            
            # Provide helpful error messages based on error type
            if "zenoh" in error_str.lower() or "7447" in error_str or "ZError" in error_type:
                # Only log error on first failure or after cooldown
                if not self._connection_failed or force:
                    logger.error(
                        "Failed to connect to Reachy Mini hardware",
                        error=error_str,
                        error_type=error_type,
                        help="Reachy Mini not found. Check: 1) Robot is powered on, 2) USB connected (Lite) or on same network (Wireless), 3) Reachy service is running. Will retry in 30 seconds."
                    )
                else:
                    # Silently skip retry during cooldown
                    pass
            else:
                logger.error(
                    "Failed to connect to Reachy Mini hardware",
                    error=error_str,
                    error_type=error_type
                )
            
            self.connected = False
            self.robot = None
            self._connection_failed = True
            return False
    
    async def disconnect(self) -> None:
        """Disconnect from Reachy hardware."""
        if self.mocked:
            self.connected = False
            logger.info("Reachy driver disconnected (mocked)")
            return
        
        # Real implementation
        if self.robot:
            try:
                # ReachyMini uses context manager, but we can close it manually
                if hasattr(self.robot, 'close'):
                    self.robot.close()
                elif hasattr(self.robot, '__exit__'):
                    # If it's a context manager, we can't easily close it here
                    # The robot will be cleaned up when the driver is destroyed
                    pass
                self.connected = False
                logger.info("Reachy driver disconnected")
            except Exception as e:
                logger.error("Error disconnecting from Reachy", error=str(e))
    
    def is_connected(self) -> bool:
        """Check if driver is connected."""
        return self.connected and self.robot is not None
    
    def check_safety(self) -> bool:
        """
        Check safety conditions.
        
        Returns:
            True if safe to operate
        """
        if self.mocked:
            return True
        
        if not self.robot:
            return False
        
        # Real implementation: check if robot is responsive
        # The SDK handles safety internally, but we can add custom checks here
        try:
            # Basic check: see if we can access robot properties
            if hasattr(self.robot, 'head'):
                return True
            return False
        except Exception as e:
            logger.warning("Safety check failed", error=str(e))
            return False
    
    async def emergency_stop(self) -> None:
        """Trigger emergency stop."""
        if self.mocked:
            logger.warning("Emergency stop triggered (mocked)")
            return
        
        if not self.robot:
            logger.warning("Emergency stop called but robot not connected")
            return
        
        # Real implementation
        try:
            # Move to safe position (rest position)
            if hasattr(self.robot, 'goto_target'):
                from reachy_mini.utils import create_head_pose
                # Move head to neutral position
                self.robot.goto_target(
                    head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                    duration=0.5
                )
            logger.warning("Emergency stop triggered - robot moved to safe position")
        except Exception as e:
            logger.error("Error during emergency stop", error=str(e))
    
    def get_robot(self):
        """
        Get the ReachyMini robot instance.
        
        Returns:
            ReachyMini instance or None if not connected
        """
        if self.mocked:
            return None
        return self.robot

