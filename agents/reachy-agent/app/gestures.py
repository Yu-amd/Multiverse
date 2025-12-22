"""
Gesture library for Reachy Mini robot.
Provides predefined gesture sequences for task feedback using the official SDK.
"""
import sys
import asyncio
from pathlib import Path
from typing import Optional, Any

# Add common framework to path
common_path = Path(__file__).parent.parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

from app.observability import StructuredLogger

logger = StructuredLogger(__name__)


class GestureController:
    """
    Controller for Reachy Mini gestures.
    
    Uses the official reachy_mini SDK for real hardware control.
    Reference: https://github.com/pollen-robotics/reachy_mini
    """
    
    def __init__(self, driver: Optional[Any] = None):
        """
        Initialize gesture controller.
        
        Args:
            driver: Reachy driver instance (None for mocked mode)
        """
        self.driver = driver
        self.is_mocked = driver is None or driver.mocked if driver else True
    
    def _get_robot(self):
        """
        Get the ReachyMini robot instance from driver.
        
        Returns None if robot is not available (mocked, not connected, or connection failed).
        Will attempt connection if not connected, but respects retry cooldown.
        """
        if self.is_mocked or not self.driver:
            return None
        
        # If already connected, return robot immediately
        if self.driver.is_connected():
            return self.driver.get_robot()
        
        # Try to connect (respects cooldown period)
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If event loop is running, schedule connection attempt
                # But don't wait - return None immediately
                # Connection will happen in background for next gesture
                asyncio.create_task(self.driver.connect())
                return None
            else:
                # Event loop not running, can block
                loop.run_until_complete(self.driver.connect())
                if self.driver.is_connected():
                    return self.driver.get_robot()
                return None
        except Exception as e:
            # Connection failed, but error already logged by driver
            # Just return None silently
            return None
    
    async def ack_gesture(self) -> None:
        """
        Perform acknowledgment gesture.
        Indicates task was received and understood.
        Gesture: Quick nod of the head.
        """
        if self.is_mocked:
            logger.info("Gesture: ACK (mocked)", gesture="ack")
            await asyncio.sleep(0.5)  # Simulate gesture duration
            return
        
        # Real implementation using reachy_mini SDK
        try:
            robot = self._get_robot()
            if not robot:
                logger.warning("Robot not available for ACK gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Quick nod: look down slightly, then back up
            robot.goto_target(
                head=create_head_pose(z=-5, roll=0, degrees=True, mm=True),
                duration=0.2
            )
            await asyncio.sleep(0.1)
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.2
            )
            
            logger.info("Gesture: ACK", gesture="ack")
        except Exception as e:
            logger.error("Failed to execute ACK gesture", error=str(e), error_type=type(e).__name__)
    
    async def thinking_gesture(self) -> None:
        """
        Perform thinking gesture.
        Indicates processing is in progress.
        Gesture: Slow head movement side to side.
        """
        if self.is_mocked:
            logger.info("Gesture: THINKING (mocked)", gesture="thinking")
            await asyncio.sleep(1.0)  # Simulate longer gesture
            return
        
        # Real implementation: slow head movement
        try:
            robot = self._get_robot()
            if not robot:
                logger.warning("Robot not available for THINKING gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Slow side-to-side movement
            robot.goto_target(
                head=create_head_pose(z=0, roll=10, degrees=True, mm=True),
                duration=0.8
            )
            await asyncio.sleep(0.3)
            robot.goto_target(
                head=create_head_pose(z=0, roll=-10, degrees=True, mm=True),
                duration=0.8
            )
            await asyncio.sleep(0.3)
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            
            logger.info("Gesture: THINKING", gesture="thinking")
        except Exception as e:
            logger.error("Failed to execute THINKING gesture", error=str(e), error_type=type(e).__name__)
    
    async def done_gesture(self) -> None:
        """
        Perform done gesture.
        Indicates task completed successfully.
        Gesture: Nod head up and return to neutral.
        """
        if self.is_mocked:
            logger.info("Gesture: DONE (mocked)", gesture="done")
            await asyncio.sleep(0.8)
            return
        
        # Real implementation: nod head up
        try:
            robot = self._get_robot()
            if not robot:
                logger.warning("Robot not available for DONE gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Nod up (positive z)
            robot.goto_target(
                head=create_head_pose(z=10, roll=0, degrees=True, mm=True),
                duration=0.4
            )
            await asyncio.sleep(0.2)
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.4
            )
            
            logger.info("Gesture: DONE", gesture="done")
        except Exception as e:
            logger.error("Failed to execute DONE gesture", error=str(e), error_type=type(e).__name__)
    
    async def error_gesture(self) -> None:
        """
        Perform error gesture.
        Indicates task failed or error occurred.
        Gesture: Shake head side to side.
        """
        if self.is_mocked:
            logger.info("Gesture: ERROR (mocked)", gesture="error")
            await asyncio.sleep(0.6)
            return
        
        # Real implementation: shake head
        try:
            robot = self._get_robot()
            if not robot:
                logger.warning("Robot not available for ERROR gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Shake head side to side
            for _ in range(2):
                robot.goto_target(
                    head=create_head_pose(z=0, roll=15, degrees=True, mm=True),
                    duration=0.2
                )
                await asyncio.sleep(0.1)
                robot.goto_target(
                    head=create_head_pose(z=0, roll=-15, degrees=True, mm=True),
                    duration=0.2
                )
                await asyncio.sleep(0.1)
            
            # Return to neutral
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.3
            )
            
            logger.info("Gesture: ERROR", gesture="error")
        except Exception as e:
            logger.error("Failed to execute ERROR gesture", error=str(e), error_type=type(e).__name__)
    
    async def return_to_rest(self) -> None:
        """
        Return robot to rest position.
        """
        if self.is_mocked:
            logger.info("Gesture: REST (mocked)", gesture="rest")
            return
        
        try:
            robot = self._get_robot()
            if not robot:
                logger.warning("Robot not available for REST gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Move to neutral/rest position
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            
            logger.info("Gesture: REST", gesture="rest")
        except Exception as e:
            logger.error("Failed to return to rest", error=str(e), error_type=type(e).__name__)

