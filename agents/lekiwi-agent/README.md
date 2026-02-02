# LeKiwi Agent (Pi)

Thin FastAPI agent for the LeKiwi mobile base + SO-101 follower arm. Exposes a task-based HTTP API for Multiverse.

## Pi setup

```bash
cd ~/Multiverse/agents/lekiwi-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

LeRobot must already be installed on the Pi (the agent calls into `lerobot`).

## Configure

Edit `config.yaml`:

```yaml
device_id: kiwi
robot_port: /dev/ttyACM0
api_port: 8008
sequence_dir: /home/raspberry/Multiverse/assets/motions
```

Sequences are JSON files stored in `sequence_dir` and referenced by `sequence_id`.

## Run on Pi

```bash
python run.py
```

Health check:

```bash
curl http://localhost:8008/healthz
```

Metrics:

```bash
curl http://localhost:8008/metrics
```

## Task API

Idempotency: include `Idempotency-Key` to safely retry without duplicating work.

### lekiwi.move_base

```bash
curl -X POST http://localhost:8008/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: move-base-001" \
  -d '{
    "task_type": "lekiwi.move_base",
    "input": { "linear": 0.1, "angular": 0.0, "duration_s": 1.5 }
  }'
```

### lekiwi.stop

```bash
curl -X POST http://localhost:8008/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: stop-001" \
  -d '{
    "task_type": "lekiwi.stop",
    "input": {}
  }'
```

### so101.move_pose_sequence

```bash
curl -X POST http://localhost:8008/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sequence-001" \
  -d '{
    "task_type": "so101.move_pose_sequence",
    "input": { "sequence_id": "lekiwi_example" }
  }'
```

Task status:

```bash
curl http://localhost:8008/v1/tasks/<task_id>
```

## Multiverse configuration

```bash
export LEKIWI_BASE_URL=http://lekiwi-01.local:8008
export LEKIWI_DEVICE_ID=kiwi
```

If you build the UI with Vite, use:

```bash
export VITE_LEKIWI_BASE_URL=http://lekiwi-01.local:8008
export VITE_LEKIWI_DEVICE_ID=kiwi
```

## systemd (auto-start)

Copy the service template:

```bash
sudo cp lekiwi-agent.service /etc/systemd/system/lekiwi-agent.service
sudo systemctl daemon-reload
sudo systemctl enable lekiwi-agent
sudo systemctl start lekiwi-agent
```


