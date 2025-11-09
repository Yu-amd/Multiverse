# Multiverse Backend Metrics Service

Real-time system metrics service for Multiverse AI Model Playground.

## Features

- Real-time CPU, memory, GPU metrics via WebSocket
- NVIDIA GPU support via `pynvml`
- AMD ROCm GPU support via `rocm-smi`
- Battery metrics (if available)
- HTTP endpoint for one-time metrics fetch
- CORS enabled for frontend integration

## Installation

**Important**: This project uses a Python virtual environment to avoid conflicts with system packages.

### Option 1: Using the Start Script (Recommended)

```bash
cd backend
./start.sh
```

The script will automatically:
1. Create a virtual environment if it doesn't exist
2. Install all dependencies
3. Start the server

### Option 2: Manual Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/Mac
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start the server
python metrics_server.py
```

Or using uvicorn directly:

```bash
uvicorn metrics_server:app --host 0.0.0.0 --port 8000
```

### Troubleshooting

If you get an error about `python3-venv` not being installed:

```bash
# On Ubuntu/Debian
sudo apt install python3-venv

# On Fedora/RHEL
sudo dnf install python3-venv
```

The service will be available at:
- **Root**: `http://localhost:8000/` - Service info and available endpoints
- **WebSocket**: `ws://localhost:8000/ws/metrics` - Real-time metrics stream
- **HTTP API**: `http://localhost:8000/api/metrics` - One-time metrics fetch
- **Health check**: `http://localhost:8000/api/health` - Health check

**Note**: The frontend runs on port **5173** (Vite dev server) and automatically connects to the backend on port **8000**.

## Testing WebSocket Connection

**Important**: WebSocket endpoints (`/ws/metrics`) cannot be accessed via HTTP GET in a browser. They require a WebSocket connection.

### Option 1: Use the Frontend (Recommended)
The frontend automatically connects to the WebSocket when it loads. Just start the frontend:
```bash
npm run dev
```
Then open `http://localhost:5173` and check the browser console for `[Backend Metrics] WebSocket connected`.

### Option 2: Use the Test Page
A simple HTML test page is available:
```bash
# Open in browser
open backend/test_websocket.html
# Or
xdg-open backend/test_websocket.html
```

### Option 3: Use Browser DevTools
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/metrics');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Metrics:', JSON.parse(e.data));
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Closed');
```

### Option 4: Use curl (for HTTP endpoints only)
WebSocket endpoints don't work with curl, but you can test HTTP endpoints:
```bash
curl http://localhost:8000/api/metrics
curl http://localhost:8000/api/health
```

## API Endpoints

### WebSocket: `/ws/metrics`
Real-time metrics stream. Sends metrics every second.

### GET `/api/metrics`
One-time metrics fetch. Returns current system metrics.

### GET `/api/health`
Health check endpoint.

## Metrics Format

```json
{
  "timestamp": "2024-01-01T12:00:00",
  "cpu": {
    "utilization": 45.2,
    "cores": 8,
    "frequency": 3200.0,
    "maxFrequency": 4200.0
  },
  "memory": {
    "total": 17179869184,
    "used": 8589934592,
    "available": 8589934592,
    "percent": 50.0,
    "swapTotal": 8589934592,
    "swapUsed": 0,
    "swapPercent": 0.0
  },
  "gpu": {
    "model": "NVIDIA GeForce RTX 4090",
    "vendor": "NVIDIA",
    "memoryTotal": 25769803776,
    "memoryUsed": 12884901888,
    "memoryFree": 12884901888,
    "memoryPercent": 50.0,
    "utilization": 75.0,
    "memoryUtilization": 60.0,
    "temperature": 65,
    "powerDraw": 350.0,
    "graphicsClock": 2520,
    "memoryClock": 10501
  },
  "battery": {
    "level": 85.0,
    "charging": false,
    "timeRemaining": 7200
  }
}
```

### Health Check Response

```json
{
  "status": "healthy",
  "nvidia_available": false,
  "rocm_available": true,
  "gpu_support": "AMD/ROCm",
  "platform": "Linux"
}
```

## Dependencies

- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `websockets`: WebSocket support
- `psutil`: System metrics
- `pynvml`: NVIDIA GPU metrics (optional)
- `pydantic`: Data validation

## Virtual Environment

This project uses a Python virtual environment to avoid conflicts with system packages. The start scripts (`start.sh` for Linux/Mac and `start.bat` for Windows`) automatically create and manage the virtual environment.

If you prefer to manage it manually:

```bash
# Create virtual environment
python3 -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Deactivate when done
deactivate
```

## Notes

- NVIDIA metrics require `pynvml` and NVIDIA drivers
- AMD ROCm metrics require `rocm-smi` to be installed and in PATH
- Battery metrics are only available on laptops
- The service gracefully falls back if GPU libraries are not available
- **Always use a virtual environment** to avoid conflicts with system packages

