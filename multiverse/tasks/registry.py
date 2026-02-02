LEKIWI_TASK_TYPES = {
    "lekiwi.move_base",
    "lekiwi.stop",
    "so101.move_pose_sequence",
}


def is_supported_task(task_type: str) -> bool:
    return task_type in LEKIWI_TASK_TYPES

