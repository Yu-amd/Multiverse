@echo off
REM Start script for Multiverse Backend Metrics Service (Windows)

echo Starting Multiverse Backend Metrics Service...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

if errorlevel 1 (
    echo Error: Failed to install dependencies
    exit /b 1
)

REM Start the server
echo.
echo Starting server on http://localhost:8000
echo WebSocket endpoint: ws://localhost:8000/ws/metrics
echo Press Ctrl+C to stop
echo.
python metrics_server.py

