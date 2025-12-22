#!/usr/bin/env python3
"""
Wrapper script to start uvicorn with correct PYTHONPATH.
This ensures the environment is preserved in subprocesses.
"""
import os
import sys
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()
COMMON_PATH = SCRIPT_DIR.parent / "common"
COMMON_PATH_STR = str(COMMON_PATH.resolve())

# CRITICAL: Set PYTHONPATH in environment BEFORE any imports
# IMPORTANT: Put CURRENT directory FIRST so uvicorn finds our app.main, not common's
# Then add common directory so our code can import common framework modules
current_dir = str(SCRIPT_DIR.resolve())
current_pythonpath = os.environ.get("PYTHONPATH", "")
# Put current directory first, then common, then existing PYTHONPATH
os.environ["PYTHONPATH"] = f"{current_dir}:{COMMON_PATH_STR}:{current_pythonpath}"
print(f"PYTHONPATH set to: {os.environ['PYTHONPATH']}")

# Verify common framework exists
if not (COMMON_PATH / "app").exists():
    print(f"❌ Error: Common framework not found at {COMMON_PATH}/app")
    sys.exit(1)

# Change to script directory
os.chdir(SCRIPT_DIR)

# CRITICAL: Manipulate sys.path BEFORE importing uvicorn
# We need BOTH the current directory (for uvicorn to find our app.main)
# AND the common directory (for our code to import common framework modules)
# The order matters: current directory first so uvicorn finds our app.main,
# then common directory so our imports work
current_dir = os.getcwd()
parent_dir = str(Path(current_dir).parent)

# Remove problematic entries (empty strings, parent directory)
# BUT KEEP current_dir so uvicorn can find our app.main!
for path_to_remove in ['', '.', parent_dir]:
    while path_to_remove in sys.path:
        sys.path.remove(path_to_remove)

# Ensure current directory is in sys.path (for uvicorn to find app.main)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Add common path AFTER current directory
# This way: current_dir is first (uvicorn finds our app.main),
# then common_dir (our code can import common modules)
if COMMON_PATH_STR not in sys.path:
    sys.path.insert(1, COMMON_PATH_STR)  # Insert at index 1, after current_dir

# Now import and run uvicorn
if __name__ == "__main__":
    import uvicorn
    
    # Verify the setup worked
    if COMMON_PATH_STR not in sys.path[:3]:
        print(f"❌ Error: Common path not in sys.path. First 3 entries: {sys.path[:3]}")
        sys.exit(1)
    
    print(f"✅ Starting with PYTHONPATH={os.environ.get('PYTHONPATH', 'NOT SET')}")
    print(f"✅ Common path in sys.path: {COMMON_PATH_STR in sys.path}")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=9001,
        reload=True,
        log_level="info"
    )

