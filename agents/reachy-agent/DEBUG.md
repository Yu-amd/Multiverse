# Debugging Task Execution

## Issue: Task Stuck in "acknowledged" State

If tasks stay in "acknowledged" state, the async execution might be failing silently.

## Check Agent Logs

Look in the terminal where you ran `uvicorn` for:
- "Starting task execution" - confirms task started
- "Backend inference failed" - AIM endpoint issue
- "Task failed" - general error
- Any Python tracebacks

## Common Causes

### 1. Import Errors

Check if common framework imports work:
```bash
cd agents/reachy-agent
python3 -c "import sys; sys.path.insert(0, '../common/app'); from app.models import TaskRequest; print('OK')"
```

### 2. Async Task Not Running

The task is created with `asyncio.create_task()`. If there's an error, it might be swallowed.

**Check**: Look for any error messages in logs immediately after task creation.

### 3. Backend Client Failure

The AIM endpoint call might be failing. Check:
- Is the endpoint URL correct?
- Is the API key valid (or empty if not needed)?
- Can you reach the endpoint?

Test directly:
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-32B",
    "messages": [{"role": "user", "content": "test"}],
    "stream": false
  }'
```

### 4. Exception in Task Execution

If there's an unhandled exception, the task status won't update. The improved error handling should catch this now.

## Enable Debug Logging

Set environment variable:
```bash
export LOG_LEVEL=DEBUG
```

Then restart the agent to see detailed logs.

## Manual Test

1. Submit a task
2. Immediately check logs for "Starting task execution"
3. Watch for any errors
4. Check task status after a few seconds

## Expected Log Flow

```
INFO: Task created (task_id=...)
INFO: Starting task execution (task_id=...)
INFO: Sending chat completion request (backend=aim, ...)
INFO: Chat completion successful (latency_ms=...)
INFO: Task completed (e2e_ms=..., slo_pass=...)
```

If you don't see "Starting task execution", the async task isn't running.

