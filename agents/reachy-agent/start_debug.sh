#!/bin/bash
# Start script for Reachy Agent with debug output

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Run: python3 -m venv venv"
    exit 1
fi

# Set PYTHONPATH to include common framework (absolute path)
COMMON_PATH="$(cd "$(dirname "$SCRIPT_DIR")/common" && pwd)"
export PYTHONPATH="$COMMON_PATH:$PYTHONPATH"

echo "🚀 Starting Reachy Agent (DEBUG MODE)..."
echo "   PYTHONPATH: $PYTHONPATH"
echo "   Common path: $COMMON_PATH"
echo "   CWD: $(pwd)"
echo "   Verifying common framework exists..."
if [ ! -d "$COMMON_PATH/app" ]; then
    echo "❌ Error: Common framework not found at $COMMON_PATH/app"
    exit 1
fi
echo "✅ Common framework found"
echo ""

# Check if port 9001 is in use
if lsof -ti:9001 > /dev/null 2>&1; then
    echo "⚠️  Port 9001 is already in use"
    echo "   Killing existing process..."
    lsof -ti:9001 | xargs kill 2>/dev/null
    sleep 2
    if lsof -ti:9001 > /dev/null 2>&1; then
        echo "   Force killing..."
        lsof -ti:9001 | xargs kill -9 2>/dev/null
        sleep 1
    fi
    echo "✅ Port 9001 is now free"
    echo ""
fi

# Test import first
echo "🧪 Testing import..."
python3 -c "
import sys
import os
from pathlib import Path

# Simulate what main.py does
_this_file = Path('app/main.py').resolve()
common_parent = _this_file.parent.parent.parent / 'common'
common_parent_str = str(common_parent.resolve())

print(f'   File: {_this_file}')
print(f'   Common: {common_parent_str}')
print(f'   Exists: {common_parent.exists()}')
print(f'   CWD: {os.getcwd()}')
print(f'   Sys.path before: {sys.path[:3]}')

# Remove current directory from sys.path to avoid conflicts
if '' in sys.path:
    sys.path.remove('')
if '.' in sys.path:
    sys.path.remove('.')

# Add common path FIRST
if common_parent_str not in sys.path:
    sys.path.insert(0, common_parent_str)

print(f'   Sys.path after: {sys.path[:3]}')
print(f'   Checking: {(Path(common_parent_str) / \"app\" / \"models.py\").exists()}')

import importlib
try:
    common_models = importlib.import_module('app.models')
    print('   ✅ Import test: OK')
except Exception as e:
    print(f'   ❌ Import test failed: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
" || exit 1

echo "✅ Import test passed"
echo ""

# Start uvicorn with explicit PYTHONPATH in environment
# Use python -m uvicorn to ensure environment is preserved in subprocesses
export PYTHONPATH="$COMMON_PATH:$PYTHONPATH"
python -m uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload --log-level debug

