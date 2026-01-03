#!/bin/bash
# Start Reachy Mini daemon - workaround for port 8000 conflict
# This script tries to start the daemon even if port 8000 is in use
# The Zenoh service (port 7447) should still work even if FastAPI fails

echo "============================================================"
echo "Starting Reachy Mini Daemon (Port 8000 Workaround)"
echo "============================================================"
echo

# Check if daemon is already running
if pgrep -f "reachy-mini-daemon" > /dev/null; then
    echo "⚠️  Daemon is already running!"
    echo "   PID: $(pgrep -f 'reachy-mini-daemon')"
    exit 0
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Run: python3 -m venv venv"
    exit 1
fi

# Check if port 8000 is in use
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use"
    echo "   The daemon's FastAPI dashboard may not start, but Zenoh service (port 7447) should still work"
    echo "   Continuing anyway..."
    echo
fi

# Start daemon in background, redirecting stderr to see if FastAPI fails
echo "Starting daemon..."
echo "   Note: If FastAPI fails to bind to port 8000, Zenoh service should still work"
echo

# Start daemon - it will try to start FastAPI but Zenoh should work even if FastAPI fails
nohup reachy-mini-daemon --headless > daemon.log 2>&1 &
DAEMON_PID=$!

echo "✅ Daemon process started (PID: $DAEMON_PID)"
echo "   Logs: daemon.log"
echo
echo "Waiting 10 seconds for daemon to initialize..."
sleep 10

# Check if daemon is still running
if pgrep -f "reachy-mini-daemon" > /dev/null; then
    echo "✅ Daemon is running!"
    echo
    
    # Check if Zenoh service is available (port 7447)
    if timeout 2 bash -c 'cat < /dev/null > /dev/tcp/localhost/7447' 2>/dev/null; then
        echo "✅ Zenoh service is listening on port 7447"
    else
        echo "⚠️  Zenoh service may not be ready yet (port 7447)"
        echo "   Check daemon.log for details"
    fi
    
    echo
    echo "You can now:"
    echo "  1. Test connection: python -c 'from reachy_mini import ReachyMini; r = ReachyMini(); print(\"✅ Connected!\")'"
    echo "  2. Start the agent: ./start.sh"
    echo "  3. View logs: tail -f daemon.log"
else
    echo "❌ Daemon failed to start or crashed"
    echo "   Check daemon.log for errors:"
    tail -20 daemon.log
    exit 1
fi

echo
echo "============================================================"
echo "Daemon Status"
echo "============================================================"
echo "To stop the daemon:"
echo "  pkill -f reachy-mini-daemon"
echo
echo "To check if running:"
echo "  pgrep -f reachy-mini-daemon"
echo
echo "To check Zenoh service:"
echo "  timeout 2 bash -c 'cat < /dev/null > /dev/tcp/localhost/7447' && echo '✅ Zenoh is listening' || echo '❌ Zenoh not listening'"
echo

