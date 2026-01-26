#!/bin/bash
set -euo pipefail

ROOT_DIR="/home/yw/Desktop/Multiverse"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "Starting Reachy agent..."
(cd "$ROOT_DIR/agents/reachy-agent" && nohup ./start.sh > "$LOG_DIR/reachy-agent.log" 2>&1 &)

echo "Starting SO-101 agent..."
(cd "$ROOT_DIR/agents/so101-agent" && nohup ./start.sh > "$LOG_DIR/so101-agent.log" 2>&1 &)

echo "✅ Agents starting in background."
echo "Logs:"
echo "  $LOG_DIR/reachy-agent.log"
echo "  $LOG_DIR/so101-agent.log"

