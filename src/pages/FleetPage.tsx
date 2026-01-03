import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../hooks/useFleet';
import { fleetApi } from '../services/fleetApi';
import { useToast } from '../hooks/useToast';
import type { Robot } from '../services/fleetApi';
import './FleetPage.css';

export const FleetPage: React.FC = () => {
  const navigate = useNavigate();
  const { robots, loading, error, refetch } = useFleet();
  const { showToast } = useToast();
  const [hardwareEnabled, setHardwareEnabled] = useState<Record<string, boolean>>({});
  const [loadingConfig, setLoadingConfig] = useState<Record<string, boolean>>({});

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

  return (
    <div className="fleet-page">
      <div className="fleet-header">
        <h1 className="fleet-title">Fleet</h1>
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
                  <span className="robot-type">{robot.type}</span>
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
                  className="btn btn-primary"
                  onClick={() => handleRunTask(robot.id)}
                  type="button"
                >
                  Run Task
                </button>
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
    </div>
  );
};

