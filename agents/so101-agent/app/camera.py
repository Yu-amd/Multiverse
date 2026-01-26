"""
Camera capture for SO-101 follower camera.
Supports single-frame capture and bounded stream sessions.
"""
import base64
import os
import threading
import time
from pathlib import Path
from typing import Dict, Any, Optional, Generator, List

from .config_manager import get_camera_settings, get_config, save_config

_camera_lock = threading.Lock()
_camera_thread: Optional[threading.Thread] = None
_camera_stop = threading.Event()
_camera_stop_at: Optional[float] = None
_latest_frame: Optional[bytes] = None
_latest_frame_ts: Optional[float] = None
_camera_error: Optional[str] = None
_target_fps = 0
_stream_width: Optional[int] = None
_stream_height: Optional[int] = None
_actual_fps = 0.0
_avg_latency_ms = 0.0
_dropped_frames = 0
_frames_count = 0
_frames_window_start = 0.0
_latency_samples = 0
_prev_frame_ts: Optional[float] = None
_stale_since: Optional[float] = None
_low_fps_since: Optional[float] = None
_capture_failures: List[float] = []
_active_device: Optional[str] = None


def _noop(*_args: object, **_kwargs: object) -> None:
    return None


try:
    from app.observability import (
        record_camera_capture_failure,
        record_camera_capture_latency,
        record_camera_dropped_frames,
        record_camera_frame_bytes,
        record_camera_stream_jitter,
        record_control_loop_tick,
        set_camera_frame_age,
        set_camera_stream_fps,
    )
except Exception:  # pragma: no cover - metrics are optional at runtime
    record_camera_capture_failure = _noop
    record_camera_capture_latency = _noop
    record_camera_dropped_frames = _noop
    record_camera_frame_bytes = _noop
    record_camera_stream_jitter = _noop
    record_control_loop_tick = _noop
    set_camera_frame_age = _noop
    set_camera_stream_fps = _noop


def _register_capture_failure(device: str, reason: str) -> None:
    _capture_failures.append(time.time())
    record_camera_capture_failure(device, reason)


def _update_metrics(frame_ts: float, latency_ms: float) -> None:
    global _latest_frame_ts, _actual_fps, _avg_latency_ms, _frames_count, _frames_window_start, _latency_samples
    _latest_frame_ts = frame_ts
    _frames_count += 1
    if _frames_window_start == 0:
        _frames_window_start = frame_ts
    window_elapsed = frame_ts - _frames_window_start
    if window_elapsed >= 1.0:
        _actual_fps = _frames_count / window_elapsed
        _frames_count = 0
        _frames_window_start = frame_ts
    _latency_samples += 1
    _avg_latency_ms = ((_avg_latency_ms * (_latency_samples - 1)) + latency_ms) / _latency_samples


def _camera_loop(device: str, width: int, height: int, fps: int) -> None:
    global _latest_frame, _camera_error, _target_fps, _dropped_frames, _camera_stop_at, _stream_width, _stream_height, _prev_frame_ts
    try:
        import cv2  # type: ignore
    except Exception as exc:
        with _camera_lock:
            _camera_error = f"OpenCV not available: {exc}"
        return

    cap = cv2.VideoCapture(device)
    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        cap.set(cv2.CAP_PROP_FPS, fps)

        if not cap.isOpened():
            with _camera_lock:
                _camera_error = f"Failed to open camera at {device}"
            return

        interval = 1.0 / max(fps, 1)
        while not _camera_stop.is_set():
            if _camera_stop_at and time.time() >= _camera_stop_at:
                break
            start_ts = time.time()
            ok, frame = cap.read()
            if not ok or frame is None:
                with _camera_lock:
                    _camera_error = "Failed to read frame from camera"
                    _dropped_frames += 1
                _register_capture_failure(device, "read_failed")
                record_camera_dropped_frames(device, 1)
                time.sleep(0.2)
                continue

            success, buffer = cv2.imencode(".jpg", frame)
            if not success:
                with _camera_lock:
                    _camera_error = "Failed to encode frame"
                    _dropped_frames += 1
                _register_capture_failure(device, "encode_failed")
                record_camera_dropped_frames(device, 1)
                time.sleep(0.2)
                continue

            frame_ts = time.time()
            latency_ms = (frame_ts - start_ts) * 1000.0
            with _camera_lock:
                _latest_frame = buffer.tobytes()
                _camera_error = None
                _target_fps = fps
                _stream_width = width
                _stream_height = height
                _update_metrics(frame_ts, latency_ms)

            if _prev_frame_ts:
                jitter_ms = abs((frame_ts - _prev_frame_ts) * 1000.0)
                record_camera_stream_jitter(device, jitter_ms)
                record_control_loop_tick("so101-camera", jitter_ms)
            _prev_frame_ts = frame_ts

            record_camera_frame_bytes(device, len(_latest_frame))
            record_camera_capture_latency(device, latency_ms)
            set_camera_stream_fps(device, _actual_fps)

            elapsed = time.time() - start_ts
            if elapsed < interval:
                time.sleep(interval - elapsed)
    finally:
        cap.release()


def _test_camera_device(device: str, width: int, height: int, fps: int) -> bool:
    try:
        import cv2  # type: ignore
    except Exception:
        return False

    cap = cv2.VideoCapture(device)
    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        cap.set(cv2.CAP_PROP_FPS, fps)
        if not cap.isOpened():
            return False
        ok, frame = cap.read()
        return ok and frame is not None
    finally:
        cap.release()


def _is_laptop_camera(device_path: str) -> bool:
    try:
        name_path = Path(device_path).resolve()
        if name_path.name.startswith("video"):
            sys_name = Path("/sys/class/video4linux") / name_path.name / "name"
            if sys_name.exists():
                name = sys_name.read_text(encoding="utf-8").strip().lower()
                return any(token in name for token in ("laptop", "integrated", "internal", "webcam"))
    except Exception:
        return False
    return False


def _get_camera_name(device_path: str) -> Optional[str]:
    try:
        name_path = Path(device_path).resolve()
        if name_path.name.startswith("video"):
            sys_name = Path("/sys/class/video4linux") / name_path.name / "name"
            if sys_name.exists():
                return sys_name.read_text(encoding="utf-8").strip()
    except Exception:
        return None
    return None


def _is_usb_camera(device_path: str) -> bool:
    try:
        name_path = Path(device_path).resolve()
        if name_path.name.startswith("video"):
            sys_device = Path("/sys/class/video4linux") / name_path.name / "device"
            if sys_device.exists():
                resolved = str(sys_device.resolve()).lower()
                return "usb" in resolved
    except Exception:
        return False
    return False


def _resolve_camera_device(device: str, width: int, height: int, fps: int) -> str:
    cfg = get_config()
    camera_cfg = cfg.get("camera", {})
    preferred_name = camera_cfg.get("device_name")
    if preferred_name:
        candidates = [str(path) for path in sorted(Path("/dev").glob("video*"))]
        for candidate_path in candidates:
            name = _get_camera_name(candidate_path)
            if name != preferred_name:
                continue
            if _test_camera_device(candidate_path, width, height, fps):
                if camera_cfg.get("device") != candidate_path:
                    camera_cfg["device"] = candidate_path
                    cfg["camera"] = camera_cfg
                    save_config(cfg)
                return candidate_path

    if device and os.path.exists(device):
        resolved = os.path.realpath(device)
        for candidate in {device, resolved}:
            if _is_laptop_camera(candidate):
                continue
            if _test_camera_device(candidate, width, height, fps):
                return candidate

    candidates = [str(path) for path in sorted(Path("/dev").glob("video*"))]
    non_laptop = [path for path in candidates if not _is_laptop_camera(path)]
    preferred = [path for path in non_laptop if _is_usb_camera(path)] or non_laptop

    for candidate_path in preferred:
        if _test_camera_device(candidate_path, width, height, fps):
            if camera_cfg.get("device") != candidate_path:
                camera_cfg["device"] = candidate_path
                camera_cfg["device_name"] = _get_camera_name(candidate_path)
                cfg["camera"] = camera_cfg
                save_config(cfg)
            return candidate_path

    return device


def start_stream(
    target_fps: Optional[int] = None,
    duration_s: Optional[int] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
) -> Dict[str, Any]:
    global _camera_thread, _camera_stop, _camera_error, _target_fps, _avg_latency_ms, _actual_fps, _latest_frame, _latest_frame_ts, _dropped_frames, _camera_stop_at, _stream_width, _stream_height, _prev_frame_ts, _stale_since, _low_fps_since, _active_device
    if _camera_thread and _camera_thread.is_alive():
        return {"ok": True, "running": True}

    cfg = get_camera_settings()
    device = cfg.get("device", "/dev/robot_cam")
    width = int(width or cfg.get("width", 1920))
    height = int(height or cfg.get("height", 1080))
    fps = int(target_fps or cfg.get("fps", 30))
    device = _resolve_camera_device(device, width, height, fps)

    _camera_stop.clear()
    _camera_error = None
    _target_fps = fps
    _avg_latency_ms = 0.0
    _actual_fps = 0.0
    _latest_frame = None
    _latest_frame_ts = None
    _dropped_frames = 0
    _prev_frame_ts = None
    _stale_since = None
    _low_fps_since = None
    _camera_stop_at = time.time() + duration_s if duration_s else None
    _stream_width = width
    _stream_height = height
    _active_device = device

    _camera_thread = threading.Thread(
        target=_camera_loop,
        args=(device, width, height, fps),
        daemon=True,
    )
    _camera_thread.start()
    return {"ok": True, "running": True}


def stop_stream() -> Dict[str, Any]:
    _camera_stop.set()
    if _camera_thread:
        _camera_thread.join(timeout=2)
    return {"ok": True, "running": False}


def get_stream_status() -> Dict[str, Any]:
    now = time.time()
    with _camera_lock:
        running = _camera_thread is not None and _camera_thread.is_alive()
        last_age_ms = (now - _latest_frame_ts) * 1000.0 if _latest_frame_ts else None
        if last_age_ms is not None:
            set_camera_frame_age("so101-camera", last_age_ms)
        set_camera_stream_fps("so101-camera", _actual_fps)
        return {
            "running": running,
            "device": _active_device,
            "error": _camera_error,
            "target_fps": _target_fps,
            "width": _stream_width,
            "height": _stream_height,
            "actual_fps": round(_actual_fps, 2),
            "avg_latency_ms": round(_avg_latency_ms, 2),
            "last_frame_age_ms": round(last_age_ms, 2) if last_age_ms is not None else None,
            "dropped_frames": _dropped_frames,
        }


def get_latest_frame_base64() -> Dict[str, Any]:
    with _camera_lock:
        if not _latest_frame:
            return {"ok": False, "error": "No frame available"}
        return {
            "ok": True,
            "timestamp": _latest_frame_ts,
            "jpeg_base64": base64.b64encode(_latest_frame).decode("ascii"),
        }


def capture_frame(
    run_id: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    image_format: str = "jpg",
    warmup_frames: int = 3,
) -> Dict[str, Any]:
    cfg = get_camera_settings()
    device = cfg.get("device", "/dev/robot_cam")
    width = int(width or cfg.get("width", 1920))
    height = int(height or cfg.get("height", 1080))
    fps = int(cfg.get("fps", 30))
    device = _resolve_camera_device(device, width, height, fps)
    global _active_device
    _active_device = device

    try:
        import cv2  # type: ignore
    except Exception as exc:
        _register_capture_failure(device, "opencv_missing")
        return {
            "ok": False,
            "error": f"OpenCV not available: {exc}",
        }

    output_dir = Path(__file__).parent.parent / "runs" / run_id / "camera"
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp_ms = int(time.time() * 1000)
    output_path = output_dir / f"frame_{timestamp_ms}.{image_format}"

    stream_running = _camera_thread is not None and _camera_thread.is_alive()
    if stream_running:
        # Reuse the latest frame from the active stream to avoid device contention.
        start_ts = time.time()
        frame_bytes: Optional[bytes] = None
        frame_ts: Optional[float] = None
        while time.time() - start_ts < 2.0:
            with _camera_lock:
                frame_bytes = _latest_frame
                frame_ts = _latest_frame_ts
                stream_error = _camera_error
            if frame_bytes:
                break
            if stream_error:
                _register_capture_failure(device, "stream_error")
                return {"ok": False, "error": stream_error}
            time.sleep(0.05)
        if not frame_bytes:
            _register_capture_failure(device, "no_frame_stream")
            return {"ok": False, "error": "No frame available from stream"}

        try:
            with open(output_path, "wb") as handle:
                handle.write(frame_bytes)
        except Exception as exc:
            _register_capture_failure(device, "write_failed")
            return {"ok": False, "error": f"Failed to write image to disk: {exc}"}

        width_px = 0
        height_px = 0
        try:
            import numpy as np  # type: ignore

            decoded = cv2.imdecode(np.frombuffer(frame_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
            if decoded is not None:
                height_px, width_px = decoded.shape[:2]
        except Exception:
            pass

        capture_latency_ms = int((time.time() - (frame_ts or start_ts)) * 1000)
        record_camera_capture_latency(device, capture_latency_ms)
        record_camera_frame_bytes(device, len(frame_bytes))
        return {
            "ok": True,
            "artifact_path": str(output_path),
            "timestamp_ms": timestamp_ms,
            "capture_latency_ms": capture_latency_ms,
            "width": width_px,
            "height": height_px,
            "thumbnail_base64": base64.b64encode(frame_bytes).decode("ascii"),
        }

    cap = cv2.VideoCapture(device)
    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        cap.set(cv2.CAP_PROP_FPS, fps)

        for _ in range(max(warmup_frames, 0)):
            cap.read()

        start_ts = time.time()
        ok, frame = cap.read()
        if not ok or frame is None:
            _register_capture_failure(device, "read_failed")
            return {"ok": False, "error": "Failed to read frame from camera"}

        write_ok = cv2.imwrite(str(output_path), frame)
        if not write_ok:
            _register_capture_failure(device, "write_failed")
            return {"ok": False, "error": "Failed to write image to disk"}

        success, buffer = cv2.imencode(".jpg", frame)
        thumbnail_base64 = base64.b64encode(buffer).decode("ascii") if success else ""
        capture_latency_ms = int((time.time() - start_ts) * 1000)
        record_camera_capture_latency(device, capture_latency_ms)
        frame_bytes = int(getattr(frame, "nbytes", frame.size))
        record_camera_frame_bytes(device, frame_bytes)

        return {
            "ok": True,
            "artifact_path": str(output_path),
            "timestamp_ms": timestamp_ms,
            "capture_latency_ms": capture_latency_ms,
            "width": frame.shape[1],
            "height": frame.shape[0],
            "thumbnail_base64": thumbnail_base64,
        }
    finally:
        cap.release()


def stream_mjpeg(
    duration_s: int = 15,
    fps: int = 15,
    width: Optional[int] = None,
    height: Optional[int] = None,
) -> Generator[bytes, None, None]:
    interval = 1.0 / max(fps, 1)
    end_time = time.time() + max(duration_s, 1)
    started_here = False

    if not (_camera_thread and _camera_thread.is_alive()):
        start_stream(target_fps=fps, duration_s=duration_s, width=width, height=height)
        started_here = True

    last_frame_ts: Optional[float] = None
    try:
        while time.time() < end_time:
            with _camera_lock:
                frame_bytes = _latest_frame
                frame_ts = _latest_frame_ts
                stream_error = _camera_error

            if stream_error:
                time.sleep(0.2)
                continue

            if frame_bytes and frame_ts and frame_ts != last_frame_ts:
                last_frame_ts = frame_ts
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )
            time.sleep(interval)
    finally:
        if started_here:
            stop_stream()


def get_camera_health_snapshot(window_s: int = 60) -> Dict[str, Any]:
    global _stale_since, _low_fps_since
    now = time.time()
    with _camera_lock:
        running = _camera_thread is not None and _camera_thread.is_alive()
        last_age_ms = (now - _latest_frame_ts) * 1000.0 if _latest_frame_ts else None
        target_fps = _target_fps
        actual_fps = _actual_fps
        error = _camera_error
        dropped_frames = _dropped_frames

    if last_age_ms is not None and last_age_ms > 500:
        if _stale_since is None:
            _stale_since = now
    else:
        _stale_since = None

    if target_fps and actual_fps and actual_fps < (0.7 * target_fps):
        if _low_fps_since is None:
            _low_fps_since = now
    else:
        _low_fps_since = None

    if window_s > 0:
        cutoff = now - window_s
        while _capture_failures and _capture_failures[0] < cutoff:
            _capture_failures.pop(0)
    recent_failures = len(_capture_failures)

    reasons = []
    if _stale_since and (now - _stale_since) > 5:
        reasons.append("frame_stale")
    if _low_fps_since and (now - _low_fps_since) > 5:
        reasons.append("low_fps")
    if recent_failures > 0:
        reasons.append("capture_failures")
    if error:
        reasons.append("stream_error")

    return {
        "running": running,
        "last_frame_age_ms": last_age_ms,
        "target_fps": target_fps,
        "actual_fps": actual_fps,
        "dropped_frames": dropped_frames,
        "recent_failures": recent_failures,
        "degraded": bool(reasons),
        "reasons": reasons,
    }

