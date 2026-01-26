import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFleet, useTaskEvents, useTaskExecution } from '../hooks/useFleet';
import { fleetApi, type TaskEvent, type TaskStatus } from '../services/fleetApi';
import './RunsPage.css';

interface RunEvent {
  id: string;
  timestamp: string;
  type: 'submitted' | 'ack' | 'inference_started' | 'inference_completed' | 'gesture' | 'completed' | 'error';
  message: string;
  metadata?: {
    latency?: number;
    backend?: string;
    sloPass?: boolean;
  };
}

interface Run {
  id: string;
  taskId: string;
  robotId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  events: RunEvent[];
  output?: string;
  createdAt: string;
  taskStatus?: TaskStatus;
}

// Convert SSE events to RunEvent format
const eventTypeMap: Record<string, RunEvent['type']> = {
  task_created: 'submitted',
  ack_sent: 'ack',
  inference_started: 'inference_started',
  inference_done: 'inference_completed',
  gesture_executed: 'gesture',
  task_done: 'completed',
  task_failed: 'error',
};

const convertEventToRunEvent = (event: TaskEvent, taskStatus?: TaskStatus): RunEvent => {
  const type = eventTypeMap[event.event_type] || 'submitted';
  let message = event.event_type.replace(/_/g, ' ').toUpperCase();
  const metadata: RunEvent['metadata'] = {};

  if (event.data) {
    if (event.data.backend) metadata.backend = event.data.backend;
    if (event.data.latency_ms) metadata.latency = event.data.latency_ms;
    if (event.data.aim_latency_ms) metadata.latency = event.data.aim_latency_ms;
  }

  if (taskStatus) {
    if (taskStatus.slo_pass !== undefined) {
      metadata.sloPass = taskStatus.slo_pass;
      message = taskStatus.slo_pass ? 'SLO PASS' : 'SLO FAIL';
    }
  }

  return {
    id: `${event.task_id}-${event.timestamp}`,
    timestamp: event.timestamp,
    type,
    message,
    metadata,
  };
};

export const RunsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const robotId = searchParams.get('robot');
  const taskIdParam = searchParams.get('taskId');
  const cameraMode = searchParams.get('mode');
  const cameraArtifact = searchParams.get('artifact');
  const cameraLatency = searchParams.get('latency');
  const cameraTimestamp = searchParams.get('ts');

  const { robots } = useFleet();

  // Get robot URL (for now, hardcoded - could come from fleet)
  const robotUrl = robotId?.startsWith('so101-')
    ? 'http://localhost:9101'
    : robotId === 'reachy-001'
    ? 'http://localhost:9001'
    : undefined;

  // Fetch task status if we have a taskId
  const { currentTask, getTaskStatus } = useTaskExecution(robotUrl);
  const { events: taskEvents } = useTaskEvents(selectedRunId, robotUrl);

  const [so101Health, setSo101Health] = useState<any>(null);
  const [so101Info, setSo101Info] = useState<any>(null);
  const [cameraMetrics, setCameraMetrics] = useState<any>(null);
  const [cameraFrame, setCameraFrame] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStreamUrl, setCameraStreamUrl] = useState<string | null>(null);
  const [cameraStopping, setCameraStopping] = useState(false);

  useEffect(() => {
    if (taskIdParam) {
      setSelectedRunId(taskIdParam);
      getTaskStatus(taskIdParam);
    }
  }, [taskIdParam, getTaskStatus]);

  const mapTaskState = (state: TaskStatus['state']): Run['status'] => {
    switch (state) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'running':
        return 'running';
      default:
        return 'pending';
    }
  };

  useEffect(() => {
    let active = true;

    const fetchRunsForRobot = async (url: string, id: string) => {
      const history = await fleetApi.getRuns(url, 200);
      return history.map((task) => ({
        id: task.task_id,
        taskId: task.task_id,
        robotId: id,
        status: mapTaskState(task.state),
        events: [],
        output: task.result?.content,
        createdAt: task.created_at,
        taskStatus: task,
      }));
    };

    const fetchRuns = async () => {
      try {
        let mapped: Run[] = [];
        if (robotUrl && robotId) {
          mapped = await fetchRunsForRobot(robotUrl, robotId);
        } else if (robots.length > 0) {
          const results = await Promise.all(
            robots.map((robot) => fetchRunsForRobot(robot.url, robot.id).catch(() => []))
          );
          mapped = results.flat();
        }

        if (!active) return;
        mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRuns(mapped);
        if (!selectedRunId && mapped.length > 0 && robotId) {
          setSelectedRunId(mapped[0].id);
        }
      } catch (err) {
        if (!active) return;
        setRuns([]);
      }
    };

    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [robotUrl, robotId, robots, selectedRunId]);

  useEffect(() => {
    if (!robotId || !robotId.startsWith('so101-')) {
      return;
    }
    let active = true;

    const pollHealth = async () => {
      try {
        const role = robotId.replace('so101-', '');
        const response = await fetch(`http://localhost:9101/v1/agent/health?role=${role}`);
        if (!response.ok) {
          throw new Error('Failed to fetch health');
        }
        const data = await response.json();
        if (!active) return;
        setSo101Health(data);
      } catch (err) {
        if (!active) return;
        setSo101Health(null);
      }
    };

    const pollInfo = async () => {
      if (robotId !== 'so101-follower') return;
      try {
        const response = await fetch('http://localhost:9101/v1/so101/follower/sequence/info');
        if (!response.ok) {
          throw new Error('Failed to fetch sequence info');
        }
        const data = await response.json();
        if (!active) return;
        setSo101Info(data);
      } catch {
        if (!active) return;
        setSo101Info(null);
      }
    };

    pollHealth();
    pollInfo();
    const interval = setInterval(() => {
      pollHealth();
      pollInfo();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [robotId]);

  useEffect(() => {
    if (robotId !== 'so101-camera') {
      return;
    }
    let active = true;
    if (cameraMode === 'stream') {
      setCameraStreamUrl('http://localhost:9101/v1/so101/camera/stream.mjpg?duration_s=15&fps=15&width=1280&height=720');
    }

    const pollStatus = async () => {
      try {
        const response = await fetch('http://localhost:9101/v1/so101/camera/status');
        if (!response.ok) {
          throw new Error('Failed to fetch camera status');
        }
        const data = await response.json();
        if (!active) return;
        setCameraMetrics(data);
        setCameraError(data.error || null);
      } catch (err) {
        if (!active) return;
        setCameraError(err instanceof Error ? err.message : 'Failed to fetch camera status');
      }
    };

    const pollFrame = async () => {
      try {
        const response = await fetch('http://localhost:9101/v1/so101/camera/frame');
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!active) return;
        setCameraFrame(data.jpeg_base64 ? `data:image/jpeg;base64,${data.jpeg_base64}` : null);
      } catch {
        // Ignore frame fetch errors
      }
    };

    pollStatus();
    pollFrame();
    const statusInterval = setInterval(pollStatus, 1000);
    const frameInterval = setInterval(pollFrame, 800);

    return () => {
      active = false;
      clearInterval(statusInterval);
      clearInterval(frameInterval);
    };
  }, [robotId, cameraMode]);

  // Convert current task + events to Run format
  const selectedRun = useMemo<Run | null>(() => {
    if (selectedRunId) {
      const fromList = runs.find((run) => run.id === selectedRunId);
      if (fromList && (!currentTask || currentTask.task_id !== selectedRunId)) {
        return fromList;
      }
    }
    if (!currentTask && !selectedRunId) return null;

    const runEvents: RunEvent[] = taskEvents.map((event) =>
      convertEventToRunEvent(event, currentTask || undefined)
    );

    // Add initial submitted event if we have a task
    if (currentTask && runEvents.length === 0) {
      runEvents.push({
        id: `${currentTask.task_id}-submitted`,
        timestamp: currentTask.created_at,
        type: 'submitted',
        message: 'Task submitted',
      });
    }

    return {
      id: currentTask?.task_id || selectedRunId || 'unknown',
      taskId: currentTask?.task_id || selectedRunId || 'unknown',
      robotId: robotId || 'unknown',
      status: currentTask?.state === 'completed' ? 'completed' : currentTask?.state === 'failed' ? 'failed' : currentTask?.state === 'running' ? 'running' : 'pending',
      events: runEvents,
      output: currentTask?.result?.content,
      createdAt: currentTask?.created_at || new Date().toISOString(),
      taskStatus: currentTask || undefined,
    };
  }, [currentTask, taskEvents, selectedRunId, robotId, runs]);

  const getEventIcon = (type: RunEvent['type']) => {
    switch (type) {
      case 'submitted':
        return '📤';
      case 'ack':
        return '✓';
      case 'inference_started':
        return '🧠';
      case 'inference_completed':
        return '✓';
      case 'gesture':
        return '🤖';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '•';
    }
  };

  const getEventColor = (type: RunEvent['type']) => {
    switch (type) {
      case 'submitted':
        return '#3b82f6'; // blue
      case 'ack':
        return '#22c55e'; // green
      case 'inference_started':
        return '#8b5cf6'; // purple
      case 'inference_completed':
        return '#22c55e'; // green
      case 'gesture':
        return '#f59e0b'; // yellow
      case 'completed':
        return '#22c55e'; // green
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderSo101Panel = () => {
    if (!robotId?.startsWith('so101-')) return null;

    if (robotId === 'so101-camera') {
      const stopCameraStream = async () => {
        if (cameraStopping) return;
        setCameraStopping(true);
        try {
          const response = await fetch('http://localhost:9101/v1/so101/camera/stop', {
            method: 'POST',
          });
          if (!response.ok) {
            throw new Error('Failed to stop stream');
          }
          setCameraStreamUrl(null);
        } catch (err) {
          setCameraError(err instanceof Error ? err.message : 'Failed to stop stream');
        } finally {
          setCameraStopping(false);
        }
      };

      return (
        <div className="runs-main">
          <div className="runs-header">
            <h1 className="runs-title">SO-101 Camera</h1>
            {cameraMode === 'stream' && (
              <div className="runs-actions">
                <button className="btn btn-secondary" onClick={stopCameraStream} disabled={cameraStopping}>
                  {cameraStopping ? 'Stopping...' : 'Stop Stream'}
                </button>
              </div>
            )}
          </div>
          <div className="runs-camera-preview">
            {cameraStreamUrl ? (
              <img
                src={cameraStreamUrl}
                alt="SO-101 Camera Stream"
                onError={() => {
                  setCameraError('Stream unavailable. Try restarting from Run Task.');
                  setCameraStreamUrl(null);
                }}
              />
            ) : cameraFrame ? (
              <img src={cameraFrame} alt="SO-101 Camera Frame" />
            ) : (
              <div className="runs-camera-placeholder">No frame available</div>
            )}
          </div>
          <div className="runs-camera-metrics">
            <div>
              <span>FPS</span>
              <strong>
                {cameraMetrics?.actual_fps ?? '--'} / {cameraMetrics?.target_fps ?? '--'}
              </strong>
            </div>
            <div>
              <span>Avg Latency</span>
              <strong>{cameraMetrics?.avg_latency_ms ?? '--'} ms</strong>
            </div>
            <div>
              <span>Last Frame</span>
              <strong>
                {cameraMetrics?.last_frame_age_ms !== null && cameraMetrics?.last_frame_age_ms !== undefined
                  ? `${cameraMetrics.last_frame_age_ms} ms ago`
                  : '--'}
              </strong>
            </div>
            {cameraLatency && (
              <div>
                <span>Capture Latency</span>
                <strong>{cameraLatency} ms</strong>
              </div>
            )}
          </div>
          {cameraArtifact && (
            <div className="runs-camera-artifact">
              <span>Artifact</span>
              <code>{cameraArtifact}</code>
            </div>
          )}
          {cameraTimestamp && (
            <div className="runs-camera-meta">
              Captured at {new Date(Number(cameraTimestamp)).toLocaleString()}
            </div>
          )}
          {cameraError && <div className="runs-camera-error">Error: {cameraError}</div>}
        </div>
      );
    }

    return (
      <div className="runs-main">
        <div className="runs-header">
          <h1 className="runs-title">SO-101 {robotId.replace('so101-', '').toUpperCase()}</h1>
        </div>
        <div className="runs-edge-panel">
          <div className="runs-edge-status">
            <div>
              <span>Status</span>
              <strong>{so101Health?.status?.toUpperCase() || 'UNKNOWN'}</strong>
            </div>
            <div>
              <span>Sensors</span>
              <strong>
                {so101Health?.sensors_ok === null || so101Health?.sensors_ok === undefined
                  ? 'N/A'
                  : so101Health.sensors_ok
                  ? 'OK'
                  : 'FAILED'}
              </strong>
            </div>
            <div>
              <span>Actuators</span>
              <strong>
                {so101Health?.actuators_ok === null || so101Health?.actuators_ok === undefined
                  ? 'N/A'
                  : so101Health.actuators_ok
                  ? 'OK'
                  : 'FAILED'}
              </strong>
            </div>
          </div>
          {robotId === 'so101-follower' && so101Info && (
            <div className="runs-edge-info">
              <div>
                <span>Dataset</span>
                <strong>{so101Info.dataset_exists ? 'READY' : 'MISSING'}</strong>
              </div>
              <div>
                <span>Follower Port</span>
                <strong>{so101Info.port_exists ? 'OK' : 'MISSING'}</strong>
              </div>
              <div>
                <span>Leader Port</span>
                <strong>{so101Info.leader_exists ? 'OK' : 'MISSING'}</strong>
              </div>
              <div>
                <span>Camera</span>
                <strong>{so101Info.camera_exists ? 'OK' : 'MISSING'}</strong>
              </div>
              <div className="runs-edge-paths">
                <div>Follower: {so101Info.port_path || 'unset'}</div>
                <div>Leader: {so101Info.leader_port || 'unset'}</div>
                <div>Camera: {so101Info.camera_device || 'unset'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="runs-page">
      <div className="runs-layout">
        {/* Left: Run List */}
        <div className="runs-sidebar">
          <h2 className="runs-sidebar-title">RUNS</h2>
          <div className="runs-list">
            {runs.map((run) => (
              <button
                key={run.id}
                className={`runs-item ${selectedRun?.id === run.id ? 'active' : ''}`}
                onClick={() => {
                  if (!robotId) {
                    navigate(`/runs?robot=${run.robotId}&taskId=${run.taskId}`);
                    return;
                  }
                  setSelectedRunId(run.id);
                  if (robotUrl && !robotId?.startsWith('so101-')) {
                    getTaskStatus(run.taskId).catch(() => null);
                  }
                }}
              >
                <div className="runs-item-header">
                  <span className="runs-item-id">{run.id}</span>
                  <span className={`runs-item-status ${run.status}`}>{run.status}</span>
                </div>
                <div className="runs-item-meta">
                  <span>{run.robotId}</span>
                  <span>{formatTimestamp(run.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Timeline */}
        {robotId?.startsWith('so101-') ? (
          renderSo101Panel()
        ) : selectedRun ? (
          <div className="runs-main">
            <div className="runs-header">
              <h1 className="runs-title">Run Execution</h1>
              <div className="runs-actions">
                <button className="btn btn-secondary">Abort</button>
                <button className="btn btn-secondary">Retry</button>
                <button className="btn btn-primary">Rerun with Different Backend</button>
              </div>
            </div>

            <div className="runs-timeline">
              {selectedRun.events.map((event, index) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-marker" style={{ color: getEventColor(event.type) }}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-message">{event.message}</span>
                      <span className="timeline-time">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    {event.metadata && (
                      <div className="timeline-metadata">
                        {event.metadata.latency && (
                          <span className="metadata-item">Latency: {event.metadata.latency} ms</span>
                        )}
                        {event.metadata.backend && (
                          <span className="metadata-item">Backend: {event.metadata.backend}</span>
                        )}
                        {event.metadata.sloPass !== undefined && (
                          <span className={`metadata-item ${event.metadata.sloPass ? 'slo-pass' : 'slo-fail'}`}>
                            SLO: {event.metadata.sloPass ? 'PASS' : 'FAIL'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Output Panel */}
            {selectedRun.output && (
              <div className="runs-output">
                <h3 className="runs-output-title">OUTPUT</h3>
                <div className="runs-output-content">
                  <pre>{selectedRun.output}</pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="runs-empty">
            <p>No run selected. Submit a task from the Tasks page to see execution timeline.</p>
          </div>
        )}
      </div>
    </div>
  );
};

