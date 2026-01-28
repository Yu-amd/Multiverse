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
    
    async def _get_robot(self):
        """
        Get the ReachyMini robot instance from driver.
        
        Returns None if robot is not available (mocked, not connected, or connection failed).
        Will attempt connection if not connected, but respects retry cooldown.
        """
        if self.is_mocked or not self.driver:
            logger.debug("Gesture controller is mocked or driver is None", is_mocked=self.is_mocked, driver_available=self.driver is not None)
            return None
        
        # If already connected, return robot immediately
        if self.driver.is_connected():
            robot = self.driver.get_robot()
            logger.debug("Driver already connected, returning robot", robot_available=robot is not None)
            return robot
        
        # Try to connect (respects cooldown period)
        try:
            logger.debug("Driver not connected, attempting connection...", driver_mocked=self.driver.mocked)
            connected = await self.driver.connect(force=True)  # Force connection attempt
            if connected and self.driver.is_connected():
                robot = self.driver.get_robot()
                logger.info("Successfully got robot for gesture", robot_available=robot is not None, robot_type=type(robot).__name__ if robot else None)
                return robot
            else:
                logger.warning("Connection attempt returned success but driver not connected", connected=connected, driver_connected=self.driver.is_connected())
                return None
        except Exception as e:
            # Connection failed, but error already logged by driver
            logger.error("Exception getting robot for gesture", error=str(e), error_type=type(e).__name__)
            return None
    
    async def ack_gesture(self) -> None:
        """
        Perform acknowledgment gesture.
        Indicates task was received and understood.
        Gesture: Quick nod of the head.
        """
        print(f"🔵🔵🔵 ack_gesture() called - is_mocked={self.is_mocked}, driver_available={self.driver is not None}", flush=True)
        if self.is_mocked:
            print(f"🔵⚠️ ACK gesture is MOCKED - will simulate", flush=True)
            logger.info("Gesture: ACK (mocked)", gesture="ack")
            await asyncio.sleep(0.5)  # Simulate gesture duration
            return
        
        # Real implementation using reachy_mini SDK
        try:
            logger.debug("Getting robot for ACK gesture", driver_available=self.driver is not None, driver_mocked=self.driver.mocked if self.driver else None)
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for ACK gesture", driver_available=self.driver is not None, driver_connected=self.driver.is_connected() if self.driver else False)
                return
            
            logger.info("Robot obtained for ACK gesture", robot_type=type(robot).__name__, has_head=hasattr(robot, 'head'), has_goto_target=hasattr(robot, 'goto_target'))
            from reachy_mini.utils import create_head_pose
            
            # Quick nod: look down more noticeably, then back up
            # Use a larger movement for better visibility on hardware.
            logger.debug("Executing ACK gesture movement", z=-35)
            robot.goto_target(
                head=create_head_pose(z=-35, roll=0, degrees=True, mm=True),
                duration=0.6
            )
            logger.debug("ACK gesture movement command sent, waiting...")
            await asyncio.sleep(0.7)  # Wait for movement to complete
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.6
            )
            await asyncio.sleep(0.5)  # Wait for return movement
            
            logger.info("Gesture: ACK completed", gesture="ack")
        except Exception as e:
            logger.error("Failed to execute ACK gesture", error=str(e), error_type=type(e).__name__, traceback=str(e.__traceback__) if hasattr(e, '__traceback__') else None)
    
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
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for THINKING gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Slow side-to-side movement - make it more noticeable
            robot.goto_target(
                head=create_head_pose(z=0, roll=20, degrees=True, mm=True),
                duration=1.0
            )
            await asyncio.sleep(0.5)  # Wait for movement
            robot.goto_target(
                head=create_head_pose(z=0, roll=-20, degrees=True, mm=True),
                duration=1.0
            )
            await asyncio.sleep(0.5)  # Wait for movement
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.6
            )
            await asyncio.sleep(0.4)  # Wait for return
            
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
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for DONE gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Nod up (positive z) - make it more noticeable
            robot.goto_target(
                head=create_head_pose(z=20, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            await asyncio.sleep(0.4)  # Wait for movement
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            await asyncio.sleep(0.4)  # Wait for return
            
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
            robot = await self._get_robot()
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
        print(f"🔵🔵🔵 return_to_rest() called - is_mocked={self.is_mocked}, driver_available={self.driver is not None}", flush=True)
        if self.is_mocked:
            print(f"🔵⚠️ REST gesture is MOCKED - will simulate", flush=True)
            logger.info("Gesture: REST (mocked)", gesture="rest")
            return
        
        try:
            print(f"🔵 Getting robot for REST gesture...", flush=True)
            robot = await self._get_robot()
            if not robot:
                print(f"🔵❌ Robot not available for REST gesture", flush=True)
                logger.warning("Robot not available for REST gesture", driver_available=self.driver is not None, driver_connected=self.driver.is_connected() if self.driver else False)
                return
            
            print(f"🔵 Robot obtained for REST gesture, moving to rest position...", flush=True)
            from reachy_mini.utils import create_head_pose
            
            # Make reset more visible - move head slightly first, then to rest
            # This ensures we can see the movement
            print(f"🔵 Moving head to visible position first...", flush=True)
            robot.goto_target(
                head=create_head_pose(z=-10, roll=0, degrees=True, mm=True),
                duration=0.4
            )
            await asyncio.sleep(0.5)
            
            # Now move to neutral/rest position
            print(f"🔵 Moving head to rest position...", flush=True)
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            
            # Wait for movement to complete
            await asyncio.sleep(0.6)
            
            print(f"🔵✅ REST gesture completed", flush=True)
            logger.info("Gesture: REST", gesture="rest")
        except Exception as e:
            print(f"🔵❌ Failed to return to rest: {str(e)}", flush=True)
            import traceback
            print(f"🔵❌ REST traceback: {traceback.format_exc()}", flush=True)
            logger.error("Failed to return to rest", error=str(e), error_type=type(e).__name__, traceback=traceback.format_exc())

    async def wake_up_gesture(self) -> None:
        """
        Perform a wake-up gesture when the robot first connects.
        Gesture: a visible head dip + gentle roll, returning to neutral.
        """
        print(f"🔵🔵🔵 wake_up_gesture() called - is_mocked={self.is_mocked}, driver_available={self.driver is not None}", flush=True)
        if self.is_mocked:
            print("🔵⚠️ WAKE gesture is MOCKED - will simulate", flush=True)
            logger.info("Gesture: WAKE (mocked)", gesture="wake")
            await asyncio.sleep(0.6)
            return
        
        try:
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for WAKE gesture", driver_available=self.driver is not None, driver_connected=self.driver.is_connected() if self.driver else False)
                return
            
            if hasattr(robot, "wake_up"):
                # Make sure motors are enabled before wake sequence.
                try:
                    robot.enable_motors()
                except Exception:
                    pass
                robot.wake_up()
                # Ensure antennas are fully upright after wake.
                try:
                    from reachy_mini.reachy_mini import INIT_HEAD_POSE
                    robot.goto_target(INIT_HEAD_POSE, antennas=[0.0, 0.0], duration=1.2)
                except Exception:
                    robot.goto_target(antennas=[0.0, 0.0], duration=1.0)
                try:
                    robot.set_target_antenna_joint_positions([0.0, 0.0])
                except Exception:
                    pass
                await asyncio.sleep(0.9)
                logger.info("Gesture: WAKE (wake_up + antennas_up)", gesture="wake")
                return
            
            from reachy_mini.utils import create_head_pose
            
            # Dip down a bit, roll left/right, then return to neutral
            robot.goto_target(
                head=create_head_pose(z=-20, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            await asyncio.sleep(0.6)
            robot.goto_target(
                head=create_head_pose(z=-10, roll=15, degrees=True, mm=True),
                duration=0.5
            )
            await asyncio.sleep(0.5)
            robot.goto_target(
                head=create_head_pose(z=-10, roll=-15, degrees=True, mm=True),
                duration=0.5
            )
            await asyncio.sleep(0.5)
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.6
            )
            await asyncio.sleep(0.6)
            try:
                robot.set_target_antenna_joint_positions([0.0, 0.0])
            except Exception:
                pass
            await asyncio.sleep(0.4)
            logger.info("Gesture: WAKE (fallback)", gesture="wake")
        except Exception as e:
            logger.error("Failed to execute WAKE gesture", error=str(e), error_type=type(e).__name__)

    async def speaking_start_gesture(self) -> None:
        """Tilt head slightly to indicate speech has started."""
        if self.is_mocked:
            logger.info("Gesture: SPEAK_START (mocked)", gesture="speak_start")
            await asyncio.sleep(0.2)
            return
        
        try:
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for SPEAK_START gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            robot.goto_target(
                head=create_head_pose(z=-8, roll=12, degrees=True, mm=True),
                duration=0.4
            )
            await asyncio.sleep(0.4)
            logger.info("Gesture: SPEAK_START", gesture="speak_start")
        except Exception as e:
            logger.error("Failed to execute SPEAK_START gesture", error=str(e), error_type=type(e).__name__)

    async def raise_antennas(self) -> None:
        """Raise antennas to signal a response is ready."""
        if self.is_mocked:
            logger.info("Gesture: ANTENNAS_UP (mocked)", gesture="antennas_up")
            await asyncio.sleep(0.2)
            return
        
        try:
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for ANTENNAS_UP gesture")
                return
            try:
                robot.enable_motors()
            except Exception:
                pass
            robot.set_target_antenna_joint_positions([0.0, 0.0])
            await asyncio.sleep(0.5)
            logger.info("Gesture: ANTENNAS_UP", gesture="antennas_up")
        except Exception as e:
            logger.error("Failed to execute ANTENNAS_UP gesture", error=str(e), error_type=type(e).__name__)

    async def antenna_swing(self) -> None:
        """Simple antenna swing gesture (up then back) for minimal motion."""
        if self.is_mocked:
            logger.info("Gesture: ANTENNA_SWING (mocked)", gesture="antenna_swing")
            await asyncio.sleep(0.4)
            return
        
        try:
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for ANTENNA_SWING gesture")
                return
            try:
                robot.enable_motors()
            except Exception:
                pass
            robot.set_target_antenna_joint_positions([0.0, 0.0])
            await asyncio.sleep(0.5)
            robot.set_target_antenna_joint_positions([-0.6, 0.6])
            await asyncio.sleep(0.5)
            robot.set_target_antenna_joint_positions([0.0, 0.0])
            await asyncio.sleep(0.4)
            logger.info("Gesture: ANTENNA_SWING", gesture="antenna_swing")
        except Exception as e:
            logger.error("Failed to execute ANTENNA_SWING gesture", error=str(e), error_type=type(e).__name__)

    async def speaking_end_gesture(self) -> None:
        """Return head to neutral after speech completes."""
        if self.is_mocked:
            logger.info("Gesture: SPEAK_END (mocked)", gesture="speak_end")
            await asyncio.sleep(0.2)
            return
        
        try:
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for SPEAK_END gesture")
                return
            
            from reachy_mini.utils import create_head_pose
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.5
            )
            await asyncio.sleep(0.5)
            logger.info("Gesture: SPEAK_END", gesture="speak_end")
        except Exception as e:
            logger.error("Failed to execute SPEAK_END gesture", error=str(e), error_type=type(e).__name__)

    async def sleep_gesture(self) -> None:
        """Put the robot back to a calm rest pose when hardware is turned off."""
        if self.is_mocked:
            logger.info("Gesture: SLEEP (mocked)", gesture="sleep")
            await asyncio.sleep(0.4)
            return
        
        try:
            robot = await self._get_robot()
            if not robot:
                logger.warning("Robot not available for SLEEP gesture")
                return
            if hasattr(robot, "goto_sleep"):
                robot.goto_sleep()
                logger.info("Gesture: SLEEP (goto_sleep)", gesture="sleep")
                return
            
            from reachy_mini.utils import create_head_pose
            # Fallback: slow, gentle dip to indicate sleep/standby.
            robot.goto_target(
                head=create_head_pose(z=-18, roll=0, degrees=True, mm=True),
                duration=0.8
            )
            await asyncio.sleep(0.9)
            robot.goto_target(
                head=create_head_pose(z=0, roll=0, degrees=True, mm=True),
                duration=0.8
            )
            await asyncio.sleep(0.8)
            logger.info("Gesture: SLEEP (fallback)", gesture="sleep")
        except Exception as e:
            logger.error("Failed to execute SLEEP gesture", error=str(e), error_type=type(e).__name__)

