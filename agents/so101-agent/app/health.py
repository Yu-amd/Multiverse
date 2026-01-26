"""
Health checks for SO-101 endpoints (follower, leader, camera).
"""
import os
from typing import Dict, Optional

from .config_manager import get_config


def check_device_paths() -> Dict[str, bool]:
    cfg = get_config()
    follower_port = cfg.get("follower", {}).get("port", "")
    leader_port = cfg.get("leader", {}).get("port", "")
    camera_device = cfg.get("camera", {}).get("device", "")

    return {
        "follower_port_ok": bool(follower_port) and os.path.exists(follower_port),
        "leader_port_ok": bool(leader_port) and os.path.exists(leader_port),
        "camera_ok": bool(camera_device) and os.path.exists(camera_device),
    }


def compute_health_status(role: Optional[str] = None) -> Dict[str, object]:
    """
    Compute health with role-specific semantics.
    role: follower | camera | leader
    """
    checks = check_device_paths()

    if role == "camera":
        sensors_ok = checks["camera_ok"]
        actuators_ok = None
        status = "online" if sensors_ok else "offline"
    elif role == "leader":
        sensors_ok = None
        actuators_ok = checks["leader_port_ok"]
        status = "online" if actuators_ok else "offline"
    else:
        # follower default
        sensors_ok = checks["camera_ok"]
        actuators_ok = checks["follower_port_ok"]
        if sensors_ok and actuators_ok:
            status = "online"
        elif sensors_ok or actuators_ok:
            status = "degraded"
        else:
            status = "offline"

    cfg = get_config()
    return {
        "status": status,
        "sensors_ok": sensors_ok,
        "actuators_ok": actuators_ok,
        "checks": checks,
        "paths": {
            "follower_port": cfg.get("follower", {}).get("port", ""),
            "leader_port": cfg.get("leader", {}).get("port", ""),
            "camera_device": cfg.get("camera", {}).get("device", ""),
        },
        "role": role or "follower",
    }

