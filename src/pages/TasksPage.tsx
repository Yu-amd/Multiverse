import React, { useRef, useState, useEffect } from 'react';
import type { Message } from '../types';
import { ChatContainer } from '../components/ChatContainer';
import { CodePanel } from '../components/CodePanel';
import { useSearchParams } from 'react-router-dom';
import './TasksPage.css';

interface TasksPageProps {
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  customEndpoint?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  recordMetrics?: (promptLength: number, responseLength: number, totalTime: number, firstTokenLatency: number, tokensPerSecond: number) => void;
  recordError?: () => void;
  connectionStatus?: 'online' | 'offline' | 'checking';
  showTimestamps?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
  isROGAllyX?: boolean;
  onClearChat?: () => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  handleDeleteMessage?: (messageId: string) => void;
  onOpenApiInfo?: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = (props) => {
  const [searchParams] = useSearchParams();
  const [inputMessage] = useState('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const stopGenerationRef = useRef<(() => void) | null>(null);
  const [selectedTask, setSelectedTask] = useState<'chat' | 'so101' | null>(null);
  const [showTaskOverlay, setShowTaskOverlay] = useState(false);
  const [showChatTask, setShowChatTask] = useState(false);
  const safeMessages: Message[] = props.messages ?? [];
  const safeSetMessages: React.Dispatch<React.SetStateAction<Message[]>> =
    props.setMessages ?? (() => {});
  const safeShowToast = props.showToast ?? (() => {});
  const safeRecordMetrics = props.recordMetrics ?? (() => {});
  const safeRecordError = props.recordError ?? (() => {});
  const safeConnectionStatus = props.connectionStatus ?? 'online';
  const safeShowTimestamps = props.showTimestamps ?? false;
  const safeIsMobile = props.isMobile ?? false;
  const safeIsROGAllyX = props.isROGAllyX ?? false;
  const safeOnClearChat = props.onClearChat ?? (() => {});
  const safeOnOpenHistory = props.onOpenHistory ?? (() => {});
  const safeHandleDeleteMessage = props.handleDeleteMessage ?? (() => {});
  const [so101DatasetReady, setSo101DatasetReady] = useState<boolean | null>(null);
  const [so101DatasetPath, setSo101DatasetPath] = useState('');
  const [so101FollowerPortOk, setSo101FollowerPortOk] = useState<boolean | null>(null);
  const [so101LeaderPortOk, setSo101LeaderPortOk] = useState<boolean | null>(null);
  const [so101CameraOk, setSo101CameraOk] = useState<boolean | null>(null);
  const [so101FollowerPortPath, setSo101FollowerPortPath] = useState('');
  const [so101LeaderPortPath, setSo101LeaderPortPath] = useState('');
  const [so101CameraPath, setSo101CameraPath] = useState('');
  const [so101Running, setSo101Running] = useState(false);
  const [so101Result, setSo101Result] = useState<{ ok: boolean; latencyMs: number } | null>(null);
  const [so101Error, setSo101Error] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatasetInfo = async () => {
      try {
        const response = await fetch('http://localhost:9101/v1/so101/follower/sequence/info');
        if (!response.ok) {
          setSo101DatasetReady(false);
          return;
        }
        const data = await response.json();
        setSo101DatasetReady(Boolean(data.dataset_exists));
        setSo101DatasetPath(data.dataset_root || '');
        setSo101FollowerPortOk(Boolean(data.port_exists));
        setSo101LeaderPortOk(Boolean(data.leader_exists));
        setSo101CameraOk(Boolean(data.camera_exists));
        setSo101FollowerPortPath(data.port_path || '');
        setSo101LeaderPortPath(data.leader_port || '');
        setSo101CameraPath(data.camera_device || '');
      } catch (err) {
        setSo101DatasetReady(false);
        setSo101FollowerPortOk(false);
        setSo101LeaderPortOk(false);
        setSo101CameraOk(false);
        setSo101FollowerPortPath('');
        setSo101LeaderPortPath('');
        setSo101CameraPath('');
      }
    };

    fetchDatasetInfo();
  }, []);

  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam === 'chat' || taskParam === 'so101') {
      setSelectedTask(taskParam);
      setShowTaskOverlay(true);
      if (taskParam === 'chat') {
        setShowChatTask(true);
      }
    }
  }, [searchParams]);

  const runSo101Replay = async () => {
    if (so101Running) {
      return;
    }

    setSo101Running(true);
    setSo101Error(null);
    setSo101Result(null);

    try {
      const datasetInfoResponse = await fetch('http://localhost:9101/v1/so101/follower/sequence/info');
      if (!datasetInfoResponse.ok) {
        throw new Error('Failed to check SO-101 dataset');
      }
      const datasetInfo = await datasetInfoResponse.json();
      if (!datasetInfo.dataset_exists) {
        throw new Error('SO-101 replay dataset not found. Record the motion first.');
      }

      const startTime = Date.now();
      const seqResponse = await fetch('http://localhost:9101/v1/so101/follower/sequence/start', {
        method: 'POST',
      });
      if (!seqResponse.ok) {
        throw new Error('Failed to start SO-101 replay');
      }
      const seqData = await seqResponse.json();
      const seqRunId = seqData.run_id;

      let done = false;
      let ok = false;
      for (let i = 0; i < 120; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusResponse = await fetch(
          `http://localhost:9101/v1/so101/follower/sequence/status?run_id=${encodeURIComponent(seqRunId)}`
        );
        if (!statusResponse.ok) {
          continue;
        }
        const statusData = await statusResponse.json();
        if (statusData.running === 'false') {
          done = true;
          ok = statusData.returncode === '0' || statusData.returncode === 0;
          break;
        }
      }

      if (!done) {
        throw new Error('SO-101 replay timed out');
      }

      setSo101Result({ ok, latencyMs: Date.now() - startTime });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SO-101 replay failed';
      setSo101Error(message);
    } finally {
      setSo101Running(false);
    }
  };

  return (
    <div className="tasks-page">
      <div className="tasks-page-content">
        <div className="tasks-tiles">
          <button
            className={`task-tile ${selectedTask === 'chat' ? 'active' : ''}`}
            onClick={() => {
              setSelectedTask('chat');
              setShowTaskOverlay(true);
              setShowChatTask(true);
            }}
            type="button"
          >
            <div>
              <h2>Chat Task</h2>
              <p>Run natural language tasks against the active backend.</p>
            </div>
            <span className="task-tile-cta">Open Chat</span>
          </button>
          <button
            className={`task-tile ${selectedTask === 'so101' ? 'active' : ''}`}
            onClick={() => {
              setSelectedTask('so101');
              setShowTaskOverlay(true);
            }}
            type="button"
          >
            <div>
              <h2>SO-101 Replay Task</h2>
              <p>Deterministic follower motion using recorded replay.</p>
            </div>
            <span className="task-tile-cta">Review & Run</span>
          </button>
        </div>

        {showTaskOverlay && selectedTask && (
          <div className="task-overlay" onClick={() => setShowTaskOverlay(false)}>
            <div className="task-overlay-card" onClick={(event) => event.stopPropagation()}>
              <div className="task-overlay-header">
                <h3>{selectedTask === 'chat' ? 'Chat Task' : 'SO-101 Replay Task'}</h3>
                <button
                  className="task-overlay-close"
                  onClick={() => setShowTaskOverlay(false)}
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="task-overlay-body">
                {selectedTask === 'chat' ? (
                  <>
                    <p>
                      Launch the chat workflow for natural language tasks routed through your configured backend.
                    </p>
                    <div className="task-overlay-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setShowChatTask(true);
                          setShowTaskOverlay(false);
                        }}
                      >
                        Launch Chat
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowTaskOverlay(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Replay a recorded motion dataset for the SO-101 follower arm. Dataset status is shown below.
                    </p>
                    <div className="so101-task-health">
                      <div className="so101-task-status">
                        <span>Follower Port</span>
                        <span className={`so101-task-badge ${so101FollowerPortOk ? 'ok' : 'error'}`}>
                          {so101FollowerPortOk ? 'READY' : 'UNPLUGGED'}
                        </span>
                      </div>
                      <div className="so101-task-status">
                        <span>Leader Port</span>
                        <span className={`so101-task-badge ${so101LeaderPortOk ? 'ok' : 'error'}`}>
                          {so101LeaderPortOk ? 'READY' : 'UNPLUGGED'}
                        </span>
                      </div>
                      <div className="so101-task-status">
                        <span>Camera</span>
                        <span className={`so101-task-badge ${so101CameraOk ? 'ok' : 'error'}`}>
                          {so101CameraOk ? 'READY' : 'UNPLUGGED'}
                        </span>
                      </div>
                    </div>
                    {(!so101FollowerPortOk || !so101LeaderPortOk || !so101CameraOk) && (
                      <div className="so101-task-hints">
                        <strong>Reconnect required</strong>
                        {!so101FollowerPortOk && (
                          <div>Follower not detected at {so101FollowerPortPath || 'unknown path'}.</div>
                        )}
                        {!so101LeaderPortOk && (
                          <div>Leader not detected at {so101LeaderPortPath || 'unknown path'}.</div>
                        )}
                        {!so101CameraOk && (
                          <div>Camera not detected at {so101CameraPath || 'unknown path'}.</div>
                        )}
                        <div>Replug the USB device and run: sudo udevadm control --reload-rules && sudo udevadm trigger</div>
                      </div>
                    )}
                    <div className="so101-task-dataset">
                      <span className="so101-task-label">Dataset</span>
                      <span className={`so101-task-badge ${so101DatasetReady ? 'ok' : 'error'}`}>
                        {so101DatasetReady ? 'READY' : 'MISSING'}
                      </span>
                      <span className="so101-task-path">{so101DatasetPath || 'unknown'}</span>
                    </div>
                    {so101Error && <div className="so101-task-error">Error: {so101Error}</div>}
                    {so101Result && (
                      <div className="so101-task-result">
                        <span className={`so101-task-badge ${so101Result.ok ? 'ok' : 'error'}`}>
                          {so101Result.ok ? 'PASS' : 'FAIL'}
                        </span>
                        <span className="so101-task-latency">{so101Result.latencyMs} ms</span>
                      </div>
                    )}
                    <div className="task-overlay-actions">
                      <button
                        className="btn btn-primary"
                        onClick={runSo101Replay}
                        disabled={so101Running || !so101DatasetReady || !so101FollowerPortOk}
                      >
                        {so101Running ? 'Running...' : 'Run Replay Task'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowTaskOverlay(false)}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Container - Full Width */}
        {showChatTask && (
          <div className="chat-wrapper">
            <ChatContainer
            messages={safeMessages}
            setMessages={safeSetMessages}
            customEndpoint={props.customEndpoint || ''}
            apiKey={props.apiKey || ''}
            temperature={props.temperature || 0.7}
            maxTokens={props.maxTokens || 2048}
            topP={props.topP || 1.0}
            showToast={safeShowToast}
            recordMetrics={safeRecordMetrics}
            recordError={safeRecordError}
            connectionStatus={safeConnectionStatus}
            showTimestamps={safeShowTimestamps}
            isMobile={safeIsMobile}
            isROGAllyX={safeIsROGAllyX}
            onClearChat={safeOnClearChat}
            onOpenHistory={safeOnOpenHistory}
            handleDeleteMessage={safeHandleDeleteMessage}
            onStopGenerationRef={stopGenerationRef}
            onToggleCodePreview={() => setShowCodePreview(!showCodePreview)}
            showCodePreview={showCodePreview}
          />
          </div>
        )}

        {/* Code Panel - Overlay when shown */}
        {showCodePreview && (
          <div className="code-preview-overlay" onClick={() => setShowCodePreview(false)}>
            <div className="code-preview-panel" onClick={(e) => e.stopPropagation()}>
              <div className="code-preview-header">
                <h3>Code Preview</h3>
                <button
                  className="code-preview-close-button"
                  onClick={() => setShowCodePreview(false)}
                  aria-label="Close code preview"
                >
                  ✕
                </button>
              </div>
              <CodePanel
                messages={props.messages || []}
                inputMessage={inputMessage}
                customEndpoint={props.customEndpoint || ''}
                apiKey={props.apiKey || ''}
                temperature={props.temperature || 0.7}
                maxTokens={props.maxTokens || 2048}
                topP={props.topP || 1.0}
                showToast={props.showToast || (() => {})}
                onOpenApiInfo={props.onOpenApiInfo || (() => {})}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

