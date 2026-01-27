"""
Daemon manager for Reachy Mini daemon.
Handles starting/stopping the daemon when hardware is enabled/disabled.
"""
import subprocess
import os
import time
import signal
from pathlib import Path
from typing import Optional, List, Tuple

from app.observability import StructuredLogger
from app.config_manager import get_serial_port, set_serial_port

logger = StructuredLogger(__name__)

# Daemon configuration
DAEMON_FASTAPI_PORT = 8001  # Use port 8001 to avoid conflict with port 8000
DAEMON_LOG_FILE = Path(__file__).parent.parent / "daemon.log"

SERIAL_ID_HINTS = ("reachy", "pollen", "robotics")

def _read_sysfs_value(tty: str, name: str) -> Optional[str]:
    base = Path("/sys/class/tty") / tty
    if not base.exists():
        return None
    for parent in base.parents:
        candidate = parent / name
        if candidate.exists():
            try:
                return candidate.read_text().strip()
            except Exception:
                return None
    return None

def _match_reachy_tty(tty: str) -> bool:
    manufacturer = _read_sysfs_value(tty, "manufacturer") or ""
    product = _read_sysfs_value(tty, "product") or ""
    combined = f"{manufacturer} {product}".lower()
    return any(hint in combined for hint in SERIAL_ID_HINTS)


def _list_serial_by_id() -> List[str]:
    base = Path("/dev/serial/by-id")
    if not base.exists():
        return []
    return [str(p) for p in base.iterdir() if p.is_symlink()]


def _detect_serial_port() -> Optional[str]:
    by_id = _list_serial_by_id()
    for path in by_id:
        lower = Path(path).name.lower()
        if any(hint in lower for hint in SERIAL_ID_HINTS):
            return path
    # Fallback: use sysfs manufacturer/product to pick the Reachy device.
    acm = sorted(Path("/dev").glob("ttyACM*"))
    usb = sorted(Path("/dev").glob("ttyUSB*"))
    acm_matches = [p for p in acm if _match_reachy_tty(p.name)]
    usb_matches = [p for p in usb if _match_reachy_tty(p.name)]
    candidates = [str(p) for p in acm_matches + usb_matches]
    if len(candidates) == 1:
        return candidates[0]
    # Final fallback: if only one ACM/USB port, use it.
    all_candidates = [str(p) for p in acm + usb]
    if len(all_candidates) == 1:
        return all_candidates[0]
    return None


def is_daemon_running() -> bool:
    """Check if Reachy Mini daemon is running."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", "reachy-mini-daemon"],
            capture_output=True,
            text=True,
            timeout=2
        )
        return result.returncode == 0 and result.stdout.strip() != ""
    except Exception as e:
        logger.debug("Error checking daemon status", error=str(e))
        return False


def _start_daemon_with_port(serial_port: Optional[str]) -> bool:
    """Start daemon with an explicit serial port and verify Zenoh readiness."""
    # Get script directory
    script_dir = Path(__file__).parent.parent
    venv_python = script_dir / "venv" / "bin" / "python"
    if not venv_python.exists():
        logger.warning("Virtual environment not found, daemon may not start correctly")
        venv_python = "python3"
    
    # Find daemon command
    daemon_cmd = None
    venv_bin = script_dir / "venv" / "bin"
    if (venv_bin / "reachy-mini-daemon").exists():
        daemon_cmd = str(venv_bin / "reachy-mini-daemon")
        use_shell = False
    else:
        logger.info("Using Python module to start daemon")
        daemon_cmd = f"{venv_python} -m reachy_mini.daemon.app.main"
        use_shell = True
    
    try:
        logger.info("Starting Reachy Mini daemon", command=daemon_cmd, port=DAEMON_FASTAPI_PORT, serial_port=serial_port)
        if use_shell:
            cmd = f"{daemon_cmd} --fastapi-port {DAEMON_FASTAPI_PORT} --headless"
            if serial_port:
                cmd += f" -p {serial_port}"
            process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=open(DAEMON_LOG_FILE, 'a'),
                stderr=subprocess.STDOUT,
                cwd=str(script_dir),
                start_new_session=True
            )
        else:
            cmd_list = [daemon_cmd, "--fastapi-port", str(DAEMON_FASTAPI_PORT), "--headless"]
            if serial_port:
                cmd_list.extend(["-p", serial_port])
            process = subprocess.Popen(
                cmd_list,
                stdout=open(DAEMON_LOG_FILE, 'a'),
                stderr=subprocess.STDOUT,
                cwd=str(script_dir),
                start_new_session=True
            )
        time.sleep(3)
        if not is_daemon_running():
            logger.warning("Daemon process started but may have failed - check logs", log_file=str(DAEMON_LOG_FILE))
            return False
        if wait_for_zenoh_ready(timeout=8.0):
            logger.info("Zenoh service is ready", port=7447)
            return True
        logger.warning("Zenoh not ready after daemon start", serial_port=serial_port)
        stop_daemon()
        return False
    except Exception as e:
        logger.error("Failed to start Reachy Mini daemon", error=str(e))
        return False


def start_daemon() -> bool:
    """
    Start the Reachy Mini daemon.
    
    Returns:
        True if daemon started successfully or was already running
    """
    # Check if already running
    if is_daemon_running():
        logger.info("Reachy Mini daemon is already running")
        return True
    
    serial_port = get_serial_port()
    if serial_port:
        return _start_daemon_with_port(serial_port)
    
    serial_port = _detect_serial_port()
    if serial_port:
        if _start_daemon_with_port(serial_port):
            try:
                set_serial_port(serial_port)
                logger.info("Auto-detected Reachy serial port", serial_port=serial_port)
            except Exception:
                logger.warning("Failed to persist serial port", serial_port=serial_port)
            return True
        return False
    
    # Try all candidate ports to resolve ambiguous USB devices.
    candidates = [str(p) for p in sorted(Path("/dev").glob("ttyACM*"))]
    candidates += [str(p) for p in sorted(Path("/dev").glob("ttyUSB*"))]
    for candidate in candidates:
        if _start_daemon_with_port(candidate):
            try:
                set_serial_port(candidate)
                logger.info("Auto-selected Reachy serial port", serial_port=candidate)
            except Exception:
                logger.warning("Failed to persist serial port", serial_port=candidate)
            return True
    logger.warning("Could not auto-detect Reachy serial port; daemon may fail")
    return False


def stop_daemon() -> bool:
    """
    Stop the Reachy Mini daemon.
    
    Returns:
        True if daemon stopped successfully or was not running
    """
    if not is_daemon_running():
        logger.info("Reachy Mini daemon is not running")
        return True
    
    try:
        logger.info("Stopping Reachy Mini daemon")
        # Use pkill to find and kill daemon processes
        subprocess.run(
            ["pkill", "-f", "reachy-mini-daemon"],
            timeout=5
        )
        
        # Wait a bit for processes to terminate
        time.sleep(2)
        
        # Force kill if still running
        if is_daemon_running():
            logger.warning("Daemon still running, force killing...")
            subprocess.run(
                ["pkill", "-9", "-f", "reachy-mini-daemon"],
                timeout=5
            )
            time.sleep(1)
        
        if not is_daemon_running():
            logger.info("Reachy Mini daemon stopped successfully")
            return True
        else:
            logger.warning("Failed to stop daemon completely")
            return False
            
    except Exception as e:
        logger.error("Error stopping Reachy Mini daemon", error=str(e))
        return False


def ensure_daemon_running() -> bool:
    """
    Ensure daemon is running. Start it if not running.
    
    Returns:
        True if daemon is running (was already running or started successfully)
    """
    if is_daemon_running():
        return True
    
    return start_daemon()


def wait_for_zenoh_ready(timeout: float = 10.0) -> bool:
    """
    Wait for Zenoh service to be ready (listening on port 7447).
    
    Args:
        timeout: Maximum time to wait in seconds
        
    Returns:
        True if Zenoh is ready, False if timeout
    """
    import socket
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            # Try to connect to Zenoh port (7447)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex(('127.0.0.1', 7447))
            sock.close()
            
            if result == 0:
                logger.info("Zenoh service is ready", port=7447)
                return True
        except Exception:
            pass
        
        time.sleep(0.5)
    
    logger.warning("Zenoh service not ready after timeout", timeout=timeout)
    return False

