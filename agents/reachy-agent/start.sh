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

# Read configuration from config file if it exists
CONFIG_FILE="$SCRIPT_DIR/.reachy_config.json"
if [ -f "$CONFIG_FILE" ]; then
    # Parse config file using Python (more reliable than shell parsing)
    HARDWARE_ENABLED=$(python3 -c "import json; config = json.load(open('$CONFIG_FILE')); print('true' if config.get('hardware_enabled', True) else 'false')" 2>/dev/null || echo "true")
    AUDIO_ENABLED=$(python3 -c "import json; config = json.load(open('$CONFIG_FILE')); print('true' if config.get('audio_enabled', True) else 'false')" 2>/dev/null || echo "true")
else
    # Default configuration (hardware enabled, audio enabled)
    HARDWARE_ENABLED="true"
    AUDIO_ENABLED="true"
fi

# Set environment variables from config file (can be overridden by environment)
# REACHY_MOCKED=false means hardware enabled, REACHY_MOCKED=true means hardware disabled
if [ "$HARDWARE_ENABLED" = "true" ]; then
    export REACHY_MOCKED="${REACHY_MOCKED:-false}"
else
    export REACHY_MOCKED="${REACHY_MOCKED:-true}"
fi

export REACHY_AUDIO_ENABLED="${REACHY_AUDIO_ENABLED:-$AUDIO_ENABLED}"

echo "📋 Configuration:"
echo "   Config file: $CONFIG_FILE"
echo "   Hardware enabled: $HARDWARE_ENABLED"
echo "   Audio enabled: $AUDIO_ENABLED"
echo "   REACHY_MOCKED=${REACHY_MOCKED} (hardware mode: $([ "$REACHY_MOCKED" = "false" ] && echo "enabled" || echo "disabled"))"
echo "   REACHY_AUDIO_ENABLED=${REACHY_AUDIO_ENABLED} (audio: $([ "$REACHY_AUDIO_ENABLED" = "true" ] && echo "enabled" || echo "disabled"))"
echo ""

# If hardware is enabled, ensure daemon is running
if [ "$HARDWARE_ENABLED" = "true" ]; then
    echo "🔧 Hardware enabled - checking Reachy Mini daemon..."
    if ! pgrep -f "reachy-mini-daemon" > /dev/null 2>&1; then
        echo "   Daemon not running - starting it..."
        source venv/bin/activate
        nohup reachy-mini-daemon --fastapi-port 8001 --headless > daemon.log 2>&1 &
        DAEMON_PID=$!
        echo "   ✅ Daemon started (PID: $DAEMON_PID)"
        echo "   Waiting 5 seconds for daemon to initialize..."
        sleep 5
        if pgrep -f "reachy-mini-daemon" > /dev/null 2>&1; then
            echo "   ✅ Daemon is running"
        else
            echo "   ⚠️  Daemon may have failed to start - check daemon.log"
        fi
    else
        echo "   ✅ Daemon is already running"
    fi
    echo ""
fi

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

