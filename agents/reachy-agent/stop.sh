#!/bin/bash
# Stop script for Reachy Agent

echo "🛑 Stopping Reachy Agent on port 9001..."

# Find and kill processes on port 9001
PIDS=$(lsof -ti:9001 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No process running on port 9001"
else
    echo "   Found processes: $PIDS"
    kill $PIDS 2>/dev/null
    sleep 2
    
    # Force kill if still running
    REMAINING=$(lsof -ti:9001 2>/dev/null)
    if [ ! -z "$REMAINING" ]; then
        echo "   Force killing..."
        kill -9 $REMAINING 2>/dev/null
        sleep 1
    fi
    
    echo "✅ Stopped"
fi

