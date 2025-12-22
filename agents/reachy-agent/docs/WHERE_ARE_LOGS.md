# Where Are the Logs?

## Log Location

The logs are output to **stdout/stderr** in the terminal where you run `uvicorn`.

## Viewing Logs

### 1. Terminal Output (Primary Location)

When you run:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

All logs appear in that terminal window. Look for:
- JSON-formatted log entries
- "Starting task execution" messages
- Error messages
- Task completion logs

### 2. Redirect Logs to a File

To save logs to a file:

```bash
# Save all output to a log file
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload 2>&1 | tee agent.log

# Or just save to file
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload > agent.log 2>&1
```

Then view with:
```bash
tail -f agent.log
```

### 3. Check Logs in Real-Time

While the agent is running, logs appear immediately in the terminal. Watch for:

```
{"timestamp": "...", "level": "INFO", "message": "Starting task execution", "task_id": "..."}
{"timestamp": "...", "level": "INFO", "message": "Sending chat completion request", ...}
{"timestamp": "...", "level": "INFO", "message": "Chat completion successful", ...}
```

## What to Look For

### When You Submit a Task

You should see these log entries in order:

1. **Task Creation**:
   ```json
   {"message": "Task created", "task_id": "...", "task_type": "reachy_devops_copilot"}
   ```

2. **Task Execution Start**:
   ```json
   {"message": "Starting task execution", "task_id": "...", "task_type": "reachy_devops_copilot"}
   ```

3. **Backend Request**:
   ```json
   {"message": "Sending chat completion request", "backend": "aim", "base_url": "http://localhost:8000", "model": "Qwen/Qwen3-32B"}
   ```

4. **Success or Error**:
   ```json
   {"message": "Chat completion successful", "latency_ms": 1234, ...}
   ```
   OR
   ```json
   {"message": "Backend inference failed", "error": "...", ...}
   ```

## Enable More Verbose Logging

Set the log level to DEBUG:

```bash
export LOG_LEVEL=DEBUG
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

## If You Don't See Logs

1. **Check the terminal** where you ran uvicorn
2. **Scroll up** - logs might be above the current view
3. **Check if agent is running**: `curl http://localhost:9001/health`
4. **Restart with logging**: Make sure you see startup messages

## Example: Full Log Flow

When you submit a task, you should see something like:

```
INFO:     Uvicorn running on http://0.0.0.0:9001
{"timestamp": "2025-12-21T20:24:24Z", "level": "INFO", "message": "Task created", "task_id": "26f8ac6b-...", "task_type": "reachy_devops_copilot"}
{"timestamp": "2025-12-21T20:24:24Z", "level": "INFO", "message": "Starting task execution", "task_id": "26f8ac6b-...", "task_type": "reachy_devops_copilot"}
{"timestamp": "2025-12-21T20:24:24Z", "level": "INFO", "message": "Sending chat completion request", "backend": "aim", "base_url": "http://localhost:8000", "model": "Qwen/Qwen3-32B"}
{"timestamp": "2025-12-21T20:24:25Z", "level": "INFO", "message": "Chat completion successful", "latency_ms": 1234, "tokens": 150}
{"timestamp": "2025-12-21T20:24:25Z", "level": "INFO", "message": "Task completed", "e2e_ms": 1500, "slo_pass": true}
```

## Troubleshooting

### No Logs Appearing?

1. Make sure the agent is actually running
2. Check if you're looking at the right terminal
3. Try submitting a task and watch the terminal immediately
4. Check for Python errors that might prevent logging

### Logs Are Too Verbose?

Set log level to WARNING:
```bash
export LOG_LEVEL=WARNING
```

### Want to Filter Logs?

Use grep:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload 2>&1 | grep "task_id"
```

