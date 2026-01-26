#!/usr/bin/env python3
"""
Wrapper script to start uvicorn with correct PYTHONPATH.
"""
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
COMMON_PATH = SCRIPT_DIR.parent / "common"
COMMON_PATH_STR = str(COMMON_PATH.resolve())

current_dir = str(SCRIPT_DIR.resolve())
current_pythonpath = os.environ.get("PYTHONPATH", "")
os.environ["PYTHONPATH"] = f"{current_dir}:{COMMON_PATH_STR}:{current_pythonpath}"

if not (COMMON_PATH / "app").exists():
    print(f"❌ Error: Common framework not found at {COMMON_PATH}/app")
    sys.exit(1)

os.chdir(SCRIPT_DIR)

current_dir = os.getcwd()
parent_dir = str(Path(current_dir).parent)
for path_to_remove in ['', '.', parent_dir]:
    while path_to_remove in sys.path:
        sys.path.remove(path_to_remove)

if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if COMMON_PATH_STR not in sys.path:
    sys.path.insert(1, COMMON_PATH_STR)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SO101_PORT", "9101"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )

