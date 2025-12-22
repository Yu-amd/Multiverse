# Quick Testing Reference

## Setup (One Time)

```bash
cd /home/yw/Desktop/Multiverse/agents/common
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run All Tests

```bash
source venv/bin/activate
pytest
```

## Run Tests with Coverage

```bash
source venv/bin/activate
pytest --cov=app --cov-report=term-missing
```

## Start Server for Manual Testing

```bash
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

## Quick API Tests

```bash
# Agent info
curl http://localhost:9001/v1/agent/info

# Health check
curl http://localhost:9001/v1/agent/health

# Create task
curl -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"task_type": "test", "input": {"prompt": "test"}}'

# Get metrics
curl http://localhost:9001/v1/metrics
```

## Test Results

✅ **36 tests passing**  
✅ **88% code coverage**  
✅ **All endpoints working**

See [docs/fleet/testing-guide.md](../../docs/fleet/testing-guide.md) for detailed instructions.

