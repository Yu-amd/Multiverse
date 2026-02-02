from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

import yaml


@dataclass
class LeKiwiEndpointConfig:
    type: str
    name: str
    base_url: str
    device_id: str


def load_fleet_config(config_path: Path) -> List[LeKiwiEndpointConfig]:
    if not config_path.exists():
        return []
    with config_path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    endpoints = payload.get("endpoints", [])
    results: List[LeKiwiEndpointConfig] = []
    for entry in endpoints:
        if entry.get("type") != "lekiwi":
            continue
        results.append(
            LeKiwiEndpointConfig(
                type="lekiwi",
                name=str(entry.get("name", "lekiwi-01")),
                base_url=str(entry.get("base_url", "")),
                device_id=str(entry.get("device_id", "")),
            )
        )
    return results

