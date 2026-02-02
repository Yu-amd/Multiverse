from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Protocol

from lerobot.robots.lekiwi import LeKiwi, LeKiwiConfig


class BaseController(Protocol):
    def set_velocity(self, linear: float, angular: float) -> None: ...
    def stop(self) -> None: ...


class ArmController(Protocol):
    def play_sequence(self, sequence_id: str) -> int: ...


@dataclass
class PoseStep:
    pose: Dict[str, float] | None
    hold_s: float


class LeRobotBackend:
    def __init__(
        self,
        robot_id: str,
        port: str,
        calibration_dir: Path | None = None,
        use_degrees: bool = False,
    ) -> None:
        self.robot_id = robot_id
        self.port = port
        self.calibration_dir = calibration_dir
        self.use_degrees = use_degrees
        self._robot: LeKiwi | None = None

    def ensure_connected(self) -> LeKiwi:
        if self._robot and self._robot.is_connected:
            return self._robot
        config = LeKiwiConfig(
            id=self.robot_id,
            port=self.port,
            use_degrees=self.use_degrees,
            cameras={},
            calibration_dir=self.calibration_dir,
        )
        robot = LeKiwi(config)
        robot.bus.connect()
        if robot.calibration:
            robot.bus.write_calibration(robot.calibration)
        robot.configure()
        self._robot = robot
        return robot

    def stop_base(self) -> None:
        robot = self.ensure_connected()
        robot.stop_base()

    def send_base_command(self, linear: float, angular: float) -> None:
        robot = self.ensure_connected()
        pose = self._get_current_arm_pose(robot)
        action = {f"{name}.pos": value for name, value in pose.items()}
        action.update({"x.vel": float(linear), "y.vel": 0.0, "theta.vel": float(angular)})
        robot.send_action(action)

    def play_pose_sequence(self, steps: Iterable[PoseStep]) -> int:
        robot = self.ensure_connected()
        steps_executed = 0
        for step in steps:
            pose = self._get_current_arm_pose(robot)
            if step.pose:
                pose.update(step.pose)
            action = {f"{name}.pos": value for name, value in pose.items()}
            action.update({"x.vel": 0.0, "y.vel": 0.0, "theta.vel": 0.0})
            robot.send_action(action)
            time.sleep(max(step.hold_s, 0.0))
            steps_executed += 1
        return steps_executed

    def _get_current_arm_pose(self, robot: LeKiwi) -> Dict[str, float]:
        observation = robot.get_observation()
        return {
            key.replace(".pos", ""): float(value)
            for key, value in observation.items()
            if key.startswith("arm_") and key.endswith(".pos")
        }


class LeRobotBaseController(BaseController):
    def __init__(self, backend: LeRobotBackend) -> None:
        self._backend = backend

    def set_velocity(self, linear: float, angular: float) -> None:
        self._backend.send_base_command(linear=linear, angular=angular)

    def stop(self) -> None:
        self._backend.stop_base()


class LeRobotArmController(ArmController):
    def __init__(self, backend: LeRobotBackend, sequence_dir: Path) -> None:
        self._backend = backend
        self._sequence_dir = sequence_dir

    def play_sequence(self, sequence_id: str) -> int:
        sequence_path = self._sequence_dir / f"{sequence_id}.json"
        steps = load_pose_sequence(sequence_path)
        return self._backend.play_pose_sequence(steps)


def load_pose_sequence(sequence_path: Path) -> list[PoseStep]:
    if not sequence_path.exists():
        raise FileNotFoundError(f"Sequence file not found: {sequence_path}")
    with sequence_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    poses = payload.get("poses", [])
    steps: list[PoseStep] = []
    for entry in poses:
        step_pose = entry.get("pose")
        hold_s = float(entry.get("hold_s", 0.5))
        steps.append(PoseStep(pose=step_pose, hold_s=hold_s))
    if not steps:
        raise ValueError("Sequence file did not contain any poses")
    return steps

