# Reachy Agent Quick Start

## Prerequisites

- Python 3.10+
- AIM endpoint URL and API key (or use mock server)

## Quick Setup

```bash
# 1. Navigate to agent directory
cd agents/reachy-agent

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set PYTHONPATH to include common framework
export PYTHONPATH=/home/yw/Desktop/Multiverse/agents/common:$PYTHONPATH

# 5. Set environment variables (or create .env file)
export AIM_BASE_URL_DEFAULT="https://your-aim-endpoint.com/v1"
export AIM_API_KEY_DEFAULT="sk-your-api-key"

# 6. Start the agent
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

**Or use the start script:**
```bash
./start.sh
```

## Test It Works

### 1. Check Agent Info

```bash
curl http://localhost:9001/v1/agent/info
```

Expected response:
```json
{
  "robot_id": "reachy-001",
  "robot_type": "reachy",
  "capabilities": ["devops_copilot", "gestures", "openai_compatible_inference"],
  "version": "0.1.0",
  "backend_default": "aim"
}
```

### 2. Submit a Task

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean and why should I care?"
    },
    "routing": {
      "backend": "aim",
      "base_url": "https://your-aim-endpoint.com/v1",
      "api_key": "sk-your-api-key"
    }
  }'
```

Save the `task_id` from the response.

### 3. Check Task Status

```bash
curl http://localhost:9001/v1/tasks/{task_id}
```

### 4. Watch Events (SSE)

```bash
curl -N http://localhost:9001/v1/events
```

You should see events like:
- `task_created`
- `ack_sent`
- `inference_started`
- `inference_done`
- `task_done`

## Using Your AIM Endpoint from Multiverse

If you have an AIM endpoint configured in Multiverse:

1. **Get the endpoint URL** from Multiverse settings
2. **Get the API key** from Multiverse settings
3. **Use them in the task request**:

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "Summarize the last production deployment"
    },
    "routing": {
      "backend": "aim",
      "base_url": "YOUR_AIM_URL_FROM_MULTIVERSE",
      "api_key": "YOUR_API_KEY_FROM_MULTIVERSE"
    }
  }'
```

## Demo Prompts

Try these three pre-canned prompts:

1. **"Summarize the last production deployment"**
2. **"What does p95 latency mean and why should I care?"**
3. **"Give a 5-step incident triage checklist for CrashLoopBackOff"**

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
uvicorn app.main:app --port 9002
```

### AIM Backend Connection Failed

- Check your AIM endpoint URL
- Verify API key is correct
- Test AIM endpoint directly:
  ```bash
  curl https://your-aim-endpoint.com/v1/models \
    -H "Authorization: Bearer sk-your-api-key"
  ```

### Import Errors

Make sure the common framework is in the parent directory:
```bash
ls ../common/app/main.py  # Should exist
```

## Next Steps

- See [README.md](README.md) for full documentation
- Check [Implementation Plan](../../FLEET_IMPLEMENTATION_PLAN.md) for Phase 1 details
- Integrate with Multiverse UI (Phase 4)

