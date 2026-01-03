import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTaskEvents, useTaskExecution } from '../hooks/useFleet';
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
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const robotId = searchParams.get('robot');
  const taskIdParam = searchParams.get('taskId');

  // Get robot URL (for now, hardcoded - could come from fleet)
  const robotUrl = robotId === 'reachy-001' ? 'http://localhost:9001' : undefined;

  // Fetch task status if we have a taskId
  const { currentTask, getTaskStatus } = useTaskExecution(robotUrl);
  const { events: taskEvents } = useTaskEvents(selectedRunId, robotUrl);

  useEffect(() => {
    if (taskIdParam) {
      setSelectedRunId(taskIdParam);
      getTaskStatus(taskIdParam);
    }
  }, [taskIdParam, getTaskStatus]);

  // Convert current task + events to Run format
  const selectedRun = useMemo<Run | null>(() => {
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
  }, [currentTask, taskEvents, selectedRunId, robotId]);

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
    return date.toLocaleTimeString();
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
                onClick={() => setSelectedRun(run)}
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
        {selectedRun ? (
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

