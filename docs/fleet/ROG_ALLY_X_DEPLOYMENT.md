# ROG Ally X Deployment Guide

## Overview

The fleet system is designed to run on the **ASUS ROG Ally X** handheld device as the fleet control plane. Both the existing Multiverse UI and the new Phase 0 agent framework support ROG Ally X deployment.

## Current Support Status

### ✅ Multiverse UI (Frontend)
- **Status**: Fully supported
- **Technology**: React/TypeScript web app
- **Detection**: Already detects ROG Ally X hardware (Z2E processor)
- **Layout**: Optimized single-column layout for handheld
- **Screenshots**: See `docs/screenshots/rog-ally-x.png`

### ✅ Agent Framework (Phase 0 Backend)
- **Status**: Fully supported
- **Technology**: Python/FastAPI
- **Requirements**: Python 3.10+, standard dependencies
- **Deployment**: Can run directly on ROG Ally X (Windows/Linux)

## Deployment Options

### Option 1: Full Stack on ROG Ally X

Run both the Multiverse UI and agent framework on the ROG Ally X:

```bash
# Terminal 1: Start Multiverse UI
cd /home/yw/Desktop/Multiverse
npm install
npm run dev

# Terminal 2: Start Agent Framework
cd /home/yw/Desktop/Multiverse/agents/common
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 9001
```

### Option 2: UI on ROG Ally X, Agents on Edge Devices

- **ROG Ally X**: Runs Multiverse UI (fleet control plane)
- **Strix Halo**: Runs agent frameworks (one per robot)
- **Network**: ROG Ally X connects to agents via WiFi/LAN

### Option 3: Development Setup

- **ROG Ally X**: Development and testing
- **Production**: Deploy agents to Strix Halo edge devices

## ROG Ally X Specifications

- **Processor**: AMD Z2E (Ryzen Z2 Extreme)
- **GPU**: AMD RDNA 3.5 (16 compute units)
- **Memory**: 16GB shared
- **OS**: Windows 11 / Linux
- **Display**: 7" 1080p touchscreen
- **Network**: WiFi 6E, USB-C

## System Requirements

### For Multiverse UI
- Node.js 18+ (or use portable Node.js)
- Modern browser (Chromium-based recommended)
- 2GB+ RAM available
- WiFi/LAN connection

### For Agent Framework
- Python 3.10+
- 1GB+ RAM available
- WiFi/LAN connection
- Optional: ROS 2 (for robot agents in Phase 1+)

## Installation on ROG Ally X

### 1. Install Node.js (for Multiverse UI)

**Windows:**
```powershell
# Download Node.js from nodejs.org
# Or use winget
winget install OpenJS.NodeJS
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install nodejs npm

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### 2. Install Python (for Agent Framework)

**Windows:**
```powershell
# Download Python from python.org
# Or use winget
winget install Python.Python.3.12
```

**Linux:**
```bash
sudo apt install python3 python3-venv python3-pip
```

### 3. Clone and Setup

```bash
# Clone repository
git clone <repo-url>
cd Multiverse

# Setup Multiverse UI
npm install

# Setup Agent Framework
cd agents/common
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running on ROG Ally X

### Start Multiverse UI

```bash
cd /path/to/Multiverse
npm run dev
```

Access at: `http://localhost:5173`

### Start Agent Framework

```bash
cd /path/to/Multiverse/agents/common
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 9001
```

Access at: `http://localhost:9001`

## Network Configuration

### For Local Development
- UI: `http://localhost:5173`
- Agent: `http://localhost:9001`
- No network configuration needed

### For Network Deployment
- UI: `http://<rog-ally-ip>:5173`
- Agent: `http://<rog-ally-ip>:9001`
- Ensure firewall allows connections

### For Fleet Control (Phase 4)
- ROG Ally X connects to agents on Strix Halo devices
- Agents accessible via: `http://<strix-halo-ip>:9001`
- Configure agent URLs in Multiverse UI settings

## Performance Considerations

### ROG Ally X Capabilities
- **CPU**: Excellent for UI rendering and light backend tasks
- **GPU**: Can handle UI rendering, not for heavy AI inference
- **Memory**: 16GB shared - sufficient for UI + multiple agents
- **Battery**: Consider power management for extended use

### Recommendations
1. **UI on ROG Ally X**: ✅ Recommended - lightweight React app
2. **Agent Framework on ROG Ally X**: ✅ Works for development/testing
3. **Production Agents**: Deploy to Strix Halo for better performance
4. **Heavy AI Inference**: Use AIM backend (MI300X) - not on ROG Ally X

## Testing on ROG Ally X

### Verify UI Works
```bash
# Start UI
npm run dev

# Open browser
# Navigate to http://localhost:5173
# Check that ROG Ally X is detected (see GPU info)
```

### Verify Agent Framework Works
```bash
# Start agent
uvicorn app.main:app --host 0.0.0.0 --port 9001

# Test from browser or curl
curl http://localhost:9001/v1/agent/info
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :9001  # Windows
lsof -i :9001                 # Linux

# Kill process or use different port
uvicorn app.main:app --port 9002
```

### Python Not Found
```bash
# Check Python version
python3 --version

# Use full path if needed
/usr/bin/python3 -m venv venv
```

### Network Issues
- Ensure WiFi is connected
- Check firewall settings
- Verify IP address: `ipconfig` (Windows) or `ip addr` (Linux)

## Future Enhancements (Phase 4)

When Phase 4 (Fleet UI) is implemented:
- Fleet overview screen optimized for ROG Ally X
- Touch-friendly controls
- Gesture support
- Battery-aware performance modes

## Summary

✅ **Multiverse UI**: Fully supported on ROG Ally X  
✅ **Agent Framework**: Fully supported on ROG Ally X  
✅ **Development**: Perfect for development and testing  
✅ **Production**: UI on ROG Ally X, agents on Strix Halo  

The ROG Ally X is an excellent platform for the fleet control plane, providing a portable, powerful interface for managing your robotics fleet.

