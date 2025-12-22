#!/bin/bash
# Start Reachy Mini daemon

echo "============================================================"
echo "Starting Reachy Mini Daemon"
echo "============================================================"
echo

# Check if daemon is already running
if pgrep -f "reachy-mini-daemon" > /dev/null; then
    echo "⚠️  Daemon is already running!"
    echo "   PID: $(pgrep -f 'reachy-mini-daemon')"
    exit 0
fi

# Check if reachy-mini-daemon command exists
if command -v reachy-mini-daemon &> /dev/null; then
    echo "✅ Found reachy-mini-daemon command"
    echo
    echo "Starting daemon..."
    reachy-mini-daemon &
    DAEMON_PID=$!
    echo "✅ Daemon started (PID: $DAEMON_PID)"
    echo
    echo "Waiting 5 seconds for daemon to initialize..."
    sleep 5
    echo
    echo "Checking if daemon is running..."
    if pgrep -f "reachy-mini-daemon" > /dev/null; then
        echo "✅ Daemon is running!"
        echo
        echo "You can now:"
        echo "  1. Test connection: python test_connection.py"
        echo "  2. Access dashboard: http://localhost:8000"
        echo "  3. Start the agent: ./start.sh"
    else
        echo "❌ Daemon failed to start"
        echo "   Check error messages above"
    fi
elif python -m reachy_mini.daemon.app.main --help &> /dev/null; then
    echo "✅ Found daemon as Python module"
    echo
    echo "Starting daemon..."
    python -m reachy_mini.daemon.app.main &
    DAEMON_PID=$!
    echo "✅ Daemon started (PID: $DAEMON_PID)"
    echo
    echo "Waiting 5 seconds for daemon to initialize..."
    sleep 5
    echo
    echo "Checking if daemon is running..."
    if pgrep -f "reachy_mini.daemon" > /dev/null; then
        echo "✅ Daemon is running!"
        echo
        echo "You can now:"
        echo "  1. Test connection: python test_connection.py"
        echo "  2. Access dashboard: http://localhost:8000"
        echo "  3. Start the agent: ./start.sh"
    else
        echo "❌ Daemon failed to start"
        echo "   Check error messages above"
    fi
else
    echo "❌ reachy-mini-daemon not found!"
    echo
    echo "Try installing/updating the SDK:"
    echo "  pip install --upgrade reachy_mini"
    echo
    echo "Or check if daemon is in a different location:"
    echo "  which reachy-mini-daemon"
    echo "  python -c 'import reachy_mini.daemon; print(reachy_mini.daemon.__file__)'"
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

