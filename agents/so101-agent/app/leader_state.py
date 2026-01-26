"""
Leader joint state snapshot for SO-101 control surface.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Dict, Any, Optional

from .config_manager import get_config

_LEADER_LOCK = threading.Lock()
_LAST_SNAPSHOT: Optional[Dict[str, Any]] = None
_LAST_TS = 0.0


def _ensure_lerobot_path() -> None:
    cfg = get_config()
    lerobot_path = cfg.get("lerobot", {}).get("src_path")
    if not lerobot_path:
        return
    if lerobot_path not in sys.path:
        sys.path.insert(0, lerobot_path)


def _load_calibration(calibration_path: Path) -> Dict[str, Any] | None:
    try:
        if not calibration_path.exists():
            return None
        data = calibration_path.read_text(encoding="utf-8")
        return json.loads(data)
    except Exception:
        return None


def _get_lerobot_python() -> Optional[Path]:
    cfg = get_config()
    lerobot = cfg.get("lerobot", {})
    replay_path = lerobot.get("replay_path")
    if replay_path:
        candidate = Path(replay_path).resolve().parent / "python"
        if candidate.exists():
            return candidate
    fallback = Path("/home/yw/miniconda3/envs/lerobot/bin/python")
    return fallback if fallback.exists() else None


def _read_leader_with_lerobot(
    port: str,
    leader_id: str,
    calibration_dir: Optional[str],
) -> Dict[str, Any]:
    python_path = _get_lerobot_python()
    if not python_path:
        return {"ok": False, "error": "lerobot_python_missing", "port": port}

    cfg = get_config()
    lerobot_src = cfg.get("lerobot", {}).get("src_path", "")
    calibration_dir = calibration_dir or ""

    script = r"""
import json
import os
import sys

lerobot_src = os.environ.get("LEROBOT_SRC", "")
if lerobot_src and lerobot_src not in sys.path:
    sys.path.insert(0, lerobot_src)

from lerobot.motors import Motor, MotorCalibration, MotorNormMode
from lerobot.motors.feetech import FeetechMotorsBus
from lerobot.utils.constants import HF_LEROBOT_CALIBRATION, TELEOPERATORS

port = os.environ["LEADER_PORT"]
leader_id = os.environ.get("LEADER_ID", "leader_arm")
calibration_dir = os.environ.get("LEADER_CALIB_DIR", "")

calibration_path = (
    os.path.join(calibration_dir, f"{leader_id}.json")
    if calibration_dir
    else str(HF_LEROBOT_CALIBRATION / TELEOPERATORS / "so_leader" / "leader_arm.json")
)

calibration = None
try:
    if calibration_path and os.path.exists(calibration_path):
        with open(calibration_path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        calibration = {
            name: MotorCalibration(**payload)
            for name, payload in data.items()
        }
except Exception:
    calibration = None

motors = {
    "shoulder_pan": Motor(1, "sts3215", MotorNormMode.DEGREES),
    "shoulder_lift": Motor(2, "sts3215", MotorNormMode.DEGREES),
    "elbow_flex": Motor(3, "sts3215", MotorNormMode.DEGREES),
    "wrist_flex": Motor(4, "sts3215", MotorNormMode.DEGREES),
    "wrist_roll": Motor(5, "sts3215", MotorNormMode.DEGREES),
    "gripper": Motor(6, "sts3215", MotorNormMode.RANGE_0_100),
}

bus = FeetechMotorsBus(port=port, motors=motors, calibration=calibration)
try:
    bus.connect(handshake=False)
    action = bus.sync_read("Present_Position", normalize=True)
    joints = []
    for name, value in action.items():
        unit = "pct" if "gripper" in name else "deg"
        joints.append({"name": name, "value": float(value), "unit": unit})
    payload = {"ok": True, "port": port, "timestamp": __import__("time").time(), "joints": joints}
    print(json.dumps(payload))
finally:
    try:
        if bus.is_connected:
            bus.disconnect(disable_torque=False)
    except Exception:
        pass
"""
    env = {
        **os.environ,
        "LEADER_PORT": port,
        "LEADER_ID": leader_id,
        "LEADER_CALIB_DIR": calibration_dir,
        "LEROBOT_SRC": lerobot_src,
    }
    try:
        result = subprocess.run(
            [str(python_path), "-c", script],
            capture_output=True,
            text=True,
            env=env,
            timeout=8,
            check=False,
        )
        if result.returncode != 0:
            return {
                "ok": False,
                "error": "lerobot_subprocess_failed",
                "message": result.stderr.strip() or result.stdout.strip(),
                "port": port,
            }
        return json.loads(result.stdout.strip())
    except Exception as exc:
        return {
            "ok": False,
            "error": "lerobot_subprocess_failed",
            "message": str(exc),
            "port": port,
        }


def _read_leader_joints() -> Dict[str, Any]:
    cfg = get_config()
    leader_cfg = cfg.get("leader", {})
    port = leader_cfg.get("port", "")
    if not port or not Path(port).exists():
        return {
            "ok": False,
            "error": "leader_port_missing",
            "port": port,
        }

    return _read_leader_with_lerobot(
        port=port,
        leader_id=leader_cfg.get("id", "leader_arm"),
        calibration_dir=leader_cfg.get("calibration_dir"),
    )


def get_leader_joint_snapshot(cache_s: float = 0.8) -> Dict[str, Any]:
    global _LAST_SNAPSHOT, _LAST_TS
    now = time.time()
    with _LEADER_LOCK:
        if _LAST_SNAPSHOT and (now - _LAST_TS) < cache_s:
            return _LAST_SNAPSHOT
        snapshot = _read_leader_joints()
        _LAST_SNAPSHOT = snapshot
        _LAST_TS = now
        return snapshot

