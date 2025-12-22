"""
Unit tests for security module.
"""
import pytest
from fastapi import HTTPException
from unittest.mock import Mock, patch

from app.security import verify_api_key
from app.settings import settings


class TestSecurity:
    """Tests for security middleware."""
    
    @pytest.mark.asyncio
    async def test_verify_api_key_none_mode(self):
        """Test API key verification with AUTH_MODE=none."""
        with patch.object(settings, "AUTH_MODE", "none"):
            request = Mock()
            result = await verify_api_key(request, None)
            assert result is True
    
    @pytest.mark.asyncio
    async def test_verify_api_key_missing_key(self):
        """Test API key verification with missing key."""
        with patch.object(settings, "AUTH_MODE", "api_key"):
            request = Mock()
            with pytest.raises(HTTPException) as exc_info:
                await verify_api_key(request, None)
            assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_verify_api_key_invalid_key(self):
        """Test API key verification with invalid key."""
        with patch.object(settings, "AUTH_MODE", "api_key"):
            with patch.object(settings, "API_KEY", "correct-key"):
                request = Mock()
                with pytest.raises(HTTPException) as exc_info:
                    await verify_api_key(request, "wrong-key")
                assert exc_info.value.status_code == 401
    
    @pytest.mark.asyncio
    async def test_verify_api_key_valid_key(self):
        """Test API key verification with valid key."""
        with patch.object(settings, "AUTH_MODE", "api_key"):
            with patch.object(settings, "API_KEY", "correct-key"):
                request = Mock()
                result = await verify_api_key(request, "correct-key")
                assert result is True
    
    @pytest.mark.asyncio
    async def test_verify_api_key_server_misconfigured(self):
        """Test API key verification when server API_KEY not set."""
        with patch.object(settings, "AUTH_MODE", "api_key"):
            with patch.object(settings, "API_KEY", None):
                request = Mock()
                with pytest.raises(HTTPException) as exc_info:
                    await verify_api_key(request, "any-key")
                assert exc_info.value.status_code == 500

