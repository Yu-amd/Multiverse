# Testing the Reachy Agent

## Task Status Check

After submitting a task, check its status:

```bash
# Replace {task_id} with the task_id from the response
curl http://localhost:9001/v1/tasks/{task_id}
```

## Common Issues

### 1. Task Stuck in "acknowledged" State

If the task stays in "acknowledged" state, it likely means:
- The AIM backend call failed
- Check the server logs for errors
- Verify your AIM endpoint URL and API key are correct

### 2. Using Placeholder Values

**Important**: Replace the placeholder values with your actual AIM endpoint:

```bash
# ❌ Wrong (placeholders)
"base_url": "YOUR_AIM_URL_FROM_MULTIVERSE"
"api_key": "YOUR_API_KEY_FROM_MULTIVERSE"

# ✅ Correct (actual values)
"base_url": "https://aim.your-cluster.com/v1"
"api_key": "sk-actual-api-key-here"
```

### 3. Getting Your AIM Endpoint from Multiverse

1. Open Multiverse
2. Go to Settings
3. Select "AMD Inference Microservice (AIM)"
4. Copy the endpoint URL
5. Copy the API key (if configured)

### 4. Testing AIM Endpoint Directly

Before using in the agent, test your AIM endpoint:

```bash
curl https://your-aim-endpoint.com/v1/models \
  -H "Authorization: Bearer sk-your-api-key"
```

### 5. Check Server Logs

The agent logs all operations. Check the terminal where you ran `uvicorn` for:
- Task creation logs
- Backend call logs
- Error messages
- Gesture execution logs

## Example: Complete Test Flow

```bash
# 1. Submit task (with REAL values)
TASK_RESPONSE=$(curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean?"
    },
    "routing": {
      "backend": "aim",
      "base_url": "https://your-real-aim-url.com/v1",
      "api_key": "sk-your-real-api-key"
    }
  }')

# 2. Extract task_id (requires jq)
TASK_ID=$(echo $TASK_RESPONSE | jq -r '.task_id')

# 3. Check status
curl http://localhost:9001/v1/tasks/$TASK_ID

# 4. Watch events
curl -N http://localhost:9001/v1/events
```

## Expected Task States

- `pending` → Task just created
- `acknowledged` → Task received, gesture performed
- `running` → Inference started
- `completed` → Task finished successfully
- `failed` → Task failed (check error field)

## Debugging

### Check if AIM endpoint is reachable:

```bash
# Test AIM endpoint health
curl https://your-aim-endpoint.com/v1/models \
  -H "Authorization: Bearer sk-your-api-key" \
  -v
```

### Check agent logs:

Look for these log messages:
- "Task created"
- "Sending chat completion request"
- "Chat completion successful" or "Chat completion failed"
- "Task completed" or "Task failed"

### Common Error Messages

- `Connection refused` → AIM endpoint not reachable
- `401 Unauthorized` → Invalid API key
- `404 Not Found` → Wrong endpoint URL
- `Timeout` → AIM endpoint too slow or unreachable

