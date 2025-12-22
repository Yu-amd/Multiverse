#!/bin/bash
# Fix: Kill wrong agent and start correct Reachy agent

echo "🔧 Fixing agent setup..."
echo ""

# Kill the process running on port 9001
echo "1. Stopping agent on port 9001..."
kill $(lsof -t -i:9001) 2>/dev/null
sleep 2

# Verify it's stopped
if lsof -i :9001 > /dev/null 2>&1; then
    echo "⚠️  Process still running, force killing..."
    kill -9 $(lsof -t -i:9001) 2>/dev/null
    sleep 1
fi

echo "✅ Port 9001 is now free"
echo ""

# Navigate to correct directory
cd "$(dirname "$0")"

# Check if we're in the right place
if [ ! -f "app/main.py" ]; then
    echo "❌ Error: Not in reachy-agent directory!"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "2. Starting Reachy agent from correct location..."
echo "   Directory: $(pwd)"
echo ""

# Activate venv and start
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Virtual environment activated"
else
    echo "⚠️  No venv found, creating one..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

echo ""
echo "3. Starting uvicorn..."
echo "   Run this command:"
echo "   uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload"
echo ""
echo "   Or run this script with --start flag to auto-start"
echo ""

if [ "$1" == "--start" ]; then
    uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
fi

