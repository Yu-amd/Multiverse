import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../hooks/useFleet';
import { fleetApi } from '../services/fleetApi';
import { useToast } from '../hooks/useToast';
import type { Robot } from '../services/fleetApi';
import './FleetPage.css';

interface StatusCheckModalProps {
  robot: Robot;
  isOpen: boolean;
  onClose: () => void;
}

const getRoleLabel = (robotId: string) => {
  if (robotId === 'so101-leader') return 'CONTROL SURFACE';
  if (robotId === 'so101-camera') return 'SENSOR';
  if (robotId === 'so101-follower') return 'ACTUATION';
  if (robotId === 'reachy-001') return 'SOCIAL ROBOT';
  return 'ENDPOINT';
};

const StatusCheckModal: React.FC<StatusCheckModalProps> = ({ robot, isOpen, onClose }) => {
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<Robot['health']>(robot.health);
  const [config, setConfig] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && robot.url) {
      performStatusCheck();
    }
  }, [isOpen, robot.url]);

  const performStatusCheck = async () => {
    setChecking(true);
    try {
      const [healthData, configData] = await Promise.all([
        fleetApi.getAgentHealth(robot.url, robot.id.startsWith('so101-') ? robot.id.replace('so101-', '') : undefined).catch(() => null),
        robot.id === 'reachy-001' 
          ? fleetApi.getAgentConfig(robot.url).catch(() => null)
          : Promise.resolve(null),
      ]);
      
      setHealth(healthData ?? undefined);
      setConfig(configData);
      
      if (healthData) {
        showToast('Status check completed', 'success');
      } else {
        showToast('Status check failed - agent may be offline', 'error');
      }
    } catch (err) {
      console.error('Status check error:', err);
      showToast('Failed to check status', 'error');
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="status-modal-overlay" onClick={onClose}>
      <div className="status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="status-modal-header">
          <h2>Status Check: {robot.name}</h2>
          <button className="status-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="status-modal-body">
          {checking ? (
            <div className="status-checking">
              <div className="status-spinner"></div>
              <p>Checking status...</p>
            </div>
          ) : (
            <>
              <div className="status-section">
                <h3>Health Status</h3>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="status-label">Overall Status</span>
                    <span className={`status-value status-${health?.status || 'offline'}`}>
                      {health?.status?.toUpperCase() || 'OFFLINE'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Sensors</span>
                    <span
                      className={`status-value ${
                        health?.sensors_ok === undefined ? 'status-na' : (health?.sensors_ok ? 'status-ok' : 'status-error')
                      }`}
                    >
                      {health?.sensors_ok === undefined ? 'N/A' : health?.sensors_ok ? '✓ OK' : '✗ FAILED'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Actuators</span>
                    <span
                      className={`status-value ${
                        health?.actuators_ok === undefined ? 'status-na' : (health?.actuators_ok ? 'status-ok' : 'status-error')
                      }`}
                    >
                      {health?.actuators_ok === undefined ? 'N/A' : health?.actuators_ok ? '✓ OK' : '✗ FAILED'}
                    </span>
                  </div>
                  {health?.uptime_seconds !== undefined && (
                    <div className="status-item">
                      <span className="status-label">Uptime</span>
                      <span className="status-value">
                        {Math.floor(health.uptime_seconds / 3600)}h {Math.floor((health.uptime_seconds % 3600) / 60)}m
                      </span>
                    </div>
                  )}
                  {health?.last_seen && (
                    <div className="status-item">
                      <span className="status-label">Last Seen</span>
                      <span className="status-value">
                        {new Date(health.last_seen).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {config && robot.id === 'reachy-001' && (
                <div className="status-section">
                  <h3>Configuration</h3>
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="status-label">Hardware Mode</span>
                      <span className={`status-value ${config.runtime.hardware_enabled ? 'status-ok' : 'status-warning'}`}>
                        {config.runtime.hardware_enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Driver Connected</span>
                      <span className={`status-value ${config.runtime.driver_connected ? 'status-ok' : 'status-error'}`}>
                        {config.runtime.driver_connected ? '✓ CONNECTED' : '✗ NOT CONNECTED'}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Audio Enabled</span>
                      <span className={`status-value ${config.runtime.audio_enabled ? 'status-ok' : 'status-warning'}`}>
                        {config.runtime.audio_enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Mocked Mode</span>
                      <span className={`status-value ${config.runtime.current_mocked ? 'status-warning' : 'status-ok'}`}>
                        {config.runtime.current_mocked ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {robot.id.startsWith('so101-') && health?.checks && (
                <div className="status-section">
                  <h3>Device Paths</h3>
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="status-label">Follower Port</span>
                      <span
                        className={`status-value ${health.checks.follower_port_ok ? 'status-ok' : 'status-error'}`}
                      >
                        {health.checks.follower_port_ok ? '✓ OK' : '✗ MISSING'}
                      </span>
                      {!health.checks.follower_port_ok && (
                        <span className="status-hint">
                          Replug follower USB or reload udev.
                        </span>
                      )}
                    </div>
                    <div className="status-item">
                      <span className="status-label">Leader Port</span>
                      <span
                        className={`status-value ${health.checks.leader_port_ok ? 'status-ok' : 'status-error'}`}
                      >
                        {health.checks.leader_port_ok ? '✓ OK' : '✗ MISSING'}
                      </span>
                      {!health.checks.leader_port_ok && (
                        <span className="status-hint">
                          Replug leader USB or reload udev.
                        </span>
                      )}
                    </div>
                    <div className="status-item">
                      <span className="status-label">Camera</span>
                      <span
                        className={`status-value ${health.checks.camera_ok ? 'status-ok' : 'status-error'}`}
                      >
                        {health.checks.camera_ok ? '✓ OK' : '✗ MISSING'}
                      </span>
                      {!health.checks.camera_ok && (
                        <span className="status-hint">
                          Replug camera or check /dev/robot_cam.
                        </span>
                      )}
                    </div>
                  </div>
                  {health?.paths && (
                    <div className="status-paths">
                      <div>
                        <span>Follower:</span> {health.paths.follower_port || 'unset'}
                      </div>
                      <div>
                        <span>Leader:</span> {health.paths.leader_port || 'unset'}
                      </div>
                      <div>
                        <span>Camera:</span> {health.paths.camera_device || 'unset'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="status-section">
                <h3>Robot Information</h3>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="status-label">Robot ID</span>
                    <span className="status-value">{robot.id}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Type</span>
                    <span className="status-value">{robot.type}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Role</span>
                    <span className="status-value">{getRoleLabel(robot.id)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Backend</span>
                    <span className="status-value">{robot.backend}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">URL</span>
                    <span className="status-value status-url">{robot.url}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="status-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={performStatusCheck} disabled={checking}>
            {checking ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FleetPage: React.FC = () => {
  const navigate = useNavigate();
  const { robots, loading, error, refetch } = useFleet();
  const { showToast } = useToast();
  const [hardwareEnabled, setHardwareEnabled] = useState<Record<string, boolean>>({});
  const [loadingConfig, setLoadingConfig] = useState<Record<string, boolean>>({});
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [agentCommandRunning, setAgentCommandRunning] = useState<'start' | 'stop' | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const runAgentCommand = async (action: 'start' | 'stop') => {
    setAgentCommandRunning(action);
    try {
      const response = await fetch(`http://localhost:8000/api/agents/${action}-all`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} agents`);
      }
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error || `Failed to ${action} agents`);
      }
      showToast(`Agents ${action === 'start' ? 'starting' : 'stopping'}...`, 'success');
      refetch();
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} agents`;
      showToast(message, 'error');
    } finally {
      setAgentCommandRunning(null);
    }
  };

  useEffect(() => {
    let active = true;
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/health');
        if (!active) return;
        setBackendOnline(response.ok);
      } catch {
        if (!active) return;
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (status: Robot['status']) => {
    switch (status) {
      case 'READY':
        return '#22c55e'; // green
      case 'BUSY':
        return '#3b82f6'; // blue
      case 'SIM':
        return '#8b5cf6'; // purple - simulation mode
      case 'FALLBACK':
        return '#f59e0b'; // yellow - hardware enabled but not connected
      case 'DEGRADED':
        return '#f59e0b'; // yellow
      case 'OFFLINE':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };


  const handleRunTask = (robotId: string) => {
    navigate(`/tasks?robot=${robotId}`);
  };

  const handleView = (robotId: string) => {
    navigate(`/runs?robot=${robotId}`);
  };

  const handleCheckStatus = (robot: Robot) => {
    setSelectedRobot(robot);
    setStatusModalOpen(true);
  };

  // Load hardware config for Reachy Mini
  useEffect(() => {
    const loadConfig = async () => {
      const reachyRobot = robots.find(r => r.id === 'reachy-001');
      if (reachyRobot && reachyRobot.url) {
        try {
          const config = await fleetApi.getAgentConfig(reachyRobot.url);
          // Use runtime hardware_enabled (which reflects actual state)
          setHardwareEnabled(prev => ({
            ...prev,
            'reachy-001': config.runtime.hardware_enabled
          }));
        } catch (err) {
          console.warn('Failed to load Reachy config:', err);
        }
      }
    };
    if (robots.length > 0) {
      loadConfig();
    }
  }, [robots]);


  const handleToggleHardware = async (robotId: string, robotUrl: string) => {
    // Prevent multiple simultaneous toggles
    if (loadingConfig[robotId]) {
      return;
    }
    
    setLoadingConfig(prev => ({ ...prev, [robotId]: true }));
    
    // Get current state - default to false if not set
    const currentEnabled = hardwareEnabled[robotId] ?? false;
    const newEnabled = !currentEnabled;
    
    try {
      // Update config
      await fleetApi.setHardwareEnabled(newEnabled, robotUrl);
      
      // Reload config to apply changes
      const result = await fleetApi.reloadAgentConfig(robotUrl);
      
      // Update state with the actual result from the server
      setHardwareEnabled(prev => ({
        ...prev,
        [robotId]: result.hardware_enabled
      }));
      
      showToast(
        `Hardware ${result.hardware_enabled ? 'enabled' : 'disabled'} successfully`,
        'success'
      );
      
      // Refetch fleet status
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to toggle hardware:', err);
      showToast(
        `Failed to ${newEnabled ? 'enable' : 'disable'} hardware: ${errorMessage}`,
        'error'
      );
      // Don't update state on error - keep current state
    } finally {
      setLoadingConfig(prev => ({ ...prev, [robotId]: false }));
    }
  };


  if (loading) {
    return (
      <div className="fleet-page">
        <div className="fleet-loading">Loading fleet status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fleet-page">
        <div className="fleet-error">
          <p>Error loading fleet: {error.message}</p>
          <button onClick={refetch} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusCounts = robots.reduce(
    (acc, robot) => {
      acc[robot.status] = (acc[robot.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const agentsRunning = robots.some(
    (robot) => robot.status === 'READY' || robot.status === 'DEGRADED'
  );

  return (
    <div className="fleet-page">
      <div className="fleet-header">
        <h1 className="fleet-title">Fleet</h1>
        <div className="fleet-header-actions">
          <button
            className={`btn ${agentsRunning ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => runAgentCommand(agentsRunning ? 'stop' : 'start')}
            disabled={agentCommandRunning !== null || !backendOnline}
          >
            {agentCommandRunning === 'start'
              ? 'Starting...'
              : agentCommandRunning === 'stop'
              ? 'Stopping...'
              : agentsRunning
              ? 'Stop Agents'
              : 'Start Agents'}
          </button>
          {!backendOnline && (
            <span className="fleet-backend-warning">Backend offline</span>
          )}
          <div className="fleet-health">
            <span className="health-item">
              <span className="health-dot" style={{ color: '#22c55e' }}>●</span>
              {statusCounts.READY || 0} online
            </span>
            <span className="health-item">
              <span className="health-dot" style={{ color: '#f59e0b' }}>●</span>
              {statusCounts.DEGRADED || 0} degraded
            </span>
            <span className="health-item">
              <span className="health-dot" style={{ color: '#ef4444' }}>●</span>
              {statusCounts.OFFLINE || 0} offline
            </span>
          </div>
        </div>
      </div>

      {robots.length === 0 ? (
        <div className="fleet-empty">
          <div className="fleet-empty-icon">🤖</div>
          <h2 className="fleet-empty-title">No Robots Found</h2>
          <p className="fleet-empty-message">
            No robots are currently configured or available. 
            Make sure your agent is running at <code>http://localhost:9001</code>
          </p>
          <button onClick={refetch} className="btn btn-primary">
            Refresh
          </button>
        </div>
      ) : (
        <div className="fleet-grid">
          {robots.map((robot) => (
            <div key={robot.id} className="robot-card">
              <div className="robot-card-header">
                <div className="robot-card-title">
                  <h3>{robot.name}</h3>
                  <span className="robot-role">{getRoleLabel(robot.id)}</span>
                </div>
                <div
                  className="robot-status"
                  style={{ color: getStatusColor(robot.status) }}
                >
                  <span className="status-dot">●</span>
                  {robot.status}
                </div>
              </div>

              <div className="robot-card-body">
                <div className="robot-info-row">
                  <span className="info-label">BACKEND</span>
                  <span className="info-value">{robot.backend}</span>
                </div>
                {robot.health?.uptime_seconds && (
                  <div className="robot-info-row">
                    <span className="info-label">UPTIME</span>
                    <span className="info-value">{Math.floor(robot.health.uptime_seconds / 60)} min</span>
                  </div>
                )}
                <div className="robot-capabilities">
                  {robot.capabilities.map((cap) => (
                    <span key={cap} className="capability-tag">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="robot-card-actions">
                {robot.id === 'reachy-001' && (
                  <button
                    className={`btn ${hardwareEnabled[robot.id] ? 'btn-success' : 'btn-secondary'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!loadingConfig[robot.id]) {
                        handleToggleHardware(robot.id, robot.url);
                      }
                    }}
                    disabled={!!loadingConfig[robot.id]}
                    style={{ 
                      flex: '0 0 auto', 
                      minWidth: '120px',
                      pointerEvents: loadingConfig[robot.id] ? 'none' : 'auto'
                    }}
                    type="button"
                    aria-label={hardwareEnabled[robot.id] ? 'Disable hardware' : 'Enable hardware'}
                  >
                    {loadingConfig[robot.id] 
                      ? '...' 
                      : (hardwareEnabled[robot.id] !== undefined && hardwareEnabled[robot.id] 
                          ? '✓ Hardware ON' 
                          : 'Hardware OFF')}
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCheckStatus(robot)}
                  type="button"
                  title="Check robot status and health"
                >
                  Status
                </button>
                {robot.id !== 'so101-leader' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRunTask(robot.id)}
                    type="button"
                  >
                    Run Task
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleView(robot.id)}
                  type="button"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRobot && (
        <StatusCheckModal
          robot={selectedRobot}
          isOpen={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false);
            setSelectedRobot(null);
          }}
        />
      )}

    </div>
  );
};

