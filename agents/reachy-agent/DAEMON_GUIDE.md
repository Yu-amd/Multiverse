# Reachy Mini Daemon Guide

## The Solution! 🎉

The Reachy Mini needs a **daemon** running to provide the service on port 7447. This is what was missing!

## Quick Start

### Start the Daemon

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
source venv/bin/activate
./start_daemon.sh
```

Or manually:

```bash
# Method 1: Using command (if available)
reachy-mini-daemon

# Method 2: Using Python module
python -m reachy_mini.daemon.app.main
```

### Verify Daemon is Running

```bash
# Check if daemon is running
pgrep -f reachy-mini-daemon

# Check port 7447
./check_robot_service.sh
```

### Test Connection

```bash
python test_connection.py
```

Should now show ✅ CONNECTION SUCCESSFUL!

## Daemon Options

### Default (Localhost Only)

```bash
reachy-mini-daemon
```

Only accepts connections from localhost (default).

### Allow Network Connections

```bash
reachy-mini-daemon --no-localhost-only
```

Allows connections from other devices on the network.

### Run in Background

```bash
# Start in background
reachy-mini-daemon &

# Or use nohup
nohup reachy-mini-daemon > daemon.log 2>&1 &
```

### Check Daemon Help

```bash
reachy-mini-daemon --help
```

## Daemon Dashboard

Once the daemon is running, you can access a web dashboard:

**URL:** http://localhost:8000

The dashboard allows you to:
- Turn robot on/off
- Run basic movements
- Browse spaces for Reachy Mini
- Monitor robot status

## Managing the Daemon

### Start Daemon

```bash
./start_daemon.sh
# or
reachy-mini-daemon &
```

### Stop Daemon

```bash
pkill -f reachy-mini-daemon
# or
killall reachy-mini-daemon
```

### Check if Running

```bash
pgrep -f reachy-mini-daemon
# Should show PID if running
```

### View Daemon Logs

If running in background with nohup:

```bash
tail -f daemon.log
```

## Auto-Start Daemon (Optional)

To automatically start the daemon when you log in:

### Method 1: Systemd Service (Linux)

Create `/etc/systemd/system/reachy-mini-daemon.service`:

```ini
[Unit]
Description=Reachy Mini Daemon
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username
ExecStart=/path/to/venv/bin/reachy-mini-daemon
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable reachy-mini-daemon
sudo systemctl start reachy-mini-daemon
```

### Method 2: Add to Shell Profile

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Start Reachy Mini daemon if not running
if ! pgrep -f reachy-mini-daemon > /dev/null; then
    reachy-mini-daemon &
fi
```

## Troubleshooting

### Daemon Won't Start

1. **Check SDK installation:**
   ```bash
   pip show reachy_mini
   pip install --upgrade reachy_mini
   ```

2. **Check if port 7447 is already in use:**
   ```bash
   lsof -i :7447
   # If something is using it, stop it first
   ```

3. **Check robot is connected:**
   ```bash
   ./check_robot_service.sh
   # Should show USB devices
   ```

### Daemon Starts But Connection Fails

1. **Check daemon is listening:**
   ```bash
   netstat -an | grep 7447
   # Should show LISTEN
   ```

2. **Try restarting daemon:**
   ```bash
   pkill -f reachy-mini-daemon
   sleep 2
   reachy-mini-daemon &
   ```

3. **Check daemon logs for errors**

### Port Already in Use

If port 7447 is already in use:

```bash
# Find what's using it
lsof -i :7447

# Kill the process (if it's an old daemon)
kill <PID>
```

## Integration with Agent

Once the daemon is running:

1. **Start daemon:**
   ```bash
   ./start_daemon.sh
   ```

2. **Start agent:**
   ```bash
   export REACHY_MOCKED=false
   ./start.sh
   ```

3. **Submit tasks - gestures will work!**

## Summary

✅ **The missing piece:** Reachy Mini daemon needs to be running
✅ **Start it:** `./start_daemon.sh` or `reachy-mini-daemon`
✅ **Verify:** `python test_connection.py` should work
✅ **Dashboard:** http://localhost:8000
✅ **Then:** Agent will connect successfully!

The daemon is the bridge between the SDK and the robot hardware!

