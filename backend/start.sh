#!/bin/bash
# Start script for Multiverse Backend Metrics Service

echo "Starting Multiverse Backend Metrics Service..."
echo ""

# Pick a compatible Python (avoid system Python 3.13 for pydantic-core)
if command -v python3.10 &> /dev/null; then
    PYTHON_BIN="$(command -v python3.10)"
elif command -v python3.11 &> /dev/null; then
    PYTHON_BIN="$(command -v python3.11)"
elif command -v python3.12 &> /dev/null; then
    PYTHON_BIN="$(command -v python3.12)"
elif command -v python3 &> /dev/null; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "Error: python3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment with $PYTHON_BIN..."
    "$PYTHON_BIN" -m venv venv
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create virtual environment"
        echo "You may need to install python3-venv:"
        echo "  sudo apt install python3-venv"
        exit 1
    fi
fi

if [ ! -f "venv/bin/activate" ]; then
    echo "Error: Virtual environment activation script missing."
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

# Start the server
echo ""
echo "Starting server on http://localhost:8000"
echo "WebSocket endpoint: ws://localhost:8000/ws/metrics"
echo "Press Ctrl+C to stop"
echo ""
python3 metrics_server.py

