"""
Camera capture for SO-101 follower camera.
Supports single-frame capture and bounded stream sessions.
"""
import base64
import threading
import time
from pathlib import Path
from typing import Dict, Any, Optional, Generator

from .config_manager import get_camera_settings

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
    global _latest_frame, _camera_error, _target_fps, _dropped_frames, _camera_stop_at, _stream_width, _stream_height
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
                time.sleep(0.2)
                continue

            success, buffer = cv2.imencode(".jpg", frame)
            if not success:
                with _camera_lock:
                    _camera_error = "Failed to encode frame"
                    _dropped_frames += 1
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

            elapsed = time.time() - start_ts
            if elapsed < interval:
                time.sleep(interval - elapsed)
    finally:
        cap.release()


def start_stream(
    target_fps: Optional[int] = None,
    duration_s: Optional[int] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
) -> Dict[str, Any]:
    global _camera_thread, _camera_stop, _camera_error, _target_fps, _avg_latency_ms, _actual_fps, _latest_frame, _latest_frame_ts, _dropped_frames, _camera_stop_at, _stream_width, _stream_height
    if _camera_thread and _camera_thread.is_alive():
        return {"ok": True, "running": True}

    cfg = get_camera_settings()
    device = cfg.get("device", "/dev/robot_cam")
    width = int(width or cfg.get("width", 1920))
    height = int(height or cfg.get("height", 1080))
    fps = int(target_fps or cfg.get("fps", 30))

    _camera_stop.clear()
    _camera_error = None
    _target_fps = fps
    _avg_latency_ms = 0.0
    _actual_fps = 0.0
    _latest_frame = None
    _latest_frame_ts = None
    _dropped_frames = 0
    _camera_stop_at = time.time() + duration_s if duration_s else None
    _stream_width = width
    _stream_height = height

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
        return {
            "running": running,
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

    try:
        import cv2  # type: ignore
    except Exception as exc:
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
                return {"ok": False, "error": stream_error}
            time.sleep(0.05)
        if not frame_bytes:
            return {"ok": False, "error": "No frame available from stream"}

        try:
            with open(output_path, "wb") as handle:
                handle.write(frame_bytes)
        except Exception as exc:
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
            return {"ok": False, "error": "Failed to read frame from camera"}

        write_ok = cv2.imwrite(str(output_path), frame)
        if not write_ok:
            return {"ok": False, "error": "Failed to write image to disk"}

        success, buffer = cv2.imencode(".jpg", frame)
        thumbnail_base64 = base64.b64encode(buffer).decode("ascii") if success else ""
        capture_latency_ms = int((time.time() - start_ts) * 1000)

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

