"""
Configuration settings for the agent framework.
"""
import os
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Agent Identity
    AGENT_ID: str = "agent-001"
    ROBOT_TYPE: str = "generic"
    AGENT_VERSION: str = "0.1.0"
    
    # Backend Configuration
    AIM_BASE_URL_DEFAULT: Optional[str] = None
    AIM_API_KEY_DEFAULT: Optional[str] = None
    BACKEND_DEFAULT: str = "aim"
    
    # Policy Defaults
    E2E_SLO_MS_DEFAULT: int = 2500
    TIMEOUT_MS_DEFAULT: int = 2200
    
    # Security
    AUTH_MODE: str = "none"
    API_KEY: Optional[str] = None
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 9001
    LOG_LEVEL: str = "INFO"
    
    # Observability
    METRICS_ENABLED: bool = True
    METRICS_PORT: int = 9090
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


# Global settings instance
settings = Settings()

