"""
Configuration manager for Reachy agent.
Handles reading/writing hardware enabled state to a config file.
"""
import json
import os
from pathlib import Path
from typing import Optional

CONFIG_FILE = Path(__file__).parent.parent / ".reachy_config.json"

def get_config() -> dict:
    """Get current configuration from file."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    # Default configuration (matches start.sh defaults)
    return {
        "hardware_enabled": True,  # Default to enabled (matches start.sh)
        "audio_enabled": True
    }

def save_config(config: dict) -> None:
    """Save configuration to file."""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        raise Exception(f"Failed to save config: {e}")

def is_hardware_enabled() -> bool:
    """Check if hardware is enabled in config."""
    config = get_config()
    return config.get("hardware_enabled", False)

def set_hardware_enabled(enabled: bool) -> None:
    """Set hardware enabled state in config."""
    config = get_config()
    config["hardware_enabled"] = enabled
    save_config(config)

def is_audio_enabled() -> bool:
    """Check if audio is enabled in config."""
    config = get_config()
    return config.get("audio_enabled", True)

def set_audio_enabled(enabled: bool) -> None:
    """Set audio enabled state in config."""
    config = get_config()
    config["audio_enabled"] = enabled
    save_config(config)

