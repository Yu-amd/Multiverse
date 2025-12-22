# Quick Test with Your AIM Endpoint

## Your AIM Endpoint Details

- **URL**: `http://localhost:8000`
- **Model**: `Qwen/Qwen3-32B`
- **API Key**: `sk-your-api-key` (update if needed)

## Test Command

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean and why should I care?",
      "model": "Qwen/Qwen3-32B"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

## Check Task Status

After submitting, use the `task_id` from the response:

```bash
# Replace {task_id} with your actual task_id
curl http://localhost:9001/v1/tasks/{task_id}
```

## Watch Events in Real-Time

In another terminal:

```bash
curl -N http://localhost:9001/v1/events
```

Then submit a task to see:
- `task_created`
- `ack_sent`
- `inference_started`
- `inference_done`
- `task_done`

## Expected Response

When the task completes, you should see:

```json
{
  "task_id": "...",
  "state": "completed",
  "progress": 1.0,
  "result": {
    "content": "p95 latency means...",
    "prompt": "..."
  },
  "e2e_ms": 1234,
  "aim_latency_ms": 1000,
  "slo_pass": true
}
```

## Troubleshooting

### If task stays in "acknowledged" state:

1. **Check server logs** - Look for errors in the uvicorn terminal
2. **Verify AIM endpoint** - Test directly:
   ```bash
   curl http://localhost:8000/v1/models \
     -H "Authorization: Bearer sk-your-api-key"
   ```
3. **Check API key** - If your AIM doesn't require auth, try empty string:
   ```json
   "api_key": ""
   ```

### If you see connection errors:

- Make sure AIM endpoint is running on port 8000
- Check firewall settings
- Verify the URL is correct (http vs https)

