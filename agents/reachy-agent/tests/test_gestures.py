"""
Tests for gesture controller.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.gestures import GestureController


class TestGestureController:
    """Tests for gesture controller."""
    
    def test_gesture_controller_mocked(self):
        """Test gesture controller in mocked mode."""
        controller = GestureController(driver=None)
        assert controller.is_mocked is True
    
    def test_gesture_controller_with_driver(self):
        """Test gesture controller with driver."""
        mock_driver = MagicMock()
        controller = GestureController(driver=mock_driver)
        assert controller.is_mocked is False
        assert controller.driver == mock_driver
    
    @pytest.mark.asyncio
    async def test_ack_gesture_mocked(self):
        """Test ACK gesture in mocked mode."""
        controller = GestureController(driver=None)
        await controller.ack_gesture()
        # Should complete without error
    
    @pytest.mark.asyncio
    async def test_thinking_gesture_mocked(self):
        """Test THINKING gesture in mocked mode."""
        controller = GestureController(driver=None)
        await controller.thinking_gesture()
        # Should complete without error
    
    @pytest.mark.asyncio
    async def test_done_gesture_mocked(self):
        """Test DONE gesture in mocked mode."""
        controller = GestureController(driver=None)
        await controller.done_gesture()
        # Should complete without error
    
    @pytest.mark.asyncio
    async def test_error_gesture_mocked(self):
        """Test ERROR gesture in mocked mode."""
        controller = GestureController(driver=None)
        await controller.error_gesture()
        # Should complete without error
    
    @pytest.mark.asyncio
    async def test_return_to_rest_mocked(self):
        """Test return to rest in mocked mode."""
        controller = GestureController(driver=None)
        await controller.return_to_rest()
        # Should complete without error

