# Reachy Agent - Quick Start

## Prerequisites

- Python 3.10+
- Common framework in `../common/`
- AIM endpoint (or mock server)

## One-Command Start

```bash
./start.sh
```

The start script automatically:
- Activates virtual environment
- Sets PYTHONPATH to include common framework
- Starts the agent on port 9001

## Manual Start

```bash
# 1. Navigate to agent directory
cd agents/reachy-agent

# 2. Activate virtual environment
source venv/bin/activate

# 3. Set PYTHONPATH (CRITICAL!)
export PYTHONPATH=/home/yw/Desktop/Multiverse/agents/common:$PYTHONPATH

# 4. Start agent
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

## Verify It's Running

```bash
# Check health
curl http://localhost:9001/health

# Get agent info
curl http://localhost:9001/v1/agent/info
```

## Test with AIM Endpoint

```bash
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "reachy_devops_copilot",
    "input": {
      "prompt": "What does p95 latency mean?",
      "model": "Qwen/Qwen3-32B"
    },
    "routing": {
      "backend": "aim",
      "base_url": "http://localhost:8000",
      "api_key": ""
    }
  }'
```

## Troubleshooting

### Import Errors

If you see `ModuleNotFoundError: No module named 'app.models'`:
- Make sure PYTHONPATH is set: `echo $PYTHONPATH`
- Should include: `/home/yw/Desktop/Multiverse/agents/common`
- Use `./start.sh` to avoid this issue

### Port Already in Use

```bash
# Find and kill process
lsof -ti:9001 | xargs kill

# Or use different port
uvicorn app.main:app --port 9002
```

## Next Steps

- See [README.md](README.md) for full documentation
- See [QUICKSTART.md](QUICKSTART.md) for detailed setup
- Check logs in the uvicorn terminal

