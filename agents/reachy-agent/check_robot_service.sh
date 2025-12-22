#!/bin/bash
# Check if Reachy Mini service is running

echo "============================================================"
echo "Reachy Mini Service Check"
echo "============================================================"
echo

# Check if port 7447 is listening
echo "Checking if port 7447 is accessible..."
if command -v netstat &> /dev/null; then
    netstat -an | grep 7447
elif command -v ss &> /dev/null; then
    ss -tuln | grep 7447
elif command -v lsof &> /dev/null; then
    lsof -i :7447
else
    echo "⚠️  Cannot check port (netstat/ss/lsof not available)"
fi

echo

# Check USB devices (for Lite)
echo "Checking USB devices..."
if command -v lsusb &> /dev/null; then
    echo "USB devices:"
    lsusb | grep -i -E "(reachy|pollen|robot)" || echo "  No Reachy-related USB devices found"
else
    echo "⚠️  lsusb not available (install usbutils)"
fi

echo

# Check network connectivity (for Wireless)
echo "Checking network connectivity to localhost:7447..."
if command -v nc &> /dev/null; then
    if nc -zv localhost 7447 2>&1 | grep -q "succeeded"; then
        echo "✅ Port 7447 is accessible"
    else
        echo "❌ Port 7447 is NOT accessible"
    fi
elif command -v telnet &> /dev/null; then
    timeout 2 telnet localhost 7447 2>&1 | grep -q "Connected" && echo "✅ Port 7447 is accessible" || echo "❌ Port 7447 is NOT accessible"
else
    echo "⚠️  Cannot test port connectivity (nc/telnet not available)"
fi

echo

# Check for Reachy processes
echo "Checking for Reachy-related processes..."
ps aux | grep -i -E "(reachy|zenoh|pollen)" | grep -v grep || echo "  No Reachy processes found"

echo
echo "============================================================"
echo "Summary"
echo "============================================================"
echo
echo "If port 7447 is NOT accessible, the Reachy service is not running."
echo
echo "Next steps:"
echo "1. Ensure robot is fully booted (wait 30 seconds after power on)"
echo "2. Check robot's LED indicators"
echo "3. Try restarting the robot"
echo "4. Check robot's documentation for service startup instructions"
echo

