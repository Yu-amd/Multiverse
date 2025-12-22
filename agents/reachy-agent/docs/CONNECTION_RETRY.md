# Connection Retry Logic

## Overview

The Reachy driver now includes intelligent connection retry logic to avoid spamming connection attempts when hardware is unavailable.

## Features

### 1. Connection Caching
- Once connected, connection is cached
- No repeated connection attempts if already connected

### 2. Retry Cooldown
- **30-second cooldown** between connection attempts
- Prevents excessive retry attempts when robot is unavailable
- Reduces log noise

### 3. Smart Retry
- Only retries after cooldown period expires
- Respects cooldown even if multiple gestures are triggered
- Can force retry with `force=True` parameter

## Behavior

### When Robot is Available

1. **First gesture** triggers connection attempt
2. Connection succeeds
3. **Subsequent gestures** use cached connection (no retry)

### When Robot is Unavailable

1. **First gesture** triggers connection attempt
2. Connection fails → error logged
3. **Subsequent gestures** (within 30 seconds):
   - Connection attempt skipped (silently)
   - Gesture falls back to mocked mode
   - No error spam in logs
4. **After 30 seconds**:
   - Next gesture triggers retry attempt
   - If still fails, cooldown resets

## Example Logs

### First Connection Attempt (Failure)
```
{"message": "Attempting to connect to Reachy Mini hardware...", ...}
{"message": "Failed to connect to Reachy Mini hardware", "error": "...", "help": "..."}
```

### Subsequent Attempts (During Cooldown)
```
{"message": "Robot not available for ACK gesture", ...}  # Silent, no connection attempt
{"message": "Robot not available for THINKING gesture", ...}  # Silent, no connection attempt
```

### After Cooldown Expires
```
{"message": "Attempting to connect to Reachy Mini hardware...", ...}  # Retry after 30s
```

## Configuration

### Cooldown Period

Default: **30 seconds**

To change, modify in `app/reachy_driver.py`:

```python
self._connection_retry_cooldown = 30.0  # Change to desired seconds
```

### Force Connection

To force a connection attempt (bypass cooldown):

```python
await driver.connect(force=True)
```

## Benefits

1. **Reduced Log Noise** - No repeated error messages
2. **Better Performance** - No wasted connection attempts
3. **Graceful Degradation** - Agent continues working in mocked mode
4. **Automatic Recovery** - Retries when robot becomes available

## Testing

### Test Connection Retry

1. Start agent with hardware mode enabled
2. Ensure robot is **not** connected/powered on
3. Submit multiple tasks
4. Observe: Only first attempt logs error, subsequent attempts are silent
5. Wait 30 seconds
6. Submit another task
7. Observe: New connection attempt is made

### Test Connection Success

1. Start agent with hardware mode enabled
2. Ensure robot **is** connected/powered on
3. Submit a task
4. Observe: Connection succeeds, gestures work
5. Submit more tasks
6. Observe: No additional connection attempts (using cached connection)

## Summary

- ✅ Connection attempts are cached
- ✅ 30-second cooldown prevents spam
- ✅ Graceful fallback to mocked mode
- ✅ Automatic retry after cooldown
- ✅ Reduced log noise

