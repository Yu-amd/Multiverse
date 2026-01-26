#!/bin/bash
# Start script for SO-101 Agent

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Run: python3 -m venv venv"
    exit 1
fi

COMMON_PATH="$(cd "$(dirname "$SCRIPT_DIR")/common" && pwd)"
export PYTHONPATH="$COMMON_PATH:$PYTHONPATH"
export HF_LEROBOT_CALIBRATION="${HF_LEROBOT_CALIBRATION:-$HOME/.cache/huggingface/lerobot/calibration}"

if [ ! -d "$COMMON_PATH/app" ]; then
    echo "❌ Error: Common framework not found at $COMMON_PATH/app"
    exit 1
fi

PORT="${SO101_PORT:-9101}"
if lsof -ti:"$PORT" > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use"
    echo "   Killing existing process..."
    lsof -ti:"$PORT" | xargs kill 2>/dev/null
    sleep 2
fi

echo "🚀 Starting SO-101 Agent on port $PORT..."
python run.py

