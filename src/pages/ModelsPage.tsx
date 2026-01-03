import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useProfiles } from '../hooks/useProfiles';
import { useToast } from '../hooks/useToast';
import { probeEndpointHealth, getCachedHealth } from '../utils/endpointProbe';
import type { EndpointHealth } from '../types/endpoint';
import { AIM_CATALOG_MODELS } from '../types/aim';
import './ModelsPage.css';

export const ModelsPage: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { profiles, createProfile, deleteProfile, getProfile } = useProfiles();
  const { showToast } = useToast();
  
  const { selectedModel, customEndpoint, apiKey, temperature, maxTokens, topP } = settings;
  
  const [endpointHealth, setEndpointHealth] = useState<EndpointHealth | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [selectedAimModelId, setSelectedAimModelId] = useState<string | null>(null);
  
  // Profile management
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileName, setProfileName] = useState('');

  // Load cached health on mount or when endpoint changes
  useEffect(() => {
    if (customEndpoint) {
      const cached = getCachedHealth(customEndpoint);
      if (cached) {
        setEndpointHealth(cached);
      }
    }
  }, [customEndpoint]);

  const handleProbeEndpoint = async () => {
    if (!customEndpoint.trim()) return;
    
    setIsProbing(true);
    try {
      const health = await probeEndpointHealth(customEndpoint, apiKey || undefined);
      setEndpointHealth(health);
      if (health.status === 'healthy') {
        showToast('Endpoint is healthy', 'success');
      } else if (health.status === 'degraded') {
        showToast('Endpoint is degraded', 'info');
      } else {
        showToast('Endpoint is offline', 'error');
      }
    } catch (error) {
      showToast('Failed to probe endpoint', 'error');
      setEndpointHealth(null);
    } finally {
      setIsProbing(false);
    }
  };

  const handleModelChange = (newModel: string) => {
    updateSettings({ selectedModel: newModel });
    // Auto-update endpoint based on selection
    if (newModel === 'Ollama (Local)') {
      updateSettings({ customEndpoint: 'http://localhost:11434' });
      setSelectedAimModelId(null);
    } else if (newModel === 'LM Studio (Local)') {
      updateSettings({ customEndpoint: 'http://localhost:1234' });
      setSelectedAimModelId(null);
    } else if (newModel === 'AMD Inference Microservice (AIM)') {
      updateSettings({ customEndpoint: 'https://aim.<cluster-domain>/v1' });
      setSelectedAimModelId(null);
    } else {
      setSelectedAimModelId(null);
    }
  };

  // Profile handlers
  const handleCreateProfile = () => {
    if (!profileName.trim()) {
      showToast('Please enter a profile name', 'error');
      return;
    }
    
    const name = profileName.trim();
    const profileId = createProfile(
      name,
      customEndpoint,
      apiKey || undefined,
      selectedModel,
      temperature,
      maxTokens,
      topP
    );
    
    setProfileName('');
    setShowProfileForm(false);
    setSelectedProfileId(profileId);
    showToast(`Profile "${name}" created`, 'success');
  };

  const handleLoadProfile = (profileId: string) => {
    const profile = getProfile(profileId);
    if (!profile) return;
    
    updateSettings({
      customEndpoint: profile.endpoint,
      apiKey: profile.apiKey,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
      topP: profile.topP
    });
    setSelectedProfileId(profileId);
    showToast(`Profile "${profile.name}" loaded`, 'success');
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = getProfile(profileId);
    if (!profile) return;
    
    if (confirm(`Delete profile "${profile.name}"?`)) {
      deleteProfile(profileId);
      if (selectedProfileId === profileId) {
        setSelectedProfileId(null);
      }
      showToast('Profile deleted', 'success');
    }
  };

  return (
    <div className="models-page">
      <div className="models-header">
        <h1 className="models-title">INFERENCE BACKENDS</h1>
        <p className="models-subtitle">Configure model providers and endpoints</p>
      </div>

      <div className="models-content">
        {/* Model Provider Configuration */}
        <section className="models-section">
          <h2 className="section-title">MODEL PROVIDER</h2>
          
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select
              className="form-select"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="LM Studio (Local)">LM Studio (Local)</option>
              <option value="Ollama (Local)">Ollama (Local)</option>
              <option value="AMD Inference Microservice (AIM)">AMD Inference Microservice (AIM)</option>
              <option value="Custom Endpoint">Custom Endpoint</option>
            </select>
          </div>

          {/* AIM Catalog Selector */}
          {selectedModel === 'AMD Inference Microservice (AIM)' && (
            <div className="form-group">
              <label className="form-label">AIM Model</label>
              <select
                className="form-select"
                value={selectedAimModelId || ''}
                onChange={(e) => {
                  const modelId = e.target.value;
                  setSelectedAimModelId(modelId || null);
                  if (modelId) {
                    const model = AIM_CATALOG_MODELS.find(m => m.id === modelId);
                    if (model) {
                      showToast(`Selected ${model.name}`, 'success');
                    }
                  }
                }}
              >
                <option value="">-- Select an AIM model --</option>
                {AIM_CATALOG_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.organization}) - {model.parameters}
                  </option>
                ))}
              </select>
              {selectedAimModelId && (() => {
                const selectedModel = AIM_CATALOG_MODELS.find(m => m.id === selectedAimModelId);
                return selectedModel ? (
                  <div className="form-help aim-model-info">
                    <div><strong>Model ID:</strong> {selectedModel.modelId}</div>
                    {selectedModel.description && (
                      <div>{selectedModel.description}</div>
                    )}
                    <div>
                      <strong>Version:</strong> {selectedModel.version} • <strong>Status:</strong> {selectedModel.status}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Endpoint URL</label>
            <input
              className="form-input"
              type="text"
              value={customEndpoint}
              onChange={(e) => updateSettings({ customEndpoint: e.target.value })}
              placeholder={
                selectedModel === 'Ollama (Local)' ? 'http://localhost:11434' :
                selectedModel === 'LM Studio (Local)' ? 'http://localhost:1234' :
                selectedModel === 'AMD Inference Microservice (AIM)' ? 'https://aim.<cluster-domain>/v1' :
                'http://localhost:1234'
              }
            />
            <div className="form-help">
              {selectedModel === 'LM Studio (Local)' && 'Default: http://localhost:1234'}
              {selectedModel === 'Ollama (Local)' && 'Default: http://localhost:11434'}
              {selectedModel === 'AMD Inference Microservice (AIM)' && 'Your AIM ingress or gateway URL'}
              {selectedModel === 'Custom Endpoint' && 'Enter your custom endpoint URL'}
            </div>
            
            {/* Endpoint Health Check */}
            {customEndpoint && (
              <div className="endpoint-health">
                <button
                  type="button"
                  className="health-check-button"
                  onClick={handleProbeEndpoint}
                  disabled={isProbing || !customEndpoint.trim()}
                >
                  {isProbing ? 'Checking...' : 'Check Health'}
                </button>
                
                {endpointHealth && (
                  <div className="health-status" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span className={`health-badge ${endpointHealth.status}`}>
                        {endpointHealth.status === 'healthy' ? '✓ Healthy' :
                         endpointHealth.status === 'degraded' ? '⚠ Degraded' :
                         '✗ Offline'}
                      </span>
                      {endpointHealth.responseTime && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {endpointHealth.responseTime}ms
                        </span>
                      )}
                      {endpointHealth.lastChecked && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Checked: {new Date(endpointHealth.lastChecked).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    
                    {endpointHealth.capabilities && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        background: 'var(--bg-tertiary)', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                          Capabilities:
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {endpointHealth.capabilities.streaming && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: 'rgba(59, 130, 246, 0.2)',
                              color: 'rgb(59, 130, 246)'
                            }}>
                              Streaming
                            </span>
                          )}
                          {endpointHealth.capabilities.tools && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: 'rgba(168, 85, 247, 0.2)',
                              color: 'rgb(168, 85, 247)'
                            }}>
                              Tools
                            </span>
                          )}
                          {endpointHealth.capabilities.systemPrompt && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: 'rgba(236, 72, 153, 0.2)',
                              color: 'rgb(236, 72, 153)'
                            }}>
                              System Prompt
                            </span>
                          )}
                          {endpointHealth.capabilities.supportsModelsEndpoint && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: 'rgb(34, 197, 94)'
                            }}>
                              Models API
                            </span>
                          )}
                          {endpointHealth.capabilities.model && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: 'rgba(251, 191, 36, 0.2)',
                              color: 'rgb(251, 191, 36)'
                            }}>
                              Model: {endpointHealth.capabilities.model}
                            </span>
                          )}
                          {endpointHealth.capabilities.maxTokens && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              background: 'rgba(139, 92, 246, 0.2)',
                              color: 'rgb(139, 92, 246)'
                            }}>
                              Max Tokens: {endpointHealth.capabilities.maxTokens}
                            </span>
                          )}
                        </div>
                        {!endpointHealth.capabilities.streaming && 
                         !endpointHealth.capabilities.tools && 
                         !endpointHealth.capabilities.systemPrompt && 
                         !endpointHealth.capabilities.supportsModelsEndpoint && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                            No additional capabilities detected
                          </div>
                        )}
                      </div>
                    )}
                    
                    {endpointHealth.error && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'rgb(239, 68, 68)'
                      }}>
                        <strong>Error:</strong> {endpointHealth.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">API Key (Optional)</label>
            <input
              className="form-input"
              type="password"
              value={apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder="Enter API key if required"
            />
          </div>
        </section>

        {/* Inference Parameters */}
        <section className="models-section">
          <h2 className="section-title">INFERENCE PARAMETERS</h2>
          
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
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
            />
            <div className="form-help">Controls randomness (0.0 = deterministic, 2.0 = very creative)</div>
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
              onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
            />
            <div className="form-help">Maximum response length (100-4096 tokens)</div>
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
              step="0.05"
              value={topP}
              onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
            />
            <div className="form-help">Nucleus sampling parameter (0.0-1.0)</div>
          </div>
        </section>

        {/* Profiles Management */}
        <section className="models-section">
          <h2 className="section-title">PROFILES</h2>
          <p className="section-description">Save and load model configurations</p>
          
          <div className="profiles-list">
            {profiles.length === 0 ? (
              <p className="no-profiles">No profiles yet. Create one to save your current configuration.</p>
            ) : (
              profiles.map(profile => (
                <div key={profile.id} className="profile-card">
                  <div className="profile-header">
                    <h3 className="profile-name">{profile.name}</h3>
                    <div className="profile-actions">
                      <button
                        className="profile-button load"
                        onClick={() => handleLoadProfile(profile.id)}
                      >
                        Load
                      </button>
                      <button
                        className="profile-button delete"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="profile-details">
                    <div><strong>Endpoint:</strong> {profile.endpoint}</div>
                    <div><strong>Temperature:</strong> {profile.temperature} • <strong>Max Tokens:</strong> {profile.maxTokens} • <strong>Top P:</strong> {profile.topP}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!showProfileForm ? (
            <button
              className="create-profile-button"
              onClick={() => setShowProfileForm(true)}
            >
              + Create Profile
            </button>
          ) : (
            <div className="profile-form">
              <input
                className="form-input"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Profile name"
              />
              <div className="profile-form-actions">
                <button
                  className="profile-button save"
                  onClick={handleCreateProfile}
                >
                  Save
                </button>
                <button
                  className="profile-button cancel"
                  onClick={() => {
                    setShowProfileForm(false);
                    setProfileName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
