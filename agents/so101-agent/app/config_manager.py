"""
Configuration manager for SO-101 agent.
Loads stable device paths and teleop settings from a JSON file.
"""
import json
from pathlib import Path
from typing import Any, Dict

CONFIG_FILE = Path(__file__).parent.parent / ".so101_config.json"


def _default_config() -> Dict[str, Any]:
    return {
        "follower": {
            "id": "follower_arm",
            "port": "/dev/serial/by-id/usb-1a86_USB_Single_Serial_5AE6082421-if00",
            "calibration_dir": "/home/yw/.cache/huggingface/lerobot/calibration",
            "dataset_root": str(Path(__file__).parent.parent / "assets" / "motions" / "so101_home_poseA_home_v1"),
            "dataset_repo_id": "local/so101_home_poseA_home_v1",
            "dataset_episode": 0,
            "dataset_fps": 15,
            "play_sounds": False,
        },
        "leader": {
            "id": "leader_arm",
            "port": "/dev/serial/by-id/usb-1a86_USB_Single_Serial_5AE6084391-if00",
            "enabled": True,
        },
        "camera": {
            "device": "/dev/robot_cam",
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "fourcc": "MJPG",
        },
        "teleop": {
            "display_data": True,
            "enabled": True,
        },
        "lerobot": {
            "cli_timeout_sec": 20,
            "src_path": "/home/yw/lerobot/src",
            "replay_path": "/home/yw/miniconda3/envs/lerobot/bin/lerobot-replay",
        },
        "system": {
            "udev_reload_on_start": False,
        },
    }


def get_config() -> Dict[str, Any]:
    """Load SO-101 config file. Falls back to defaults if missing or invalid."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {**_default_config(), **data}
        except Exception:
            pass
    return _default_config()


def save_config(config: Dict[str, Any]) -> None:
    """Persist config to disk."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_paths() -> Dict[str, str]:
    """Return stable device paths for follower, leader, and camera."""
    cfg = get_config()
    return {
        "follower_port": cfg.get("follower", {}).get("port", ""),
        "leader_port": cfg.get("leader", {}).get("port", ""),
        "camera_device": cfg.get("camera", {}).get("device", ""),
    }


def get_follower_settings() -> Dict[str, Any]:
    """Return follower-specific settings."""
    cfg = get_config()
    return cfg.get("follower", {})


def get_teleop_settings() -> Dict[str, Any]:
    """Return teleop settings."""
    cfg = get_config()
    return cfg.get("teleop", {})


def get_camera_settings() -> Dict[str, Any]:
    """Return camera settings."""
    cfg = get_config()
    return cfg.get("camera", {})


def get_lerobot_settings() -> Dict[str, Any]:
    """Return LeRobot CLI settings."""
    cfg = get_config()
    return cfg.get("lerobot", {})

