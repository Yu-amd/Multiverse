#!/bin/bash
set -euo pipefail

echo "Stopping Reachy agent..."
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:9001 | xargs -r kill -9
fi

echo "Stopping SO-101 agent..."
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:9101 | xargs -r kill -9
fi

echo "✅ Agents stopped."

