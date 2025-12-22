#!/bin/bash
# Script to check agent logs and status

echo "🔍 Checking agent status..."
echo ""

# Check if agent is running
if lsof -i :9001 > /dev/null 2>&1; then
    echo "✅ Agent is running on port 9001"
    echo ""
    echo "📋 Process info:"
    lsof -i :9001
    echo ""
    echo "💡 To see logs:"
    echo "   1. Find the terminal where you started uvicorn"
    echo "   2. Or kill the process and restart:"
    echo "      kill \$(lsof -t -i:9001)"
    echo "      uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload"
    echo ""
    echo "📊 Check task status:"
    echo "   curl http://localhost:9001/v1/tasks/9b315eb8-beb9-411b-ac95-b9e75ae71d10"
else
    echo "❌ Agent is NOT running on port 9001"
    echo "   Start it with: uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload"
fi

