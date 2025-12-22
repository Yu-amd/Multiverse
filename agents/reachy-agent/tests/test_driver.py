"""
Tests for Reachy driver.
"""
import pytest
from app.reachy_driver import ReachyDriver


class TestReachyDriver:
    """Tests for Reachy driver."""
    
    def test_driver_init_mocked(self):
        """Test driver initialization in mocked mode."""
        driver = ReachyDriver(mocked=True)
        assert driver.mocked is True
        assert driver.connected is False
    
    def test_driver_init_real(self):
        """Test driver initialization for real hardware."""
        driver = ReachyDriver(mocked=False, connection_string="test-connection")
        assert driver.mocked is False
        assert driver.connection_string == "test-connection"
        assert driver.connected is False
    
    @pytest.mark.asyncio
    async def test_driver_connect_mocked(self):
        """Test driver connection in mocked mode."""
        driver = ReachyDriver(mocked=True)
        result = await driver.connect()
        assert result is True
        assert driver.connected is True
    
    @pytest.mark.asyncio
    async def test_driver_disconnect_mocked(self):
        """Test driver disconnection in mocked mode."""
        driver = ReachyDriver(mocked=True)
        await driver.connect()
        assert driver.connected is True
        await driver.disconnect()
        assert driver.connected is False
    
    def test_driver_is_connected(self):
        """Test driver connection status check."""
        driver = ReachyDriver(mocked=True)
        assert driver.is_connected() is False
        driver.connected = True
        assert driver.is_connected() is True
    
    def test_driver_check_safety_mocked(self):
        """Test safety check in mocked mode."""
        driver = ReachyDriver(mocked=True)
        assert driver.check_safety() is True
    
    @pytest.mark.asyncio
    async def test_driver_emergency_stop_mocked(self):
        """Test emergency stop in mocked mode."""
        driver = ReachyDriver(mocked=True)
        await driver.emergency_stop()
        # Should complete without error

