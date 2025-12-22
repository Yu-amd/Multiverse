"""
Security middleware for API authentication.
"""
from fastapi import Header, HTTPException, Request, status
from typing import Optional

from .settings import settings


async def verify_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> bool:
    """
    Verify API key from request header.
    
    Args:
        request: FastAPI request object
        x_api_key: API key from X-API-Key header
        
    Returns:
        True if authentication passes
        
    Raises:
        HTTPException: If authentication fails
    """
    # If auth mode is 'none', skip authentication
    if settings.AUTH_MODE == "none":
        return True
    
    # If auth mode is 'api_key', require valid API key
    if settings.AUTH_MODE == "api_key":
        if not x_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing API key. Provide X-API-Key header."
            )
        
        if not settings.API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server misconfiguration: API_KEY not set"
            )
        
        if x_api_key != settings.API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        return True
    
    # Unknown auth mode
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unknown AUTH_MODE: {settings.AUTH_MODE}"
    )

