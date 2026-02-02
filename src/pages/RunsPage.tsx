import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTaskEvents, useTaskExecution } from '../hooks/useFleet';
import { fleetApi, lekiwiConfig, type TaskEvent, type TaskStatus } from '../services/fleetApi';
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

interface MetricSample {
  labels: Record<string, string>;
  value: number;
}

interface MetricsSummaryItem {
  label: string;
  value: string;
}

interface TaskBreakdownItem {
  task: string;
  active: number;
  total: number;
  success: number;
  error: number;
  abort: number;
  errors: number;
  avgDurationMs: number | null;
}

interface MetricsSummary {
  title: string;
  items: MetricsSummaryItem[];
  taskBreakdown?: TaskBreakdownItem[];
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

const parsePrometheusMetrics = (metricsText: string): Map<string, MetricSample[]> => {
  const metrics = new Map<string, MetricSample[]>();
  const lines = metricsText.split('\n');
  const linePattern = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([-+eE0-9.]+)$/;

  lines.forEach((line) => {
    if (!line || line.startsWith('#')) return;
    const match = line.match(linePattern);
    if (!match) return;
    const name = match[1];
    const labelsRaw = match[3];
    const value = Number(match[4]);
    if (!Number.isFinite(value)) return;

    const labels: Record<string, string> = {};
    if (labelsRaw) {
      labelsRaw.split(',').forEach((pair) => {
        const [key, rawValue] = pair.split('=');
        if (!key || rawValue === undefined) return;
        labels[key.trim()] = rawValue.trim().replace(/^"|"$/g, '');
      });
    }

    const entries = metrics.get(name) || [];
    entries.push({ labels, value });
    metrics.set(name, entries);
  });

  return metrics;
};

export const RunsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const robotId = searchParams.get('robot');
  const taskIdParam = searchParams.get('taskId');
  const cameraMode = searchParams.get('mode');
  const cameraArtifact = searchParams.get('artifact');
  const cameraLatency = searchParams.get('latency');
  const cameraTimestamp = searchParams.get('ts');

  const effectiveRobotId = robotId ?? selectedRobotId;

  // Get robot URL (for now, hardcoded - could come from fleet)
  const robotUrl = effectiveRobotId?.startsWith('so101-')
    ? 'http://localhost:9101'
    : effectiveRobotId === 'reachy-001'
    ? 'http://localhost:9001'
    : effectiveRobotId === lekiwiConfig.deviceId
    ? lekiwiConfig.baseUrl
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
  const [metricsSamples, setMetricsSamples] = useState<Map<string, MetricSample[]> | null>(null);
  const [leaderJoints, setLeaderJoints] = useState<any>(null);
  const [leaderError, setLeaderError] = useState<string | null>(null);

  useEffect(() => {
    if (taskIdParam) {
      setSelectedRunId(taskIdParam);
      getTaskStatus(taskIdParam);
    }
  }, [taskIdParam, getTaskStatus]);

  useEffect(() => {
    if (!robotUrl) {
      setMetricsSamples(null);
      return;
    }
    let active = true;

    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${robotUrl}/v1/metrics`);
        if (!response.ok) return;
        const text = await response.text();
        if (!active) return;
        setMetricsSamples(parsePrometheusMetrics(text));
      } catch {
        if (!active) return;
        setMetricsSamples(null);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [robotUrl]);

  useEffect(() => {
    if (selectedRunId && effectiveRobotId === 'reachy-001' && robotUrl) {
      getTaskStatus(selectedRunId).catch(() => null);
    }
  }, [selectedRunId, effectiveRobotId, robotUrl, getTaskStatus]);

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

  const mapSo101RobotId = (task: TaskStatus): string => {
    const content = String(task.result?.content || '').toLowerCase();
    const taskType = String(task.result?.task_type || '').toLowerCase();
    const combined = `${taskType} ${content}`;
    if (combined.includes('camera')) return 'so101-camera';
    if (combined.includes('leader')) return 'so101-leader';
    return 'so101-follower';
  };

  useEffect(() => {
    let active = true;

    const fetchRunsForRobot = async (url: string, id: string, mapSo101: boolean) => {
      const history = await fleetApi.getRuns(url, 200);
      return history.map((task) => ({
        id: task.task_id,
        taskId: task.task_id,
        robotId: mapSo101 ? mapSo101RobotId(task) : id,
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
        if (robotId === 'reachy-001') {
          mapped = await fetchRunsForRobot('http://localhost:9001', 'reachy-001', false);
        } else if (robotId?.startsWith('so101-')) {
          mapped = await fetchRunsForRobot('http://localhost:9101', 'so101-follower', true);
          mapped = mapped.filter((run) => run.robotId === robotId);
        } else {
          const [reachyRuns, so101Runs] = await Promise.all([
            fetchRunsForRobot('http://localhost:9001', 'reachy-001', false).catch(() => []),
            fetchRunsForRobot('http://localhost:9101', 'so101-follower', true).catch(() => []),
          ]);
          mapped = [...reachyRuns, ...so101Runs];
        }

        if (!active) return;
        mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRuns(mapped);
        if (!selectedRunId && mapped.length > 0) {
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
  }, [robotId, selectedRunId]);

  useEffect(() => {
    if (!effectiveRobotId || !effectiveRobotId.startsWith('so101-')) {
      return;
    }
    let active = true;

    const pollHealth = async () => {
      try {
        const role = effectiveRobotId.replace('so101-', '');
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
      if (effectiveRobotId !== 'so101-follower') return;
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
  }, [effectiveRobotId]);

  useEffect(() => {
    if (effectiveRobotId !== 'so101-leader') {
      setLeaderJoints(null);
      setLeaderError(null);
      return;
    }
    let active = true;

    const pollLeaderJoints = async () => {
      try {
        const response = await fetch('http://localhost:9101/v1/so101/leader/joints');
        if (!response.ok) {
          throw new Error('Failed to fetch leader joints');
        }
        const data = await response.json();
        if (!active) return;
        if (!data.ok) {
          setLeaderError(data.message || data.error || 'Leader unavailable');
          setLeaderJoints(null);
          return;
        }
        setLeaderError(null);
        setLeaderJoints(data);
      } catch (err) {
        if (!active) return;
        setLeaderError(err instanceof Error ? err.message : 'Failed to fetch leader joints');
        setLeaderJoints(null);
      }
    };

    pollLeaderJoints();
    const interval = setInterval(pollLeaderJoints, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [effectiveRobotId]);

  useEffect(() => {
    if (effectiveRobotId !== 'so101-camera') {
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
  }, [effectiveRobotId, cameraMode]);

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
      robotId: effectiveRobotId || 'unknown',
      status: currentTask?.state === 'completed' ? 'completed' : currentTask?.state === 'failed' ? 'failed' : currentTask?.state === 'running' ? 'running' : 'pending',
      events: runEvents,
      output: currentTask?.result?.content,
      createdAt: currentTask?.created_at || new Date().toISOString(),
      taskStatus: currentTask || undefined,
    };
  }, [currentTask, taskEvents, selectedRunId, effectiveRobotId, runs]);

  const groupedRuns = useMemo(() => {
    const groups = new Map<string, Run[]>();
    runs.forEach((run) => {
      const list = groups.get(run.robotId) || [];
      list.push(run);
      groups.set(run.robotId, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [runs]);

  const metricsSummary = useMemo<MetricsSummary | null>(() => {
    if (!metricsSamples || !effectiveRobotId) return null;

    const matchLabels = (labels: Record<string, string>, filter: Record<string, string>) =>
      Object.entries(filter).every(([key, value]) => labels[key] === value);

    const getSamples = (name: string, filter?: Record<string, string>) => {
      const samples = metricsSamples.get(name) || [];
      if (!filter) return samples;
      return samples.filter((sample) => matchLabels(sample.labels, filter));
    };

    const sumSamples = (name: string, filter?: Record<string, string>) =>
      getSamples(name, filter).reduce((acc, sample) => acc + sample.value, 0);

    const pickSample = (name: string, filter?: Record<string, string>) =>
      getSamples(name, filter)[0]?.value ?? null;

    const maxSample = (name: string, filter?: Record<string, string>) =>
      getSamples(name, filter).reduce((acc, sample) => Math.max(acc, sample.value), 0);

    const sumByLabel = (
      name: string,
      labelKey: string,
      labelValue: string,
      filter?: Record<string, string>,
    ) =>
      getSamples(name, filter)
        .filter((sample) => sample.labels[labelKey] === labelValue)
        .reduce((acc, sample) => acc + sample.value, 0);

    const histogramAverage = (baseName: string, filter?: Record<string, string>) => {
      const sum = sumSamples(`${baseName}_sum`, filter);
      const count = sumSamples(`${baseName}_count`, filter);
      if (!count) return null;
      return sum / count;
    };

    const buildTaskBreakdown = (endpointLabel?: string): TaskBreakdownItem[] => {
      const filter = endpointLabel ? { endpoint: endpointLabel } : undefined;
      const tasks = new Set<string>();
      const collectTasks = (name: string) => {
        getSamples(name, filter).forEach((sample) => {
          const taskLabel = sample.labels.task;
          if (taskLabel) {
            tasks.add(taskLabel);
          }
        });
      };
      collectTasks('task_run_total');
      collectTasks('task_run_active');
      collectTasks('task_error_total');
      collectTasks('task_run_duration_ms_count');

      return Array.from(tasks)
        .sort()
        .map((task) => ({
          task,
          active: sumSamples('task_run_active', { ...filter, task }),
          total: sumSamples('task_run_total', { ...filter, task }),
          success: sumByLabel('task_run_total', 'status', 'success', { ...filter, task }),
          error: sumByLabel('task_run_total', 'status', 'error', { ...filter, task }),
          abort: sumByLabel('task_run_total', 'status', 'abort', { ...filter, task }),
          errors: sumSamples('task_error_total', { ...filter, task }),
          avgDurationMs: histogramAverage('task_run_duration_ms', { ...filter, task }),
        }));
    };

    if (effectiveRobotId === 'so101-camera') {
      const fps = pickSample('camera_stream_fps', { device: 'so101-camera' })
        ?? pickSample('camera_stream_fps');
      const frameAge = pickSample('camera_frame_age_ms', { device: 'so101-camera' })
        ?? pickSample('camera_frame_age_ms');
      const controlTick = histogramAverage('control_loop_tick_ms', { endpoint: 'so101-camera' });
      return {
        title: 'Camera Metrics',
        items: [
          { label: 'Stream FPS', value: fps !== null ? `${fps.toFixed(2)}` : '--' },
          { label: 'Frame Age', value: frameAge !== null ? `${frameAge.toFixed(0)} ms` : '--' },
          { label: 'Dropped Frames', value: `${sumSamples('camera_dropped_frames_total')}` },
          { label: 'Capture Failures', value: `${sumSamples('camera_frame_capture_fail_total')}` },
          {
            label: 'Avg Control Tick',
            value: controlTick !== null ? `${controlTick.toFixed(1)} ms` : '--',
          },
          {
            label: 'Avg Capture Latency',
            value: histogramAverage('camera_frame_capture_latency_ms') !== null
              ? `${histogramAverage('camera_frame_capture_latency_ms')!.toFixed(1)} ms`
              : '--',
          },
          {
            label: 'Avg Frame Size',
            value: histogramAverage('camera_frame_bytes') !== null
              ? `${(histogramAverage('camera_frame_bytes')! / 1024).toFixed(1)} KB`
              : '--',
          },
          {
            label: 'Avg Jitter',
            value: histogramAverage('camera_stream_jitter_ms') !== null
              ? `${histogramAverage('camera_stream_jitter_ms')!.toFixed(1)} ms`
              : '--',
          },
        ],
      };
    }

    if (effectiveRobotId.startsWith('so101-')) {
      const lastSuccess = maxSample('task_last_success_timestamp', { endpoint: effectiveRobotId });
      const avgRun = histogramAverage('task_run_duration_ms', { endpoint: effectiveRobotId });
      const avgE2E = histogramAverage('e2e_action_latency_ms', { endpoint: effectiveRobotId });
      const avgTick = histogramAverage('control_loop_tick_ms', { endpoint: effectiveRobotId });
      const successRuns = sumByLabel('task_run_total', 'status', 'success', { endpoint: effectiveRobotId });
      const errorRuns = sumByLabel('task_run_total', 'status', 'error', { endpoint: effectiveRobotId });
      const abortRuns = sumByLabel('task_run_total', 'status', 'abort', { endpoint: effectiveRobotId });
      const voltage = pickSample('device_voltage_mv', { endpoint: effectiveRobotId });
      const powerOk = pickSample('device_power_ok', { endpoint: effectiveRobotId });
      return {
        title: 'Endpoint Metrics',
        items: [
          { label: 'Device Ready', value: pickSample('device_ready', { endpoint: effectiveRobotId }) === 1 ? 'Yes' : 'No' },
          { label: 'Power OK', value: powerOk === null ? '--' : powerOk === 1 ? 'Yes' : 'No' },
          { label: 'Voltage', value: voltage !== null ? `${voltage.toFixed(0)} mV` : '--' },
          { label: 'Active Runs', value: `${sumSamples('task_run_active', { endpoint: effectiveRobotId })}` },
          { label: 'Total Runs', value: `${sumSamples('task_run_total', { endpoint: effectiveRobotId })}` },
          { label: 'Success Runs', value: `${successRuns}` },
          { label: 'Error Runs', value: `${errorRuns}` },
          { label: 'Abort Runs', value: `${abortRuns}` },
          { label: 'Task Errors', value: `${sumSamples('task_error_total', { endpoint: effectiveRobotId })}` },
          {
            label: 'Avg Run Duration',
            value: avgRun !== null ? `${avgRun.toFixed(0)} ms` : '--',
          },
          {
            label: 'Avg E2E Action',
            value: avgE2E !== null ? `${avgE2E.toFixed(0)} ms` : '--',
          },
          {
            label: 'Avg Control Tick',
            value: avgTick !== null ? `${avgTick.toFixed(1)} ms` : '--',
          },
          {
            label: 'Disconnects',
            value: `${sumSamples('device_disconnect_total', { endpoint: effectiveRobotId })}`,
          },
          {
            label: 'Last Success',
            value: lastSuccess ? new Date(lastSuccess * 1000).toLocaleString() : '--',
          },
        ],
        taskBreakdown: buildTaskBreakdown(effectiveRobotId),
      };
    }

    if (effectiveRobotId === 'reachy-001') {
      const ttft = histogramAverage('llm_ttft_ms');
      const totalLatency = histogramAverage('llm_total_latency_ms');
      const requestTotal = sumSamples('llm_request_total');
      const requestSuccess = sumByLabel('llm_request_total', 'status', 'success');
      const requestErrors = Math.max(0, requestTotal - requestSuccess);
      const requestRateLimited = sumSamples('llm_rate_limited_total');
      const requestTimeouts = sumSamples('llm_timeout_total');
      return {
        title: 'LLM Metrics',
        items: [
          { label: 'Requests', value: `${requestTotal}` },
          { label: 'Request Errors', value: `${requestErrors}` },
          { label: 'Timeouts', value: `${requestTimeouts}` },
          { label: 'Rate Limited', value: `${requestRateLimited}` },
          { label: 'Avg TTFT', value: ttft !== null ? `${ttft.toFixed(0)} ms` : '--' },
          { label: 'Avg Total Latency', value: totalLatency !== null ? `${totalLatency.toFixed(0)} ms` : '--' },
        ],
        taskBreakdown: buildTaskBreakdown(effectiveRobotId),
      };
    }

    return null;
  }, [metricsSamples, effectiveRobotId]);

  const renderTaskBreakdown = (summary: MetricsSummary) => {
    if (!summary.taskBreakdown || summary.taskBreakdown.length === 0) return null;
    return (
      <div className="runs-metrics-breakdown">
        <h4>Per-task Breakdown</h4>
        <div className="runs-metrics-breakdown-table">
          <div className="runs-metrics-breakdown-row runs-metrics-breakdown-header">
            <span>Task</span>
            <span>Active</span>
            <span>Total</span>
            <span>Success</span>
            <span>Error</span>
            <span>Abort</span>
            <span>Errors</span>
            <span>Avg Duration</span>
          </div>
          {summary.taskBreakdown.map((item) => (
            <div key={item.task} className="runs-metrics-breakdown-row">
              <span>{item.task}</span>
              <span>{item.active}</span>
              <span>{item.total}</span>
              <span>{item.success}</span>
              <span>{item.error}</span>
              <span>{item.abort}</span>
              <span>{item.errors}</span>
              <span>{item.avgDurationMs !== null ? `${item.avgDurationMs.toFixed(0)} ms` : '--'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
    if (!effectiveRobotId?.startsWith('so101-')) return null;

    if (effectiveRobotId === 'so101-camera') {
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
          {metricsSummary && (
            <div className="runs-metrics-panel">
              <h3>{metricsSummary.title}</h3>
              <div className="runs-metrics-grid">
                {metricsSummary.items.map((item) => (
                  <div key={item.label} className="runs-metrics-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              {renderTaskBreakdown(metricsSummary)}
            </div>
          )}
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
          <h1 className="runs-title">SO-101 {effectiveRobotId.replace('so101-', '').toUpperCase()}</h1>
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
          {effectiveRobotId === 'so101-follower' && so101Info && (
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
          {effectiveRobotId === 'so101-leader' && (
            <div className="runs-leader-joints">
              <div className="runs-leader-joints-header">
                <span>Leader Joint Readings</span>
                <span className="runs-leader-joints-port">{leaderJoints?.port || '--'}</span>
              </div>
              {leaderError ? (
                <div className="runs-leader-joints-error">{leaderError}</div>
              ) : leaderJoints?.joints?.length ? (
                <div className="runs-leader-joints-grid">
                  {leaderJoints.joints.map((joint: { name: string; value: number; unit: string }) => (
                    <div key={joint.name} className="runs-leader-joint">
                      <span>{joint.name}</span>
                      <strong>
                        {Number.isFinite(joint.value) ? joint.value.toFixed(1) : '--'} {joint.unit}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="runs-leader-joints-empty">No joint data available.</div>
              )}
            </div>
          )}
          {metricsSummary && (
            <div className="runs-metrics-panel">
              <h3>{metricsSummary.title}</h3>
              <div className="runs-metrics-grid">
                {metricsSummary.items.map((item) => (
                  <div key={item.label} className="runs-metrics-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              {renderTaskBreakdown(metricsSummary)}
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
            {groupedRuns.map(([groupId, groupRuns]) => (
              <div key={groupId} className="runs-section">
                <div className="runs-section-title">{groupId}</div>
                {groupRuns.map((run) => (
                  <button
                    key={run.id}
                    className={`runs-item ${selectedRun?.id === run.id ? 'active' : ''}`}
                    onClick={() => {
                      if (!robotId) {
                        setSelectedRobotId(run.robotId);
                      }
                      setSelectedRunId(run.id);
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
            ))}
          </div>
        </div>

        {/* Center: Timeline */}
        {effectiveRobotId?.startsWith('so101-') ? (
          renderSo101Panel()
        ) : selectedRun ? (
          <div className="runs-main">
            <div className="runs-header">
              <h1 className="runs-title">Run Execution</h1>
            </div>
          {metricsSummary && (
            <div className="runs-metrics-panel">
              <h3>{metricsSummary.title}</h3>
              <div className="runs-metrics-grid">
                {metricsSummary.items.map((item) => (
                  <div key={item.label} className="runs-metrics-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              {renderTaskBreakdown(metricsSummary)}
            </div>
          )}

            <div className="runs-timeline">
              {selectedRun.events.map((event) => (
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

