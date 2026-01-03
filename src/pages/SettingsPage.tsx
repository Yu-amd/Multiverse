import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useLayout } from '../hooks/useLayout';
import { useMetricsSampling, type SamplingInterval } from '../hooks/useMetricsSampling';
import { clearAllSessionData } from '../utils/sessionPersistence';
import { useToast } from '../hooks/useToast';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const { forceROGAlly, setForceROGAlly, isMobile, isTablet, isROGAllyX } = useLayout();
  
  const [showTimestamps, setShowTimestamps] = React.useState(() => {
    const saved = localStorage.getItem('multiverse-show-timestamps');
    return saved ? saved === 'true' : false;
  });

  // Save showTimestamps to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('multiverse-show-timestamps', showTimestamps.toString());
  }, [showTimestamps]);

  // Metrics sampling
  const savedInterval = localStorage.getItem('multiverse-metrics-interval');
  const defaultInterval = savedInterval ? parseFloat(savedInterval) as SamplingInterval : 1;
  const { currentInterval, isBackground, isBatterySaver } = useMetricsSampling({
    defaultInterval,
    enabled: true,
    onIntervalChange: (interval) => {
      localStorage.setItem('multiverse-metrics-interval', interval.toString());
    }
  });

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data from this device? This will remove:\n- Current session\n- Session history\n- All saved conversations\n- Settings\n\nThis cannot be undone.')) {
      clearAllSessionData();
      localStorage.removeItem('multiverse-conversations');
      localStorage.removeItem('multiverse-settings');
      localStorage.removeItem('multiverse-current-conversation');
      showToast('All data cleared. Please refresh the page.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // useTheme hook already handles localStorage and document attribute
    // Theme should apply immediately via useEffect in useTheme
  };
  
  const handleROGAllyToggle = (checked: boolean) => {
    setForceROGAlly(checked);
    // useLayout hook handles localStorage and immediate layout update
    showToast('Layout setting applied', 'success');
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">SETTINGS</h1>
        <p className="settings-subtitle">UI preferences and system configuration</p>
      </div>

      <div className="settings-content">
        {/* Display Settings */}
        <section className="settings-section">
          <h2 className="section-title">DISPLAY SETTINGS</h2>
          
          <div className="form-group">
            <label className="form-label">
              Layout Settings
            </label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              marginBottom: '10px'
            }}>
              <input
                type="checkbox"
                id="rog-ally-toggle"
                checked={forceROGAlly}
                onChange={(e) => handleROGAllyToggle(e.target.checked)}
                aria-label="Force ROG Ally X layout with bigger fonts"
                style={{ transform: 'scale(1.2)' }}
              />
              <label htmlFor="rog-ally-toggle" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>
                🎮 Force ROG Ally X Layout (Bigger Fonts)
              </label>
            </div>
            <div className="form-help">
              Current Layout: {isROGAllyX ? 'ROG Ally X' : isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="show-timestamps"
                checked={showTimestamps}
                onChange={(e) => setShowTimestamps(e.target.checked)}
                aria-label="Show message timestamps"
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span>🕐 Show Message Timestamps</span>
            </label>
            <div className="form-help">
              Display timestamps on all messages
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Theme
            </label>
            <select
              className="form-select"
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
              aria-label="Theme selection"
            >
              <option value="dark">🌙 Dark Mode</option>
              <option value="light">☀️ Light Mode</option>
            </select>
            <div className="form-help">
              Choose your preferred color theme
            </div>
          </div>
        </section>

        {/* System Settings */}
        <section className="settings-section">
          <h2 className="section-title">SYSTEM SETTINGS</h2>
          
          <div className="form-group">
            <label className="form-label">
              Metrics Sampling Interval
            </label>
            <select
              className="form-select"
              value={currentInterval}
              onChange={(e) => {
                const newInterval = parseFloat(e.target.value) as SamplingInterval;
                localStorage.setItem('multiverse-metrics-interval', newInterval.toString());
                window.location.reload(); // Reload to apply new interval
              }}
              aria-label="Metrics sampling interval"
            >
              <option value="0.5">0.5 seconds (High frequency)</option>
              <option value="1">1 second (Default)</option>
              <option value="2">2 seconds (Low frequency)</option>
            </select>
            <div className="form-help">
              Current: {currentInterval}s
              {isBackground && ' (Background mode - using 2s)'}
              {isBatterySaver && ' (Battery saver - using 2s)'}
              {!isBackground && !isBatterySaver && ` (Active - ${currentInterval}s)`}
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="settings-section">
          <h2 className="section-title">DATA MANAGEMENT</h2>
          
          <div className="form-group">
            <label className="form-label">
              Clear All Data
            </label>
            <button
              type="button"
              onClick={handleClearAllData}
              className="danger-button"
              aria-label="Clear all data from this device"
            >
              🗑️ Clear All Data from This Device
            </button>
            <div className="form-help" style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              This will remove all sessions, conversations, and settings. The page will reload after clearing.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

