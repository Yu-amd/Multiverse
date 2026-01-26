"""
LeRobot CLI adapter for SO-101 teleoperation.
Wraps lerobot-* commands with structured results and safe process control.
"""
import json
import os
import signal
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from .config_manager import get_config, get_follower_settings, get_lerobot_settings


@dataclass
class CmdResult:
    ok: bool
    returncode: int
    stdout: str
    stderr: str
    duration_ms: int
    cmdline: str


_TELEOP_PROCS: Dict[str, subprocess.Popen] = {}
_SEQUENCE_PROCS: Dict[str, subprocess.Popen] = {}
_SEQUENCE_OUTPUTS: Dict[str, Dict[str, str]] = {}
_TELEOP_START: Dict[str, float] = {}
_SEQUENCE_START: Dict[str, float] = {}
_EXIT_EVENTS: List[Dict[str, object]] = []


def _noop(*_args: object, **_kwargs: object) -> None:
    return None


try:
    from app.observability import (
        record_lerobot_exit_code,
        record_lerobot_runtime,
        record_lerobot_start_latency,
    )
except Exception:  # pragma: no cover - metrics are optional at runtime
    record_lerobot_exit_code = _noop
    record_lerobot_runtime = _noop
    record_lerobot_start_latency = _noop


def _cmd_label(args: List[str]) -> str:
    return args[0] if args else "unknown"


def _record_exit_event(cmd: str, code: int) -> None:
    _EXIT_EVENTS.append({"cmd": cmd, "code": code, "ts": time.time()})
    record_lerobot_exit_code(cmd, code)


def _build_camera_json(cfg: dict) -> str:
    camera = cfg.get("camera", {})
    return json.dumps({
        "teleop": {
            "type": "opencv",
            "index_or_path": camera.get("device", "/dev/robot_cam"),
            "width": camera.get("width", 1920),
            "height": camera.get("height", 1080),
            "fps": camera.get("fps", 30),
            "fourcc": camera.get("fourcc", "MJPG"),
        }
    })


def build_teleop_cmd(cfg: Optional[dict] = None) -> List[str]:
    """Build lerobot-teleoperate command based on config."""
    cfg = cfg or get_config()
    follower = cfg.get("follower", {})
    leader = cfg.get("leader", {})
    teleop = cfg.get("teleop", {})

    if not leader.get("enabled", True):
        raise ValueError("Leader teleop is disabled in config")

    cmd = [
        "lerobot-teleoperate",
        f"--robot.type=so101_follower",
        f"--robot.id={follower.get('id', 'follower_arm')}",
        f"--robot.port={follower.get('port', '')}",
        f"--teleop.type=so101_leader",
        f"--teleop.id={leader.get('id', 'leader_arm')}",
        f"--teleop.port={leader.get('port', '')}",
        f"--display_data={str(bool(teleop.get('display_data', True)))}",
        f"--robot.cameras={_build_camera_json(cfg)}",
    ]
    return cmd


def run_cmd(args: List[str], timeout_s: int = 20) -> CmdResult:
    """Run a short-lived CLI command and return structured result."""
    start_time = time.time()
    cmdline = " ".join(args)
    cmd_label = _cmd_label(args)
    try:
        completed = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
        duration_ms = int((time.time() - start_time) * 1000)
        record_lerobot_runtime(cmd_label, duration_ms)
        _record_exit_event(cmd_label, completed.returncode)
        return CmdResult(
            ok=completed.returncode == 0,
            returncode=completed.returncode,
            stdout=completed.stdout or "",
            stderr=completed.stderr or "",
            duration_ms=duration_ms,
            cmdline=cmdline,
        )
    except subprocess.TimeoutExpired as exc:
        duration_ms = int((time.time() - start_time) * 1000)
        record_lerobot_runtime(cmd_label, duration_ms)
        _record_exit_event(cmd_label, 124)
        return CmdResult(
            ok=False,
            returncode=124,
            stdout=exc.stdout or "",
            stderr=exc.stderr or "Command timed out",
            duration_ms=duration_ms,
            cmdline=cmdline,
        )


def start_teleop() -> Dict[str, str]:
    """Start lerobot-teleoperate as a managed process."""
    cfg = get_config()
    cmd = build_teleop_cmd(cfg)
    run_id = str(uuid.uuid4())
    start_time = time.time()
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,  # required to kill process group on stop
    )
    record_lerobot_start_latency(_cmd_label(cmd), int((time.time() - start_time) * 1000))
    _TELEOP_PROCS[run_id] = proc
    _TELEOP_START[run_id] = start_time
    return {
        "run_id": run_id,
        "pid": str(proc.pid),
        "cmdline": " ".join(cmd),
    }


def stop_teleop(run_id: str) -> Dict[str, str]:
    """Stop a running teleop session."""
    proc = _TELEOP_PROCS.get(run_id)
    if not proc:
        return {"ok": "false", "message": "run_id not found"}

    try:
        os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=5)
        started_at = _TELEOP_START.pop(run_id, None)
        if started_at:
            record_lerobot_runtime("lerobot-teleoperate", int((time.time() - started_at) * 1000))
        _record_exit_event("lerobot-teleoperate", proc.returncode or 0)
        _TELEOP_PROCS.pop(run_id, None)
        return {"ok": "true", "message": "teleop stopped"}
    except Exception:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except Exception:
            pass
        started_at = _TELEOP_START.pop(run_id, None)
        if started_at:
            record_lerobot_runtime("lerobot-teleoperate", int((time.time() - started_at) * 1000))
        _record_exit_event("lerobot-teleoperate", proc.returncode or 1)
        _TELEOP_PROCS.pop(run_id, None)
        return {"ok": "false", "message": "forced stop issued"}


def teleop_status(run_id: Optional[str] = None) -> Dict[str, str]:
    """Return status for one run_id or all."""
    if run_id:
        proc = _TELEOP_PROCS.get(run_id)
        if not proc:
            return {"running": "false"}
        return {"running": str(proc.poll() is None).lower(), "pid": str(proc.pid)}

    active = {
        rid: str(proc.poll() is None).lower()
        for rid, proc in _TELEOP_PROCS.items()
    }
    return {"active": json.dumps(active)}


def _build_sequence_cmd() -> List[str]:
    cfg = get_config()
    follower = get_follower_settings()

    dataset_root = follower.get("dataset_root", "")
    if dataset_root:
        lerobot_settings = get_lerobot_settings()
        replay_path = lerobot_settings.get("replay_path") or "lerobot-replay"
        cmd = [
            replay_path,
            "--robot.type=so101_follower",
            "--robot.id",
            follower.get("id", "follower_arm"),
            "--robot.port",
            follower.get("port", ""),
            "--dataset.root",
            dataset_root,
            "--dataset.repo_id",
            follower.get("dataset_repo_id", "local/so101_home_poseA_home_v1"),
            "--dataset.episode",
            str(follower.get("dataset_episode", 0)),
            "--dataset.fps",
            str(follower.get("dataset_fps", 30)),
            "--play_sounds",
            str(bool(follower.get("play_sounds", False))).lower(),
        ]
        return cmd
    raise ValueError("dataset_root is required for replay-based motion")


def start_pose_sequence() -> Dict[str, str]:
    """Start a pose sequence via the SDK shim."""
    cmd = _build_sequence_cmd()
    run_id = str(uuid.uuid4())
    start_time = time.time()
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    record_lerobot_start_latency(_cmd_label(cmd), int((time.time() - start_time) * 1000))
    _SEQUENCE_PROCS[run_id] = proc
    _SEQUENCE_START[run_id] = start_time
    return {"run_id": run_id, "pid": str(proc.pid), "cmdline": " ".join(cmd)}


def stop_pose_sequence(run_id: str) -> Dict[str, str]:
    proc = _SEQUENCE_PROCS.get(run_id)
    if not proc:
        return {"ok": "false", "message": "run_id not found"}

    try:
        os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=5)
        started_at = _SEQUENCE_START.pop(run_id, None)
        if started_at:
            record_lerobot_runtime("lerobot-replay", int((time.time() - started_at) * 1000))
        _record_exit_event("lerobot-replay", proc.returncode or 0)
        _SEQUENCE_PROCS.pop(run_id, None)
        _SEQUENCE_OUTPUTS.pop(run_id, None)
        return {"ok": "true", "message": "sequence stopped"}
    except Exception:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except Exception:
            pass
        started_at = _SEQUENCE_START.pop(run_id, None)
        if started_at:
            record_lerobot_runtime("lerobot-replay", int((time.time() - started_at) * 1000))
        _record_exit_event("lerobot-replay", proc.returncode or 1)
        _SEQUENCE_PROCS.pop(run_id, None)
        _SEQUENCE_OUTPUTS.pop(run_id, None)
        return {"ok": "false", "message": "forced stop issued"}


def sequence_status(run_id: Optional[str] = None) -> Dict[str, str]:
    if run_id:
        proc = _SEQUENCE_PROCS.get(run_id)
        if not proc:
            return {"running": "false"}
        returncode = proc.poll()
        output = _SEQUENCE_OUTPUTS.get(run_id)
        if returncode is not None and output is None:
            try:
                stdout, stderr = proc.communicate(timeout=1)
                _SEQUENCE_OUTPUTS[run_id] = {
                    "stdout": stdout or "",
                    "stderr": stderr or "",
                }
            except Exception:
                _SEQUENCE_OUTPUTS[run_id] = {"stdout": "", "stderr": ""}
            output = _SEQUENCE_OUTPUTS.get(run_id)
            started_at = _SEQUENCE_START.pop(run_id, None)
            if started_at:
                record_lerobot_runtime("lerobot-replay", int((time.time() - started_at) * 1000))
            _record_exit_event("lerobot-replay", returncode)
        return {
            "running": str(returncode is None).lower(),
            "pid": str(proc.pid),
            "returncode": "" if returncode is None else str(returncode),
            "stdout": (output or {}).get("stdout", ""),
            "stderr": (output or {}).get("stderr", ""),
        }

    active = {
        rid: str(proc.poll() is None).lower()
        for rid, proc in _SEQUENCE_PROCS.items()
    }
    return {"active": json.dumps(active)}


def get_cli_timeout() -> int:
    return 20


def get_recent_exit_errors(window_s: int = 300) -> List[Dict[str, object]]:
    now = time.time()
    cutoff = now - window_s
    return [
        event
        for event in _EXIT_EVENTS
        if event.get("ts", 0) >= cutoff and int(event.get("code", 0)) != 0
    ]

