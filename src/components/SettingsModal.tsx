import React, { useState, useEffect } from 'react';
import { probeEndpointHealth, getCachedHealth } from '../utils/endpointProbe';
import type { EndpointHealth } from '../types/endpoint';
import { logger } from '../utils/logger';
import { clearAllSessionData } from '../utils/sessionPersistence';
import { useProfiles } from '../hooks/useProfiles';
import { useMetricsSampling, type SamplingInterval } from '../hooks/useMetricsSampling';

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
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  updateSettings?: (updates: {
    selectedModel?: string;
    customEndpoint?: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }) => void;
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
  isROGAllyX,
  showToast = () => {}, // Default no-op if not provided
  updateSettings
}) => {
  const [endpointHealth, setEndpointHealth] = useState<EndpointHealth | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  
  // Profile management
  const { profiles, createProfile, updateProfile, deleteProfile, getProfile, addPromptSet, removePromptSet } = useProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  
  // Prompt set management
  const [showPromptSetForm, setShowPromptSetForm] = useState(false);
  const [editingPromptSetId, setEditingPromptSetId] = useState<string | null>(null);
  const [promptSetName, setPromptSetName] = useState('');
  const [promptSetDescription, setPromptSetDescription] = useState('');
  const [promptSetPrompts, setPromptSetPrompts] = useState<string[]>(['']);
  
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

  // Load cached health on mount or when endpoint changes
  useEffect(() => {
    if (showSettings && customEndpoint) {
      const cached = getCachedHealth(customEndpoint);
      if (cached) {
        setEndpointHealth(cached);
      }
    }
  }, [showSettings, customEndpoint]);

  // Probe endpoint when endpoint URL changes
  const handleProbeEndpoint = async () => {
    if (!customEndpoint.trim()) return;
    
    setIsProbing(true);
    try {
      const health = await probeEndpointHealth(customEndpoint, apiKey || undefined);
      setEndpointHealth(health);
    } catch (error) {
      logger.error('Error probing endpoint:', error);
      setEndpointHealth({
        status: 'offline',
        lastChecked: Date.now(),
        error: 'Failed to probe endpoint'
      });
    } finally {
      setIsProbing(false);
    }
  };

  // Auto-probe when endpoint changes (debounced)
  useEffect(() => {
    if (!showSettings || !customEndpoint.trim()) return;
    
    const timer = setTimeout(() => {
      handleProbeEndpoint();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customEndpoint, apiKey]); // Note: handleProbeEndpoint is stable, but we want to re-probe on endpoint/apiKey change

  // Profile handlers
  const handleSelectProfile = (profileId: string) => {
    const profile = getProfile(profileId);
    if (!profile) return;
    
    setSelectedProfileId(profileId);
    if (updateSettings) {
      updateSettings({
        customEndpoint: profile.endpoint,
        apiKey: profile.apiKey,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        topP: profile.topP
      });
    } else {
      setCustomEndpoint(profile.endpoint);
      if (profile.apiKey) setApiKey(profile.apiKey);
      if (profile.temperature !== undefined) setTemperature(profile.temperature);
      if (profile.maxTokens !== undefined) setMaxTokens(profile.maxTokens);
      if (profile.topP !== undefined) setTopP(profile.topP);
    }
    showToast(`Profile "${profile.name}" loaded`, 'success');
  };

  const handleSaveCurrentAsProfile = () => {
    if (!profileName.trim()) {
      showToast('Please enter a profile name', 'error');
      return;
    }
    
    const profileId = createProfile(
      profileName.trim(),
      customEndpoint,
      apiKey || undefined,
      selectedModel,
      temperature,
      maxTokens,
      topP
    );
    
    setSelectedProfileId(profileId);
    setProfileName('');
    setShowProfileForm(false);
    showToast(`Profile "${profileName.trim()}" saved`, 'success');
  };

  const handleUpdateProfile = () => {
    if (!editingProfileId || !profileName.trim()) return;
    
    updateProfile(editingProfileId, {
      name: profileName.trim(),
      endpoint: customEndpoint,
      apiKey: apiKey || undefined,
      model: selectedModel,
      temperature,
      maxTokens,
      topP
    });
    
    setEditingProfileId(null);
    setProfileName('');
    setShowProfileForm(false);
    showToast('Profile updated', 'success');
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

  const handleEditProfile = (profileId: string) => {
    const profile = getProfile(profileId);
    if (!profile) return;
    
    setEditingProfileId(profileId);
    setProfileName(profile.name);
    setShowProfileForm(true);
  };

  // Prompt set handlers
  const handleCreatePromptSet = () => {
    if (!selectedProfileId || !promptSetName.trim()) {
      showToast('Please enter a prompt set name', 'error');
      return;
    }
    
    const validPrompts = promptSetPrompts.filter(p => p.trim());
    if (validPrompts.length === 0) {
      showToast('Please add at least one prompt', 'error');
      return;
    }
    
    const promptSet = {
      id: `promptset-${Date.now()}`,
      name: promptSetName.trim(),
      prompts: validPrompts,
      description: promptSetDescription.trim() || undefined
    };
    
    addPromptSet(selectedProfileId, promptSet);
    setPromptSetName('');
    setPromptSetDescription('');
    setPromptSetPrompts(['']);
    setShowPromptSetForm(false);
    showToast(`Prompt set "${promptSetName.trim()}" created`, 'success');
  };

  const handleEditPromptSet = (promptSetId: string) => {
    const profile = getProfile(selectedProfileId || '');
    if (!profile || !selectedProfileId) return;
    
    const promptSet = profile.promptSets?.find(ps => ps.id === promptSetId);
    if (!promptSet) return;
    
    setEditingPromptSetId(promptSetId);
    setPromptSetName(promptSet.name);
    setPromptSetDescription(promptSet.description || '');
    setPromptSetPrompts(promptSet.prompts.length > 0 ? promptSet.prompts : ['']);
    setShowPromptSetForm(true);
  };

  const handleUpdatePromptSet = () => {
    if (!selectedProfileId || !editingPromptSetId || !promptSetName.trim()) {
      return;
    }
    
    const validPrompts = promptSetPrompts.filter(p => p.trim());
    if (validPrompts.length === 0) {
      showToast('Please add at least one prompt', 'error');
      return;
    }
    
    // Remove old and add updated
    removePromptSet(selectedProfileId, editingPromptSetId);
    const promptSet = {
      id: editingPromptSetId,
      name: promptSetName.trim(),
      prompts: validPrompts,
      description: promptSetDescription.trim() || undefined
    };
    addPromptSet(selectedProfileId, promptSet);
    
    setEditingPromptSetId(null);
    setPromptSetName('');
    setPromptSetDescription('');
    setPromptSetPrompts(['']);
    setShowPromptSetForm(false);
    showToast('Prompt set updated', 'success');
  };

  const handleDeletePromptSet = (promptSetId: string) => {
    if (!selectedProfileId) return;
    
    const profile = getProfile(selectedProfileId);
    const promptSet = profile?.promptSets?.find(ps => ps.id === promptSetId);
    if (!promptSet) return;
    
    if (confirm(`Delete prompt set "${promptSet.name}"?`)) {
      removePromptSet(selectedProfileId, promptSetId);
      showToast('Prompt set deleted', 'success');
    }
  };

  const handleAddPromptField = () => {
    setPromptSetPrompts([...promptSetPrompts, '']);
  };

  const handleRemovePromptField = (index: number) => {
    if (promptSetPrompts.length > 1) {
      setPromptSetPrompts(promptSetPrompts.filter((_, i) => i !== index));
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...promptSetPrompts];
    newPrompts[index] = value;
    setPromptSetPrompts(newPrompts);
  };

  if (!showSettings) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
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
          <h2 id="settings-title" className="modal-title">Model Settings</h2>
          <button 
            className="modal-close"
            onClick={onClose}
            aria-label="Close settings"
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
            aria-label="Model provider selection"
          >
            <option value="LM Studio (Local)">LM Studio (Local)</option>
            <option value="Ollama (Local)">Ollama (Local)</option>
            <option value="Custom Endpoint">Custom Endpoint</option>
          </select>
        </div>

        {/* Endpoint Profiles */}
        <div className="form-group">
          <label className="form-label">
            Endpoint Profiles
          </label>
          <div style={{ marginBottom: '10px' }}>
            {profiles.length > 0 ? (
              <select
                className="form-select"
                value={selectedProfileId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectProfile(e.target.value);
                  } else {
                    setSelectedProfileId(null);
                  }
                }}
                aria-label="Select endpoint profile"
                style={{ marginBottom: '8px' }}
              >
                <option value="">-- No profile selected --</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.endpoint})
                  </option>
                ))}
              </select>
            ) : (
              <div className="form-help" style={{ marginBottom: '8px' }}>
                No profiles saved yet. Save current settings as a profile below.
              </div>
            )}
            
            {profiles.length > 0 && selectedProfileId && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleEditProfile(selectedProfileId)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  aria-label="Edit selected profile"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProfile(selectedProfileId)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--error-color)',
                    cursor: 'pointer'
                  }}
                  aria-label="Delete selected profile"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
          
          {!showProfileForm ? (
            <button
              type="button"
              onClick={() => {
                setShowProfileForm(true);
                setEditingProfileId(null);
                setProfileName('');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                width: '100%'
              }}
              aria-label="Save current settings as profile"
            >
              💾 Save Current Settings as Profile
            </button>
          ) : (
            <div style={{ 
              padding: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px'
            }}>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Profile name"
                className="form-input"
                style={{ marginBottom: '8px' }}
                aria-label="Profile name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editingProfileId) {
                      handleUpdateProfile();
                    } else {
                      handleSaveCurrentAsProfile();
                    }
                  } else if (e.key === 'Escape') {
                    setShowProfileForm(false);
                    setProfileName('');
                    setEditingProfileId(null);
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={editingProfileId ? handleUpdateProfile : handleSaveCurrentAsProfile}
                  disabled={!profileName.trim()}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'var(--accent-color)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: profileName.trim() ? 'pointer' : 'not-allowed',
                    opacity: profileName.trim() ? 1 : 0.6,
                    flex: 1
                  }}
                  aria-label={editingProfileId ? "Update profile" : "Save profile"}
                >
                  {editingProfileId ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileForm(false);
                    setProfileName('');
                    setEditingProfileId(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="form-help">
            Save and quickly switch between endpoint configurations
          </div>
          
          {/* Prompt Sets Management */}
          {selectedProfileId && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: 'var(--bg-secondary)', 
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Prompt Sets
                </label>
                {!showPromptSetForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromptSetForm(true);
                      setEditingPromptSetId(null);
                      setPromptSetName('');
                      setPromptSetDescription('');
                      setPromptSetPrompts(['']);
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: 'var(--accent-color)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    aria-label="Create new prompt set"
                  >
                    + New Prompt Set
                  </button>
                )}
              </div>
              
              {(() => {
                const profile = getProfile(selectedProfileId);
                const promptSets = profile?.promptSets || [];
                
                if (promptSets.length === 0 && !showPromptSetForm) {
                  return (
                    <div className="form-help" style={{ marginBottom: '8px' }}>
                      No prompt sets. Create one to run multiple prompts sequentially.
                    </div>
                  );
                }
                
                return (
                  <>
                    {promptSets.length > 0 && !showPromptSetForm && (
                      <div style={{ marginBottom: '12px' }}>
                        {promptSets.map(promptSet => (
                          <div 
                            key={promptSet.id}
                            style={{
                              padding: '10px',
                              marginBottom: '8px',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                {promptSet.name}
                              </div>
                              {promptSet.description && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                  {promptSet.description}
                                </div>
                              )}
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {promptSet.prompts.length} prompt{promptSet.prompts.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleEditPromptSet(promptSet.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  background: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                                aria-label={`Edit prompt set ${promptSet.name}`}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePromptSet(promptSet.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  background: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  color: 'var(--error-color)',
                                  cursor: 'pointer'
                                }}
                                aria-label={`Delete prompt set ${promptSet.name}`}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showPromptSetForm && (
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}>
                        <input
                          type="text"
                          value={promptSetName}
                          onChange={(e) => setPromptSetName(e.target.value)}
                          placeholder="Prompt set name"
                          className="form-input"
                          style={{ marginBottom: '8px' }}
                          aria-label="Prompt set name"
                        />
                        <input
                          type="text"
                          value={promptSetDescription}
                          onChange={(e) => setPromptSetDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="form-input"
                          style={{ marginBottom: '12px' }}
                          aria-label="Prompt set description"
                        />
                        
                        <label style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                          Prompts:
                        </label>
                        {promptSetPrompts.map((prompt, index) => (
                          <div key={index} style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                            <textarea
                              value={prompt}
                              onChange={(e) => handlePromptChange(index, e.target.value)}
                              placeholder={`Prompt ${index + 1}`}
                              className="form-input"
                              style={{ 
                                flex: 1, 
                                minHeight: '60px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                              }}
                              aria-label={`Prompt ${index + 1}`}
                            />
                            {promptSetPrompts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePromptField(index)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  background: 'var(--error-color)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: 'white',
                                  cursor: 'pointer',
                                  alignSelf: 'flex-start'
                                }}
                                aria-label={`Remove prompt ${index + 1}`}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={handleAddPromptField}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            marginBottom: '12px',
                            width: '100%'
                          }}
                          aria-label="Add another prompt"
                        >
                          + Add Prompt
                        </button>
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={editingPromptSetId ? handleUpdatePromptSet : handleCreatePromptSet}
                            disabled={!promptSetName.trim() || promptSetPrompts.filter(p => p.trim()).length === 0}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: 'var(--accent-color)',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: promptSetName.trim() && promptSetPrompts.filter(p => p.trim()).length > 0 ? 'pointer' : 'not-allowed',
                              opacity: promptSetName.trim() && promptSetPrompts.filter(p => p.trim()).length > 0 ? 1 : 0.6,
                              flex: 1
                            }}
                            aria-label={editingPromptSetId ? "Update prompt set" : "Create prompt set"}
                          >
                            {editingPromptSetId ? 'Update' : 'Create'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPromptSetForm(false);
                              setEditingPromptSetId(null);
                              setPromptSetName('');
                              setPromptSetDescription('');
                              setPromptSetPrompts(['']);
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                            aria-label="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
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
            aria-label="API endpoint URL"
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
          
          {/* Endpoint Health Status */}
          {customEndpoint && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                marginBottom: '8px'
              }}>
                <button
                  type="button"
                  onClick={handleProbeEndpoint}
                  disabled={isProbing || !customEndpoint.trim()}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    cursor: isProbing ? 'wait' : 'pointer',
                    opacity: isProbing ? 0.6 : 1
                  }}
                  aria-label="Check endpoint health"
                >
                  {isProbing ? 'Checking...' : 'Check Health'}
                </button>
                
                {endpointHealth && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 
                        endpointHealth.status === 'healthy' ? 'rgba(34, 197, 94, 0.2)' :
                        endpointHealth.status === 'degraded' ? 'rgba(251, 191, 36, 0.2)' :
                        'rgba(239, 68, 68, 0.2)',
                      color:
                        endpointHealth.status === 'healthy' ? 'rgb(34, 197, 94)' :
                        endpointHealth.status === 'degraded' ? 'rgb(251, 191, 36)' :
                        'rgb(239, 68, 68)'
                    }}>
                      {endpointHealth.status === 'healthy' ? '✓ Healthy' :
                       endpointHealth.status === 'degraded' ? '⚠ Degraded' :
                       '✗ Offline'}
                    </span>
                    
                    {endpointHealth.responseTime && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {endpointHealth.responseTime}ms
                      </span>
                    )}
                    
                    {endpointHealth.capabilities && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {endpointHealth?.error && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'rgb(239, 68, 68)'
                }}>
                  {endpointHealth.error}
                </div>
              )}
            </div>
          )}
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
            aria-label="API key (optional)"
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
            aria-label={`Temperature: ${temperature}`}
            aria-valuemin={0}
            aria-valuemax={2}
            aria-valuenow={temperature}
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
            aria-label={`Max tokens: ${maxTokens}`}
            aria-valuemin={100}
            aria-valuemax={4096}
            aria-valuenow={maxTokens}
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
            aria-label={`Top P: ${topP}`}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={topP}
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
            onChange={(e) => {
              const newTheme = e.target.value as 'light' | 'dark';
              setTheme(newTheme);
              localStorage.setItem('multiverse-theme', newTheme);
              document.documentElement.setAttribute('data-theme', newTheme);
            }}
            aria-label="Theme selection"
          >
            <option value="dark">🌙 Dark Mode</option>
            <option value="light">☀️ Light Mode</option>
          </select>
          <div className="form-help">
            Choose your preferred color theme
          </div>
        </div>

        {/* Metrics Sampling */}
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

        <div className="form-group">
          <label className="form-label">
            Data Management
          </label>
          <button
            type="button"
            onClick={() => {
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
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid var(--error-color)',
              background: 'transparent',
              color: 'var(--error-color)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              width: '100%'
            }}
            aria-label="Clear all data from this device"
          >
            🗑️ Clear All Data from This Device
          </button>
          <div className="form-help" style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            This will remove all sessions, conversations, and settings. The page will reload after clearing.
          </div>
        </div>
      </div>
    </div>
  );
};

