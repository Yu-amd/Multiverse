#!/bin/bash
# Start Reachy Mini daemon (handling port 8000 conflict)

echo "============================================================"
echo "Starting Reachy Mini Daemon"
echo "============================================================"
echo

# Check if port 8000 is in use
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use (likely Multiverse UI)"
    echo "   The daemon needs port 8000 for its dashboard"
    echo "   Options:"
    echo "   1. Stop Multiverse UI temporarily"
    echo "   2. Use a different port (if daemon supports it)"
    echo
    read -p "Stop Multiverse UI and start daemon? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping processes on port 8000..."
        lsof -ti :8000 | xargs kill -9 2>/dev/null
        sleep 2
    else
        echo "Cannot start daemon - port 8000 is required"
        exit 1
    fi
fi

# Check if daemon is already running
if pgrep -f "reachy-mini-daemon" > /dev/null; then
    echo "⚠️  Daemon is already running!"
    echo "   PID: $(pgrep -f 'reachy-mini-daemon')"
    exit 0
fi

# Start daemon
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate

echo "Starting daemon..."
nohup reachy-mini-daemon > daemon.log 2>&1 &
DAEMON_PID=$!

echo "✅ Daemon started (PID: $DAEMON_PID)"
echo "   Logs: daemon.log"
echo
echo "Waiting 10 seconds for daemon to fully initialize..."
sleep 10

# Check if daemon is still running
if pgrep -f "reachy-mini-daemon" > /dev/null; then
    echo "✅ Daemon is running!"
    echo
    echo "Checking port 7447..."
    if nc -zv localhost 7447 2>&1 | grep -q "succeeded"; then
        echo "✅ Port 7447 is accessible!"
        echo
        echo "🎉 Daemon is ready!"
        echo
        echo "Next steps:"
        echo "  1. Test connection: python test_connection.py"
        echo "  2. Access dashboard: http://localhost:8000"
        echo "  3. Start the agent: export REACHY_MOCKED=false && ./start.sh"
    else
        echo "⚠️  Port 7447 not yet accessible (may need more time)"
        echo "   Check daemon.log for details"
    fi
else
    echo "❌ Daemon failed to start or crashed"
    echo "   Check daemon.log for errors:"
    tail -20 daemon.log
fi

echo
echo "============================================================"
echo "Daemon Management"
echo "============================================================"
echo "View logs:     tail -f daemon.log"
echo "Stop daemon:   pkill -f reachy-mini-daemon"
echo "Check status:  pgrep -f reachy-mini-daemon"
echo

