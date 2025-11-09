#!/bin/bash
# Start script for Multiverse Backend Metrics Service

echo "Starting Multiverse Backend Metrics Service..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create virtual environment"
        echo "You may need to install python3-venv:"
        echo "  sudo apt install python3-venv"
        exit 1
    fi
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

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

