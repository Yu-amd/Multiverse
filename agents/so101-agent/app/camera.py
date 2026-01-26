"""
Camera capture for SO-101 follower camera.
Captures a single frame and saves it as a JPG artifact.
"""
import base64
from pathlib import Path
from typing import Dict, Any

from .config_manager import get_camera_settings


def capture_frame(run_id: str) -> Dict[str, Any]:
    cfg = get_camera_settings()
    device = cfg.get("device", "/dev/robot_cam")
    width = int(cfg.get("width", 1920))
    height = int(cfg.get("height", 1080))
    fps = int(cfg.get("fps", 30))

    try:
        import cv2  # type: ignore
    except Exception as exc:
        return {
            "ok": False,
            "error": f"OpenCV not available: {exc}",
        }

    output_dir = Path(__file__).parent.parent / "runs" / run_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "so101_follower.jpg"

    cap = cv2.VideoCapture(device)
    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        cap.set(cv2.CAP_PROP_FPS, fps)

        ok, frame = cap.read()
        if not ok or frame is None:
            return {"ok": False, "error": "Failed to read frame from camera"}

        write_ok = cv2.imwrite(str(output_path), frame)
        if not write_ok:
            return {"ok": False, "error": "Failed to write image to disk"}

        success, buffer = cv2.imencode(".jpg", frame)
        thumbnail_base64 = base64.b64encode(buffer).decode("ascii") if success else ""

        return {
            "ok": True,
            "path": str(output_path),
            "width": frame.shape[1],
            "height": frame.shape[0],
            "thumbnail_base64": thumbnail_base64,
        }
    finally:
        cap.release()

