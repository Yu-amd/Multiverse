#!/bin/bash
# Start script for Reachy Agent

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

# Verify PYTHONPATH is set correctly
if [ -z "$PYTHONPATH" ] || [[ ! "$PYTHONPATH" == *"$COMMON_PATH"* ]]; then
    echo "❌ Error: PYTHONPATH not set correctly"
    echo "   Expected: $COMMON_PATH"
    echo "   Got: $PYTHONPATH"
    exit 1
fi

echo "🚀 Starting Reachy Agent..."
echo "   PYTHONPATH: $PYTHONPATH"
echo "   Common path: $COMMON_PATH"
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

# Start uvicorn using Python wrapper script
# This ensures PYTHONPATH is set correctly in all subprocesses
python run.py

