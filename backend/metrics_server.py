#!/usr/bin/env python3
"""
Multiverse Backend Metrics Service
Provides real-time system metrics via WebSocket
"""

import asyncio
import json
import logging
import platform
import re
import subprocess
from datetime import datetime
from typing import Dict, Optional

import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware

# Try to import NVIDIA ML library
try:
    import pynvml
    NVIDIA_AVAILABLE = True
except ImportError:
    NVIDIA_AVAILABLE = False
    print("Warning: pynvml not available. NVIDIA GPU metrics will be limited.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Multiverse Metrics Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize NVIDIA if available
if NVIDIA_AVAILABLE:
    try:
        pynvml.nvmlInit()
        logger.info("NVIDIA ML initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize NVIDIA ML: {e}")
        NVIDIA_AVAILABLE = False


class MetricsCollector:
    """Collects system metrics from various sources"""
    
    def __init__(self):
        self.nvidia_available = NVIDIA_AVAILABLE
        if self.nvidia_available:
            try:
                self.nvidia_device_count = pynvml.nvmlDeviceGetCount()
            except:
                self.nvidia_device_count = 0
        
        # Check for ROCm/AMD GPU availability
        self.rocm_available = self._check_rocm_available()
    
    def _check_rocm_available(self) -> bool:
        """Check if ROCm/AMD GPU tools are available"""
        try:
            result = subprocess.run(
                ["rocm-smi", "--version"],
                capture_output=True,
                text=True,
                timeout=1
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def get_cpu_metrics(self) -> Dict:
        """Get CPU metrics using psutil"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_count = psutil.cpu_count(logical=True)
            cpu_freq = psutil.cpu_freq()
            
            return {
                "utilization": cpu_percent,
                "cores": cpu_count,
                "frequency": cpu_freq.current if cpu_freq else None,
                "maxFrequency": cpu_freq.max if cpu_freq else None
            }
        except Exception as e:
            logger.error(f"Error getting CPU metrics: {e}")
            return {"utilization": 0, "cores": 0, "frequency": None, "maxFrequency": None}
    
    def get_memory_metrics(self) -> Dict:
        """Get memory metrics using psutil"""
        try:
            mem = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            return {
                "total": mem.total,
                "used": mem.used,
                "available": mem.available,
                "percent": mem.percent,
                "swapTotal": swap.total,
                "swapUsed": swap.used,
                "swapPercent": swap.percent
            }
        except Exception as e:
            logger.error(f"Error getting memory metrics: {e}")
            return {"total": 0, "used": 0, "available": 0, "percent": 0}
    
    def get_nvidia_gpu_metrics(self, device_index: int = 0) -> Optional[Dict]:
        """Get NVIDIA GPU metrics using pynvml"""
        if not self.nvidia_available or device_index >= self.nvidia_device_count:
            return None
        
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(device_index)
            
            # Get GPU name
            name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
            
            # Get memory info
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            
            # Get utilization
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            
            # Get temperature
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            
            # Get power usage
            try:
                power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert mW to W
            except:
                power = None
            
            # Get clock speeds
            try:
                graphics_clock = pynvml.nvmlDeviceGetClockInfo(handle, pynvml.NVML_CLOCK_GRAPHICS)
                memory_clock = pynvml.nvmlDeviceGetClockInfo(handle, pynvml.NVML_CLOCK_MEM)
            except:
                graphics_clock = None
                memory_clock = None
            
            return {
                "model": name,
                "vendor": "NVIDIA",
                "memoryTotal": mem_info.total,
                "memoryUsed": mem_info.used,
                "memoryFree": mem_info.free,
                "memoryPercent": (mem_info.used / mem_info.total) * 100,
                "utilization": util.gpu,
                "memoryUtilization": util.memory,
                "temperature": temp,
                "powerDraw": power,
                "graphicsClock": graphics_clock,
                "memoryClock": memory_clock
            }
        except Exception as e:
            logger.error(f"Error getting NVIDIA GPU metrics: {e}")
            return None
    
    def get_rocm_gpu_metrics(self) -> Optional[Dict]:
        """Get AMD ROCm GPU metrics using rocm-smi"""
        try:
            # Try JSON format first
            result = subprocess.run(
                ["rocm-smi", "--showid", "--showproductname", "--showmemuse", "--showtemp", "--showuse", "--json"],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    # Parse rocm-smi JSON output
                    # Format can be: {"card0": {...}} or {"card": [...]} or direct object
                    gpu = None
                    
                    # Try card0, card1, etc. format first
                    for key in data.keys():
                        if key.startswith("card"):
                            gpu = data[key]
                            break
                    
                    # Try card array format
                    if not gpu and "card" in data:
                        cards = data["card"]
                        if isinstance(cards, list) and len(cards) > 0:
                            gpu = cards[0]
                        elif isinstance(cards, dict):
                            gpu = cards
                    
                    # If still no GPU, try direct object
                    if not gpu and isinstance(data, dict) and "Device Name" in data:
                        gpu = data
                    
                    if gpu:
                        # Try different field names that rocm-smi might use
                        model = (gpu.get("Card Series") or 
                                gpu.get("Card series") or 
                                gpu.get("Device Name") or 
                                gpu.get("Card Model") or 
                                gpu.get("Card SKU") or 
                                gpu.get("Card Vendor") or 
                                "AMD GPU")
                        
                        # Check for Strix Halo in SKU or model
                        model_lower = model.lower()
                        sku = gpu.get("Card SKU", "").lower()
                        if "strix" in model_lower or "halo" in model_lower or "strix" in sku or "halo" in sku:
                            model = "AMD Strix Halo (RDNA 3.5)"
                        
                        # Memory in bytes - try different field names
                        mem_total = 0
                        mem_used = 0
                        
                        # Try to get memory from various fields
                        vram_total = (gpu.get("VRAM Total Memory (B)") or 
                                     gpu.get("VRAM Total Memory(B)") or 
                                     gpu.get("vram_total_memory") or 0)
                        vram_used = (gpu.get("VRAM Total Used Memory (B)") or 
                                   gpu.get("VRAM Total Used Memory(B)") or 
                                   gpu.get("vram_used_memory") or 0)
                        
                        # If memory not found, try to estimate from VRAM% or use defaults
                        if vram_total > 0:
                            mem_total = int(vram_total) if isinstance(vram_total, str) else vram_total
                            mem_used = int(vram_used) if isinstance(vram_used, str) else vram_used
                        else:
                            # Estimate from model or use defaults
                            if "strix" in model_lower or "halo" in model_lower:
                                mem_total = 16 * 1024 * 1024 * 1024  # 16GB for Strix Halo
                            else:
                                mem_total = 8 * 1024 * 1024 * 1024  # 8GB default
                            
                            # Try to get memory usage from VRAM% if available
                            vram_percent = gpu.get("GPU Memory Allocated (VRAM%)")
                            if vram_percent:
                                try:
                                    vram_pct = float(str(vram_percent).replace("%", ""))
                                    mem_used = int(mem_total * vram_pct / 100)
                                except:
                                    pass
                        
                        # Utilization and temperature - handle string values
                        utilization_str = (gpu.get("GPU use (%)") or 
                                         gpu.get("GPU use(%)") or 
                                         gpu.get("gpu_use_percent") or "0")
                        utilization = float(str(utilization_str).replace("%", "")) if utilization_str else 0
                        
                        temp_str = (gpu.get("Temperature (Sensor edge) (C)") or 
                                   gpu.get("Temperature (Sensor 1) (C)") or 
                                   gpu.get("Temperature(Sensor 1)(C)") or 
                                   gpu.get("temperature") or "0")
                        temp = float(str(temp_str).replace("C", "").strip()) if temp_str else 0
                        
                        return {
                            "model": model,
                            "vendor": "AMD",
                            "memoryTotal": mem_total,
                            "memoryUsed": mem_used,
                            "memoryFree": max(0, mem_total - mem_used),
                            "memoryPercent": (mem_used / mem_total * 100) if mem_total > 0 else 0,
                            "utilization": utilization,
                            "memoryUtilization": utilization,  # Use GPU utilization as memory utilization
                            "temperature": temp
                        }
                except json.JSONDecodeError:
                    # If JSON parsing fails, try text format
                    pass
            
            # Fallback: Try text format parsing
            result = subprocess.run(
                ["rocm-smi", "-i", "0", "-d"],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            if result.returncode == 0:
                output = result.stdout
                # Parse text output for basic info
                # Look for GPU name, memory, utilization, temperature
                lines = output.split('\n')
                model = "AMD GPU"
                mem_total = 0
                mem_used = 0
                utilization = 0
                temp = 0
                
                for line in lines:
                    line_lower = line.lower()
                    # Try to extract GPU name
                    if 'card' in line_lower or 'gpu' in line_lower:
                        # Look for model name patterns
                        if 'strix' in line_lower or 'halo' in line_lower:
                            model = "AMD Strix Halo (RDNA 3.5)"
                            mem_total = 16 * 1024 * 1024 * 1024  # 16GB
                        elif 'radeon' in line_lower:
                            model = "AMD Radeon Graphics"
                            mem_total = 8 * 1024 * 1024 * 1024  # 8GB default
                    # Try to extract memory
                    if 'memory' in line_lower or 'vram' in line_lower:
                        # Look for memory values
                        import re
                        mem_match = re.search(r'(\d+)\s*(gb|mb|b)', line_lower)
                        if mem_match:
                            value = int(mem_match.group(1))
                            unit = mem_match.group(2)
                            if unit == 'gb':
                                mem_total = value * 1024 * 1024 * 1024
                            elif unit == 'mb':
                                mem_total = value * 1024 * 1024
                            else:
                                mem_total = value
                    # Try to extract utilization
                    if 'use' in line_lower or 'utilization' in line_lower:
                        util_match = re.search(r'(\d+(?:\.\d+)?)\s*%', line)
                        if util_match:
                            utilization = float(util_match.group(1))
                    # Try to extract temperature
                    if 'temp' in line_lower or 'temperature' in line_lower:
                        temp_match = re.search(r'(\d+(?:\.\d+)?)\s*c', line_lower)
                        if temp_match:
                            temp = float(temp_match.group(1))
                
                if mem_total > 0 or model != "AMD GPU":
                    return {
                        "model": model,
                        "vendor": "AMD",
                        "memoryTotal": mem_total,
                        "memoryUsed": mem_used,
                        "memoryFree": max(0, mem_total - mem_used),
                        "memoryPercent": (mem_used / mem_total * 100) if mem_total > 0 else 0,
                        "utilization": utilization,
                        "memoryUtilization": utilization,
                        "temperature": temp
                    }
                    
        except FileNotFoundError:
            logger.debug("rocm-smi not found")
        except Exception as e:
            logger.error(f"Error getting ROCm GPU metrics: {e}")
        
        return None
    
    def get_battery_metrics(self) -> Optional[Dict]:
        """Get battery metrics using psutil"""
        try:
            battery = psutil.sensors_battery()
            if battery:
                return {
                    "level": battery.percent,
                    "charging": battery.power_plugged,
                    "timeRemaining": battery.secsleft if battery.secsleft > 0 else None
                }
        except Exception as e:
            logger.debug(f"Battery metrics not available: {e}")
        
        return None
    
    def get_all_metrics(self) -> Dict:
        """Collect all available metrics"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu": self.get_cpu_metrics(),
            "memory": self.get_memory_metrics(),
            "gpu": None,
            "battery": self.get_battery_metrics()
        }
        
        # Try NVIDIA first
        if self.nvidia_available:
            gpu_metrics = self.get_nvidia_gpu_metrics(0)
            if gpu_metrics:
                metrics["gpu"] = gpu_metrics
        
        # Try ROCm if NVIDIA not available
        if not metrics["gpu"]:
            gpu_metrics = self.get_rocm_gpu_metrics()
            if gpu_metrics:
                metrics["gpu"] = gpu_metrics
        
        return metrics


collector = MetricsCollector()


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics"""
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        while True:
            metrics = collector.get_all_metrics()
            await websocket.send_json(metrics)
            await asyncio.sleep(1)  # Send metrics every second
    except WebSocketDisconnect:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()


@app.get("/api/metrics")
async def get_metrics():
    """HTTP endpoint for one-time metrics fetch"""
    return collector.get_all_metrics()


@app.get("/")
async def root():
    """Root endpoint - service info"""
    return {
        "service": "Multiverse Backend Metrics Service",
        "status": "running",
        "endpoints": {
            "websocket": "/ws/metrics",
            "metrics": "/api/metrics",
            "health": "/api/health"
        },
        "note": "WebSocket endpoints cannot be accessed via HTTP GET. Use a WebSocket client or the frontend app.",
        "nvidia_available": collector.nvidia_available,
        "rocm_available": collector.rocm_available,
        "platform": platform.system()
    }

@app.get("/ws/metrics")
async def websocket_info():
    """HTTP GET handler for /ws/metrics - returns info about WebSocket endpoint"""
    return {
        "error": "This is a WebSocket endpoint, not an HTTP endpoint",
        "message": "Use a WebSocket client to connect to ws://localhost:8000/ws/metrics",
        "endpoints": {
            "websocket": "ws://localhost:8000/ws/metrics",
            "http_metrics": "http://localhost:8000/api/metrics",
            "health": "http://localhost:8000/api/health"
        },
        "note": "WebSocket endpoints cannot be accessed via HTTP GET. The frontend app connects automatically."
    }

@app.get("/favicon.ico")
async def favicon():
    """Favicon endpoint - return 204 No Content to avoid 404"""
    return Response(status_code=204)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "nvidia_available": collector.nvidia_available,
        "rocm_available": collector.rocm_available,
        "gpu_support": "NVIDIA" if collector.nvidia_available else ("AMD/ROCm" if collector.rocm_available else "None"),
        "platform": platform.system()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

