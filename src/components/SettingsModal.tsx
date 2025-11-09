import React from 'react';

interface SettingsModalProps {
  showSettings: boolean;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  customEndpoint: string;
  setCustomEndpoint: (endpoint: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  topP: number;
  setTopP: (topP: number) => void;
  showTimestamps: boolean;
  setShowTimestamps: (show: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isMobile: boolean;
  isTablet: boolean;
  isROGAllyX: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  showSettings,
  onClose,
  selectedModel,
  setSelectedModel,
  customEndpoint,
  setCustomEndpoint,
  apiKey,
  setApiKey,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  topP,
  setTopP,
  showTimestamps,
  setShowTimestamps,
  theme,
  setTheme,
  isMobile,
  isTablet,
  isROGAllyX
}) => {
  if (!showSettings) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          padding: isMobile ? '15px' : '20px',
          maxWidth: isMobile ? '95%' : '500px',
          width: '90%',
          maxHeight: isMobile ? '90vh' : '80vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 className="modal-title">Model Settings</h2>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">
            Model Provider
          </label>
          <select
            className="form-select"
            value={selectedModel}
            onChange={(e) => {
              const newModel = e.target.value;
              setSelectedModel(newModel);
              // Auto-update endpoint based on selection
              if (newModel === 'Ollama (Local)') {
                setCustomEndpoint('http://localhost:11434');
              } else if (newModel === 'LM Studio (Local)') {
                setCustomEndpoint('http://localhost:1234');
              }
            }}
          >
            <option value="LM Studio (Local)">LM Studio (Local)</option>
            <option value="Ollama (Local)">Ollama (Local)</option>
            <option value="Custom Endpoint">Custom Endpoint</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            Endpoint URL
          </label>
          <input
            className="form-input"
            type="text"
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
            placeholder={
              selectedModel === 'Ollama (Local)' ? 'http://localhost:11434' :
              selectedModel === 'LM Studio (Local)' ? 'http://localhost:1234' :
              'http://localhost:1234'
            }
          />
          <div className="form-help">
            {selectedModel === 'LM Studio (Local)' && 'Default: http://localhost:1234 (or your LM Studio URL/IP)'}
            {selectedModel === 'Ollama (Local)' && 'Default: http://localhost:11434 (or your Ollama URL/IP)'}
            {selectedModel === 'Custom Endpoint' && 'Enter your custom endpoint URL'}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            API Key (Optional)
          </label>
          <input
            className="form-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key if required"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Temperature: {temperature}
          </label>
          <input
            className="form-range"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Max Tokens: {maxTokens}
          </label>
          <input
            className="form-range"
            type="range"
            min="100"
            max="4096"
            step="100"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Top P: {topP}
          </label>
          <input
            className="form-range"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
          />
        </div>

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
              checked={localStorage.getItem('force-rog-ally') === 'true'}
              onChange={(e) => {
                localStorage.setItem('force-rog-ally', e.target.checked.toString());
                window.location.reload();
              }}
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
            onChange={(e) => {
              const newTheme = e.target.value as 'light' | 'dark';
              setTheme(newTheme);
              localStorage.setItem('multiverse-theme', newTheme);
              document.documentElement.setAttribute('data-theme', newTheme);
            }}
          >
            <option value="dark">🌙 Dark Mode</option>
            <option value="light">☀️ Light Mode</option>
          </select>
          <div className="form-help">
            Choose your preferred color theme
          </div>
        </div>
      </div>
    </div>
  );
};

