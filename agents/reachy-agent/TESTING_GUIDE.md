# Reachy Agent Testing Guide

## Quick Start Testing

### 1. Start the Agent

```bash
cd ~/Desktop/Multiverse/agents/reachy-agent
./start.sh
```

The agent should start on `http://localhost:9001`

### 2. Basic Endpoint Tests

#### Test Agent Info
```bash
curl http://localhost:9001/v1/agent/info
```

**Expected Response:**
```json
{
  "robot_id": "reachy-001",
  "robot_type": "reachy",
  "capabilities": ["devops_copilot", "gestures", "openai_compatible_inference"],
  "version": "0.1.0",
  "backend_default": "aim"
}
```

#### Test Health Status
```bash
curl http://localhost:9001/v1/agent/health
```

**Expected Response:**
```json
{
  "status": "online",
  "last_seen": "2025-12-22T00:42:40.644372+00:00",
  "sensors_ok": true,
  "actuators_ok": true,
  "backend_available": null
}
```

#### Test Root Endpoint
```bash
curl http://localhost:9001/
```

#### Test Metrics
```bash
curl http://localhost:9001/v1/metrics
```

## Task Submission Tests

### 3. Submit a DevOps Copilot Task

**Prerequisites:** You need an AIM endpoint configured. Get the URL and API key from Multiverse settings.

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
    },
    "policy": {
      "e2e_slo_ms": 2500,
      "timeout_ms": 2200
    }
  }'
```

**Expected Response:**
```json
{
  "task_id": "abc123-def456-...",
  "state": "acknowledged",
  "progress": 0.0,
  "e2e_slo_ms": 2500,
  "created_at": "2025-12-22T00:42:40.644372+00:00",
  "updated_at": "2025-12-22T00:42:40.644372+00:00"
}
```

**Save the `task_id` from the response!**

### 4. Check Task Status

```bash
# Replace {task_id} with the actual task_id from step 3
curl http://localhost:9001/v1/tasks/{task_id}
```

**Expected States:**
- `acknowledged` - Task received, processing started
- `running` - Task is executing
- `completed` - Task finished successfully
- `failed` - Task encountered an error

**Completed Task Response:**
```json
{
  "task_id": "abc123-def456-...",
  "state": "completed",
  "progress": 1.0,
  "result": {
    "content": "p95 latency means the 95th percentile of latency measurements...",
    "prompt": "What does p95 latency mean and why should I care?"
  },
  "e2e_ms": 1234,
  "aim_latency_ms": 1000,
  "slo_pass": true,
  "created_at": "2025-12-22T00:42:40.644372+00:00",
  "updated_at": "2025-12-22T00:42:45.644372+00:00"
}
```

### 5. Watch Events (Real-time)

In a **separate terminal**, stream events:

```bash
curl -N http://localhost:9001/v1/events
```

Then submit a task in another terminal. You should see events like:
```
event: task_created
data: {"event":"task_created","task_id":"...","timestamp":"..."}

event: ack_sent
data: {"event":"ack_sent","task_id":"...","timestamp":"..."}

event: inference_started
data: {"event":"inference_started","task_id":"...","timestamp":"..."}

event: inference_done
data: {"event":"inference_done","task_id":"...","timestamp":"..."}

event: task_done
data: {"event":"task_done","task_id":"...","timestamp":"..."}
```

## Automated Testing Script

### 6. Use the Test Script

```bash
# Edit TEST_WITH_AIM.sh to set your AIM endpoint details
nano TEST_WITH_AIM.sh

# Update these variables:
# AIM_URL="http://localhost:8000"
# AIM_API_KEY="sk-your-api-key"

# Run the test
chmod +x TEST_WITH_AIM.sh
./TEST_WITH_AIM.sh
```

This script will:
1. Submit a task
2. Wait for completion
3. Check the status
4. Display the results

## Test Scenarios

### Scenario 1: Basic DevOps Question
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
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

### Scenario 2: Deployment Summary
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
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

### Scenario 3: Incident Triage
```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "Give a 5-step incident triage checklist for CrashLoopBackOff"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }'
```

## Testing with jq (Pretty Output)

If you have `jq` installed, you can format JSON responses:

```bash
# Install jq (if needed)
sudo apt install jq

# Test with formatted output
curl -s http://localhost:9001/v1/agent/info | jq '.'

# Submit task and extract task_id
TASK_RESPONSE=$(curl -s -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {"prompt": "What is p95 latency?"},
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": "sk-your-api-key"
    }
  }')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.task_id')
echo "Task ID: $TASK_ID"

# Wait and check status
sleep 3
curl -s http://localhost:9001/v1/tasks/$TASK_ID | jq '.'
```

## Troubleshooting

### Task Stuck in "acknowledged" State

1. **Check server logs** - Look at the terminal where `uvicorn` is running
2. **Verify AIM endpoint** - Test directly:
   ```bash
   curl http://localhost:8000/v1/models \
     -H "Authorization: Bearer sk-your-api-key"
   ```
3. **Check API key** - Make sure it's correct or empty if not required

### Connection Errors

- Verify AIM endpoint is running
- Check the URL (http vs https)
- Verify firewall/network settings
- Check if API key is required

### Import Errors

- Make sure `PYTHONPATH` includes the common framework
- Use `./start.sh` which sets this automatically
- Verify virtual environment is activated

## Expected Behavior

### Successful Task Flow

1. **Submit task** → Returns `task_id` and `state: "acknowledged"`
2. **ACK gesture** → Robot acknowledges (mocked in current setup)
3. **Inference starts** → Calls AIM backend
4. **THINKING gesture** → Robot shows thinking (mocked)
5. **Inference completes** → Gets AI response
6. **DONE gesture** → Robot shows completion (mocked)
7. **Task completes** → `state: "completed"` with result

### Metrics to Check

- `e2e_ms` - End-to-end latency
- `aim_latency_ms` - Time spent in AIM backend
- `slo_pass` - Whether SLO was met
- `progress` - Should be 1.0 when completed

## Next Steps

- Test with different prompts
- Test with different models
- Test error scenarios (invalid endpoint, timeout, etc.)
- Monitor metrics at `/v1/metrics`
- Watch events in real-time

