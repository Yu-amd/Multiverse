#!/usr/bin/env python3
"""
MI300X GPU Detection Script for Multiverse
Detects AMD MI300X GPUs using rocm-smi and provides metrics
"""

import subprocess
import json
import sys
import os

def run_command(cmd):
    """Run a shell command and return the output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return None
    except FileNotFoundError:
        return None

def detect_rocm_smi():
    """Check if rocm-smi is available"""
    return run_command("which rocm-smi") is not None

def get_gpu_info():
    """Get GPU information using rocm-smi"""
    if not detect_rocm_smi():
        return None
    
    # Get GPU list
    gpu_list = run_command("rocm-smi --showid")
    if not gpu_list:
        return None
    
    gpus = []
    
    # Try to get detailed info for each GPU
    # rocm-smi --showproductname --showid --showmeminfo vram --showtemp --showuse --showpower
    info = run_command("rocm-smi --showproductname --showid --showmeminfo vram --showtemp --showuse --showpower --json")
    
    if info:
        try:
            data = json.loads(info)
            if isinstance(data, dict) and 'card0' in data:
                # Handle single GPU
                gpu_data = data['card0']
                gpus.append(parse_gpu_data(gpu_data, 0))
            elif isinstance(data, list):
                # Handle multiple GPUs
                for idx, gpu_data in enumerate(data):
                    gpus.append(parse_gpu_data(gpu_data, idx))
        except json.JSONDecodeError:
            # Fallback to parsing text output
            pass
    
    # If JSON parsing failed, try text parsing
    if not gpus:
        gpus = parse_text_output()
    
    return gpus

def parse_gpu_data(gpu_data, index):
    """Parse GPU data from rocm-smi JSON output"""
    gpu_info = {
        'index': index,
        'model': 'Unknown',
        'vendor': 'AMD',
        'memoryTotal': 0,
        'memoryUsed': 0,
        'memoryFree': 0,
        'temperature': 0,
        'utilization': 0,
        'powerDraw': 0,
        'memoryBandwidth': 0,
        'computeUnits': 0,
        'clockSpeed': 0
    }
    
    # Extract model name
    if 'Card series' in gpu_data:
        gpu_info['model'] = gpu_data['Card series']
    elif 'Card model' in gpu_data:
        gpu_info['model'] = gpu_data['Card model']
    
    # Check if it's MI300X
    model_str = str(gpu_info['model']).upper()
    if 'MI300X' in model_str or 'MI300' in model_str:
        gpu_info['model'] = 'MI300X'
        gpu_info['memoryTotal'] = 192 * 1024  # 192 GB in MB
        gpu_info['memoryBandwidth'] = 5300  # 5.3 TB/s in GB/s
        gpu_info['computeUnits'] = 304
        gpu_info['clockSpeed'] = 1700  # MHz
    elif 'MI250X' in model_str or 'MI250' in model_str:
        gpu_info['model'] = 'MI250X'
        gpu_info['memoryTotal'] = 128 * 1024  # 128 GB
        gpu_info['memoryBandwidth'] = 3277  # GB/s
        gpu_info['computeUnits'] = 220
        gpu_info['clockSpeed'] = 1700
    elif 'MI210' in model_str or 'MI210' in model_str:
        gpu_info['model'] = 'MI210'
        gpu_info['memoryTotal'] = 64 * 1024  # 64 GB
        gpu_info['memoryBandwidth'] = 1638  # GB/s
        gpu_info['computeUnits'] = 104
        gpu_info['clockSpeed'] = 1700
    
    # Extract memory info
    if 'vram' in gpu_data:
        vram = gpu_data['vram']
        if isinstance(vram, dict):
            if 'Total Memory (B)' in vram:
                gpu_info['memoryTotal'] = int(vram['Total Memory (B)']) / (1024 * 1024)  # Convert to MB
            if 'Used Memory (B)' in vram:
                gpu_info['memoryUsed'] = int(vram['Used Memory (B)']) / (1024 * 1024)
            if 'Free Memory (B)' in vram:
                gpu_info['memoryFree'] = int(vram['Free Memory (B)']) / (1024 * 1024)
    
    # Extract temperature
    if 'Temperature (Sensor edge) (C)' in gpu_data:
        gpu_info['temperature'] = float(gpu_data['Temperature (Sensor edge) (C)'])
    elif 'Temperature (C)' in gpu_data:
        gpu_info['temperature'] = float(gpu_data['Temperature (C)'])
    
    # Extract utilization
    if 'GPU use (%)' in gpu_data:
        gpu_info['utilization'] = float(gpu_data['GPU use (%)'])
    
    # Extract power
    if 'Average Graphics Package Power (W)' in gpu_data:
        gpu_info['powerDraw'] = float(gpu_data['Average Graphics Package Power (W)'])
    elif 'Power (W)' in gpu_data:
        gpu_info['powerDraw'] = float(gpu_data['Power (W)'])
    
    # Extract clock speed
    if 'GPU Clock (MHz)' in gpu_data:
        gpu_info['clockSpeed'] = float(gpu_data['GPU Clock (MHz)'])
    
    return gpu_info

def parse_text_output():
    """Fallback: Parse text output from rocm-smi"""
    gpus = []
    
    # Get product names
    product_names = run_command("rocm-smi --showproductname")
    if not product_names:
        return gpus
    
    lines = product_names.split('\n')
    for idx, line in enumerate(lines):
        if 'Card series' in line or 'Card model' in line:
            model = line.split(':')[-1].strip() if ':' in line else 'Unknown'
            
            gpu_info = {
                'index': idx,
                'model': model,
                'vendor': 'AMD',
                'memoryTotal': 0,
                'memoryUsed': 0,
                'memoryFree': 0,
                'temperature': 0,
                'utilization': 0,
                'powerDraw': 0,
                'memoryBandwidth': 0,
                'computeUnits': 0,
                'clockSpeed': 0
            }
            
            # Set MI300X defaults if detected
            if 'MI300X' in model.upper() or 'MI300' in model.upper():
                gpu_info['model'] = 'MI300X'
                gpu_info['memoryTotal'] = 192 * 1024
                gpu_info['memoryBandwidth'] = 5300
                gpu_info['computeUnits'] = 304
                gpu_info['clockSpeed'] = 1700
            
            gpus.append(gpu_info)
    
    return gpus

def main():
    """Main function to detect and output GPU information"""
    if not detect_rocm_smi():
        print(json.dumps({
            'error': 'rocm-smi not found. Please install ROCm.',
            'gpus': []
        }), file=sys.stderr)
        sys.exit(1)
    
    gpus = get_gpu_info()
    
    if not gpus:
        print(json.dumps({
            'error': 'No GPUs detected or unable to parse rocm-smi output',
            'gpus': []
        }), file=sys.stderr)
        sys.exit(1)
    
    # Output JSON for easy parsing
    output = {
        'gpus': gpus,
        'count': len(gpus),
        'mi300x_detected': any(gpu['model'] == 'MI300X' for gpu in gpus)
    }
    
    print(json.dumps(output, indent=2))
    
    # Also print human-readable summary
    print("\n=== GPU Detection Summary ===", file=sys.stderr)
    for gpu in gpus:
        print(f"GPU {gpu['index']}: {gpu['vendor']} {gpu['model']}", file=sys.stderr)
        if gpu['model'] == 'MI300X':
            print(f"  ✓ MI300X Detected!", file=sys.stderr)
            print(f"  Memory: {gpu['memoryTotal'] / 1024:.0f} GB HBM3", file=sys.stderr)
            print(f"  Bandwidth: {gpu['memoryBandwidth']} GB/s", file=sys.stderr)
            print(f"  Compute Units: {gpu['computeUnits']}", file=sys.stderr)
        if gpu['utilization'] > 0:
            print(f"  Utilization: {gpu['utilization']:.1f}%", file=sys.stderr)
        if gpu['temperature'] > 0:
            print(f"  Temperature: {gpu['temperature']:.1f}°C", file=sys.stderr)

if __name__ == '__main__':
    main()

