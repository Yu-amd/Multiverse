from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass
class LeKiwiAgentConfig:
    device_id: str = "lekiwi-001"
    robot_port: str = "/dev/ttyACM0"
    api_port: int = 8008
    sequence_dir: str = "/home/raspberry/Multiverse/assets/motions"
    calibration_dir: str | None = None


def load_config(config_path: Path) -> LeKiwiAgentConfig:
    if not config_path.exists():
        return LeKiwiAgentConfig()
    with config_path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    return LeKiwiAgentConfig(
        device_id=str(payload.get("device_id", LeKiwiAgentConfig.device_id)),
        robot_port=str(payload.get("robot_port", LeKiwiAgentConfig.robot_port)),
        api_port=int(payload.get("api_port", LeKiwiAgentConfig.api_port)),
        sequence_dir=str(payload.get("sequence_dir", LeKiwiAgentConfig.sequence_dir)),
        calibration_dir=payload.get("calibration_dir"),
    )


def resolve_config_path(config_path: str | None) -> Path:
    if config_path:
        return Path(config_path).expanduser()
    return Path(__file__).resolve().parent.parent / "config.yaml"

