# AMD Inference Microservice (AIM) Integration Plan

**Date**: 2025-01-XX  
**Status**: Implementation Plan  
**Reference**: [AMD AIM Documentation](https://rocm.blogs.amd.com/artificial-intelligence/enterprise-ai-aims/README.html)

---

## Executive Summary

This plan outlines the integration of AMD Inference Microservice (AIM) as a first-class provider in Multiverse, enabling seamless connection to AIM deployments on AMD Instinct™ GPUs via KServe. The integration follows a phased approach, starting with basic OpenAI-compatible support and progressing to deep observability integration.

---

## Current State Analysis

### Existing Provider System
- **Current Model**: String-based provider selection (`selectedModel: string`)
  - Options: `"LM Studio (Local)"`, `"Ollama (Local)"`, `"Custom Endpoint"`
- **Endpoint Configuration**: 
  - `customEndpoint: string` - Base URL
  - `apiKey: string` - Optional authentication
- **Endpoint Profiles**: Already implemented with `useProfiles` hook
- **Health Probing**: `endpointProbe.ts` with capability detection
- **API Compatibility**: OpenAI-compatible endpoints via `/v1/chat/completions`

### Integration Points
✅ **Already Compatible**: AIM exposes OpenAI-compatible API → Multiverse can connect today  
✅ **Health Checks**: Existing `probeEndpointHealth` can detect AIM capabilities  
✅ **Profiles System**: Can store AIM-specific configurations  
⚠️ **Needs Enhancement**: Provider type system, AIM-specific UI, metrics integration

---

## Implementation Plan

### Phase 1: Basic AIM Support (Quick Win) ⚡

**Goal**: Make AIM work "out of the box" as a provider option

#### 1.1 Extend Provider Type System

**File**: `src/types/endpoint.ts`

```typescript
// Add to existing types
export type ProviderType = 'lmstudio' | 'ollama' | 'custom' | 'aim';

export interface AimConfig {
  baseUrl: string;          // e.g. https://aim.<domain>/v1
  apiKey?: string;          // from AI Workbench / gateway
  defaultModel: string;     // prefilled from profile
  profileName?: string;     // optional: AIM profile (e.g. qwen3-32b-mi300x-latency)
  clusterDomain?: string;    // optional: for display purposes
}

export interface EndpointProfile {
  id: string;
  name: string;
  provider: ProviderType;   // NEW: explicit provider type
  endpoint: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  aimConfig?: AimConfig;    // NEW: AIM-specific config
  health?: EndpointHealth;
  createdAt: number;
  updatedAt: number;
}
```

#### 1.2 Update Settings Interface

**File**: `src/hooks/useSettings.ts`

```typescript
export interface Settings {
  selectedModel: string;     // Keep for backward compatibility
  providerType: ProviderType;  // NEW: explicit provider type
  customEndpoint: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  aimConfig?: AimConfig;    // NEW: optional AIM config
}
```

#### 1.3 Add AIM to Provider Selection

**File**: `src/components/SettingsModal.tsx`

**Changes**:
1. Add `"AIM (KServe)"` option to provider dropdown
2. Auto-populate endpoint when AIM is selected
3. Add AIM-specific help text
4. Show AIM-specific fields (profile name, cluster domain)

```typescript
// In provider select dropdown
<option value="AIM (KServe)">AIM (KServe)</option>

// Auto-populate logic
if (newModel === 'AIM (KServe)') {
  setCustomEndpoint('https://aim.<cluster-domain>/v1');
  // Show AIM-specific help text
}
```

#### 1.4 Create Default AIM Profile Presets

**File**: `src/utils/aimProfiles.ts` (NEW)

```typescript
import type { EndpointProfile, AimConfig } from '../types/endpoint';

export const DEFAULT_AIM_PROFILES: EndpointProfile[] = [
  {
    id: 'aim-qwen3-32b-throughput',
    name: 'AIM - Qwen3-32B (MI300X, Throughput)',
    provider: 'aim',
    endpoint: 'https://aim.<cluster-domain>/v1',
    model: 'qwen3-32b-instruct',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    aimConfig: {
      baseUrl: 'https://aim.<cluster-domain>/v1',
      defaultModel: 'qwen3-32b-instruct',
      profileName: 'qwen3-32b-mi300x-throughput',
      clusterDomain: '<cluster-domain>'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'aim-llama3-8b-latency',
    name: 'AIM - Llama 3.1-8B (MI300X, Low Latency)',
    provider: 'aim',
    endpoint: 'https://aim.<cluster-domain>/v1',
    model: 'llama-3.1-8b-instruct',
    temperature: 0.7,
    maxTokens: 1024,
    topP: 0.9,
    aimConfig: {
      baseUrl: 'https://aim.<cluster-domain>/v1',
      defaultModel: 'llama-3.1-8b-instruct',
      profileName: 'llama-3.1-8b-mi300x-latency',
      clusterDomain: '<cluster-domain>'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export function getAimProfileTemplate(clusterDomain: string): EndpointProfile {
  return {
    id: `aim-${Date.now()}`,
    name: `AIM - ${clusterDomain}`,
    provider: 'aim',
    endpoint: `https://aim.${clusterDomain}/v1`,
    model: 'qwen3-32b-instruct',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    aimConfig: {
      baseUrl: `https://aim.${clusterDomain}/v1`,
      defaultModel: 'qwen3-32b-instruct',
      clusterDomain
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
```

#### 1.5 Update Endpoint Health Probe for AIM

**File**: `src/utils/endpointProbe.ts`

**Enhancements**:
1. Detect AIM-specific capabilities
2. Check for `/health` endpoint (if available)
3. Detect GPU hints from response headers/metadata
4. Show AIM-specific status badges

```typescript
async function detectAimCapabilities(
  endpoint: string,
  apiKey?: string
): Promise<EndpointCapabilities> {
  const capabilities: EndpointCapabilities = {
    streaming: false,
    tools: false,
    systemPrompt: false,
    supportsModelsEndpoint: false
  };

  try {
    // Try /health endpoint (AIM may expose this)
    try {
      const healthResponse = await fetchWithTimeout(
        `${endpoint.replace('/v1', '')}/health`,
        { method: 'GET', headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} },
        PROBE_TIMEOUT
      );
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        // Extract AIM-specific info if available
        if (healthData.gpu) {
          capabilities.model = healthData.model;
        }
      }
    } catch {
      // /health not available, continue with chat endpoint probe
    }

    // Probe chat endpoint for capabilities
    const testResponse = await fetchWithTimeout(
      `${endpoint}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` })
        },
        body: JSON.stringify({
          model: 'test',
          messages: [{ role: 'user', content: 'test' }],
          stream: true,
          max_tokens: 1
        })
      },
      PROBE_TIMEOUT
    );

    if (testResponse.ok) {
      capabilities.streaming = true;
      // Check if response indicates AIM
      const contentType = testResponse.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        capabilities.streaming = true;
      }
    } else if (testResponse.status === 400) {
      // Bad request but endpoint exists - likely supports streaming
      capabilities.streaming = true;
    }
  } catch (error) {
    // Endpoint may not be available, capabilities remain false
  }

  return capabilities;
}
```

#### 1.6 Update UI to Show AIM Status

**File**: `src/components/SettingsModal.tsx`

**Add AIM-specific status display**:
```typescript
{endpointHealth && selectedModel === 'AIM (KServe)' && (
  <div className="aim-status-badge">
    <span className="status-indicator">AIM</span>
    <span className={`health-status ${endpointHealth.status}`}>
      {endpointHealth.status === 'healthy' ? '✅' : 
       endpointHealth.status === 'degraded' ? '⚠️' : '❌'} 
      {endpointHealth.status}
    </span>
    {endpointHealth.capabilities?.streaming && (
      <span className="capability-badge">Streaming ✅</span>
    )}
    {endpointHealth.capabilities?.model && (
      <span className="model-badge">Model: {endpointHealth.capabilities.model}</span>
    )}
  </div>
)}
```

---

### Phase 2: Enhanced AIM UX (Nice Dev Experience) 🎨

**Goal**: Make AIM feel like a first-class provider with AMD-aware features

#### 2.1 AIM-Specific Settings Section

**File**: `src/components/SettingsModal.tsx`

**Add AIM configuration panel**:
```typescript
{selectedModel === 'AIM (KServe)' && (
  <div className="aim-config-section">
    <h3>AMD Inference Microservice (AIM) Configuration</h3>
    
    <div className="form-group">
      <label>Cluster Domain / Ingress URL</label>
      <input
        type="text"
        value={customEndpoint.replace('/v1', '')}
        onChange={(e) => {
          const base = e.target.value.trim();
          setCustomEndpoint(base ? `${base}/v1` : 'https://aim.<cluster-domain>/v1');
        }}
        placeholder="https://aim.your-cluster.com"
      />
      <div className="form-help">
        Your AIM ingress or gateway URL (without /v1)
      </div>
    </div>

    <div className="form-group">
      <label>Model ID / Profile</label>
      <input
        type="text"
        value={selectedModelName || ''}
        onChange={(e) => setSelectedModelName(e.target.value)}
        placeholder="qwen3-32b-instruct"
      />
      <div className="form-help">
        Must match your AIM profile/model configuration
      </div>
    </div>

    <div className="form-group">
      <label>API Key (Optional)</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Provided by AI Workbench / gateway"
      />
      <div className="form-help">
        Required if using AI Workbench / Gateway authentication
      </div>
    </div>

    <div className="aim-info-box">
      <strong>💡 AIM Info:</strong>
      <ul>
        <li>OpenAI-compatible API endpoint</li>
        <li>Automatic GPU detection and optimization</li>
        <li>Supports streaming and standard parameters</li>
        <li>See <a href="https://rocm.blogs.amd.com/artificial-intelligence/enterprise-ai-aims/README.html" target="_blank">AIM Documentation</a> for deployment</li>
      </ul>
    </div>
  </div>
)}
```

#### 2.2 Predefined "AMD Lab" Profiles

**File**: `src/components/SettingsModal.tsx`

**Add "Import AIM Profile" button**:
```typescript
<div className="form-group">
  <label>Quick Start - AIM Profiles</label>
  <div className="aim-profile-selector">
    <select
      onChange={(e) => {
        if (e.target.value) {
          const profile = DEFAULT_AIM_PROFILES.find(p => p.id === e.target.value);
          if (profile) {
            // Apply profile settings
            updateSettings({
              selectedModel: 'AIM (KServe)',
              customEndpoint: profile.endpoint,
              apiKey: profile.apiKey || '',
              temperature: profile.temperature || 0.7,
              maxTokens: profile.maxTokens || 2048,
              topP: profile.topP || 0.9
            });
            setSelectedModelName(profile.model || '');
          }
        }
      }}
    >
      <option value="">Select an AIM profile...</option>
      {DEFAULT_AIM_PROFILES.map(profile => (
        <option key={profile.id} value={profile.id}>
          {profile.name}
        </option>
      ))}
    </select>
  </div>
  <div className="form-help">
    Pre-configured profiles for common AIM deployments
  </div>
</div>
```

#### 2.3 Enhanced Health Check Display

**File**: `src/components/SettingsModal.tsx`

**Show AIM-specific health info**:
```typescript
{endpointHealth && selectedModel === 'AIM (KServe)' && (
  <div className="aim-health-panel">
    <div className="health-header">
      <span className="aim-logo">AMD AIM</span>
      <span className={`health-badge ${endpointHealth.status}`}>
        {endpointHealth.status === 'healthy' ? '✅ Healthy' :
         endpointHealth.status === 'degraded' ? '⚠️ Degraded' :
         '❌ Offline'}
      </span>
    </div>
    
    {endpointHealth.capabilities && (
      <div className="capabilities-list">
        <div className="capability-item">
          <span>Streaming:</span>
          <span>{endpointHealth.capabilities.streaming ? '✅' : '❌'}</span>
        </div>
        {endpointHealth.capabilities.model && (
          <div className="capability-item">
            <span>Model:</span>
            <span>{endpointHealth.capabilities.model}</span>
          </div>
        )}
        {endpointHealth.responseTime && (
          <div className="capability-item">
            <span>Response Time:</span>
            <span>{endpointHealth.responseTime}ms</span>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

---

### Phase 3: Deep Integration - Observability (Advanced) 📊

**Goal**: Integrate with AIM/KServe telemetry and metrics

#### 3.1 Prometheus Metrics Integration

**File**: `src/hooks/useAimMetrics.ts` (NEW)

```typescript
import { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

export interface AimMetrics {
  tokensGenerated: number;
  requestsInFlight: number;
  gpuUtilization: number;
  replicas: number;
  autoscaleEvents: number;
  averageLatency: number;
  tokensPerSecond: number;
}

interface UseAimMetricsOptions {
  prometheusUrl?: string;  // e.g. http://prometheus.<domain>:9090
  enabled: boolean;
  serviceName?: string;    // e.g. aim-qwen3-32b-predictor
  refreshInterval?: number;
}

export const useAimMetrics = (options: UseAimMetricsOptions) => {
  const { prometheusUrl, enabled, serviceName, refreshInterval = 5000 } = options;
  const [metrics, setMetrics] = useState<AimMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !prometheusUrl || !serviceName) {
      return;
    }

    const fetchMetrics = async () => {
      try {
        // Query Prometheus for AIM metrics
        const queries = {
          tokensGenerated: `sum(aim_tokens_generated_total{service="${serviceName}"})`,
          requestsInFlight: `sum(aim_requests_in_flight{service="${serviceName}"})`,
          gpuUtilization: `avg(aim_gpu_utilization{service="${serviceName}"})`,
          replicas: `count(aim_replicas{service="${serviceName}"})`,
          averageLatency: `avg(aim_request_latency_seconds{service="${serviceName}"}) * 1000`
        };

        const results = await Promise.all(
          Object.entries(queries).map(async ([key, query]) => {
            const response = await fetch(
              `${prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`,
              { method: 'GET' }
            );
            const data = await response.json();
            return { key, value: parseFloat(data.data.result[0]?.value[1] || '0') };
          })
        );

        const metricsData: AimMetrics = {
          tokensGenerated: results.find(r => r.key === 'tokensGenerated')?.value || 0,
          requestsInFlight: results.find(r => r.key === 'requestsInFlight')?.value || 0,
          gpuUtilization: results.find(r => r.key === 'gpuUtilization')?.value || 0,
          replicas: results.find(r => r.key === 'replicas')?.value || 0,
          autoscaleEvents: 0, // Would need separate query
          averageLatency: results.find(r => r.key === 'averageLatency')?.value || 0,
          tokensPerSecond: 0 // Calculate from tokensGenerated
        };

        setMetrics(metricsData);
        setError(null);
      } catch (err) {
        logger.error('Failed to fetch AIM metrics:', err);
        setError('Failed to fetch metrics from Prometheus');
      }
    };

    fetchMetrics();
    intervalRef.current = window.setInterval(fetchMetrics, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [prometheusUrl, enabled, serviceName, refreshInterval]);

  return { metrics, error };
};
```

#### 3.2 AIM Metrics Dashboard Component

**File**: `src/components/AimMetricsPanel.tsx` (NEW)

```typescript
import React from 'react';
import { useAimMetrics } from '../hooks/useAimMetrics';

interface AimMetricsPanelProps {
  prometheusUrl?: string;
  serviceName?: string;
  enabled: boolean;
}

export const AimMetricsPanel: React.FC<AimMetricsPanelProps> = ({
  prometheusUrl,
  serviceName,
  enabled
}) => {
  const { metrics, error } = useAimMetrics({
    prometheusUrl,
    serviceName,
    enabled
  });

  if (!enabled || !prometheusUrl || !serviceName) {
    return null;
  }

  if (error) {
    return (
      <div className="aim-metrics-error">
        ⚠️ Metrics unavailable: {error}
      </div>
    );
  }

  if (!metrics) {
    return <div className="aim-metrics-loading">Loading AIM metrics...</div>;
  }

  return (
    <div className="aim-metrics-panel">
      <h4>AMD AIM Cluster Metrics</h4>
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">GPU Utilization</span>
          <span className="metric-value">{metrics.gpuUtilization.toFixed(1)}%</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Active Replicas</span>
          <span className="metric-value">{metrics.replicas}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Requests In Flight</span>
          <span className="metric-value">{metrics.requestsInFlight}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Avg Latency</span>
          <span className="metric-value">{metrics.averageLatency.toFixed(0)}ms</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Tokens Generated</span>
          <span className="metric-value">{metrics.tokensGenerated.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
```

#### 3.3 Integrate AIM Metrics into Dashboard

**File**: `src/components/Dashboard.tsx`

**Add AIM metrics section**:
```typescript
{selectedModel === 'AIM (KServe)' && (
  <AimMetricsPanel
    prometheusUrl={settings.aimPrometheusUrl}
    serviceName={settings.aimServiceName}
    enabled={settings.aimMetricsEnabled}
  />
)}
```

---

### Phase 4: Future Enhancements (Roadmap) 🚀

#### 4.1 Model Discovery via AIM Catalog

**Future**: When AIM Catalog APIs are available
- "Import from AIM" button
- List deployed AIM services
- Auto-create profiles from catalog

#### 4.2 Running Multiverse in EAI Cluster

**Future**: Package Multiverse as K8s workload
- Helm chart for Multiverse
- Cluster-internal AIM endpoint discovery
- Integrated with EAI Resource Manager

#### 4.3 Guardrails Integration

**Future**: Safety and governance hooks
- API key per endpoint/tenant
- Read-only mode toggle
- Guardrail-compatible UI (blocked/redacted indicators)

---

## Implementation Checklist

### Phase 1: Basic AIM Support (Week 1)
- [ ] Extend `ProviderType` to include `'aim'`
- [ ] Add `AimConfig` interface to `endpoint.ts`
- [ ] Update `Settings` interface with `providerType` and `aimConfig`
- [ ] Add "AIM (KServe)" option to provider dropdown
- [ ] Create `aimProfiles.ts` with default profiles
- [ ] Enhance `endpointProbe.ts` with AIM-specific detection
- [ ] Update `SettingsModal.tsx` with AIM status display
- [ ] Test with real AIM deployment
- [ ] Update README with AIM setup instructions

### Phase 2: Enhanced UX (Week 2)
- [ ] Create AIM-specific settings section in `SettingsModal`
- [ ] Add "Import AIM Profile" functionality
- [ ] Enhance health check display for AIM
- [ ] Add AIM info/help tooltips
- [ ] Create AIM-specific status badges
- [ ] Update `ApiInfoModal.tsx` with AIM documentation link

### Phase 3: Observability (Week 3-4)
- [ ] Create `useAimMetrics.ts` hook
- [ ] Create `AimMetricsPanel.tsx` component
- [ ] Integrate AIM metrics into `Dashboard.tsx`
- [ ] Add Prometheus URL configuration
- [ ] Test metrics integration with real Prometheus
- [ ] Add error handling for metrics failures

### Phase 4: Documentation & Polish
- [ ] Update README with AIM integration guide
- [ ] Add AIM deployment examples
- [ ] Create screenshots of AIM integration
- [ ] Document Prometheus setup for metrics
- [ ] Add troubleshooting guide

---

## Testing Strategy

### Unit Tests
- [ ] Test `AimConfig` type validation
- [ ] Test AIM profile creation
- [ ] Test AIM health probe detection
- [ ] Test Prometheus metrics queries

### Integration Tests
- [ ] Test AIM endpoint connection
- [ ] Test AIM profile selection
- [ ] Test AIM metrics fetching
- [ ] Test error handling for offline AIM

### E2E Tests
- [ ] Test AIM provider selection flow
- [ ] Test AIM profile import
- [ ] Test AIM health check display
- [ ] Test AIM metrics panel (if Prometheus available)

---

## File Structure

```
src/
├── types/
│   └── endpoint.ts              # Extended with ProviderType, AimConfig
├── hooks/
│   ├── useSettings.ts           # Updated with providerType, aimConfig
│   └── useAimMetrics.ts         # NEW: Prometheus metrics hook
├── components/
│   ├── SettingsModal.tsx       # Updated with AIM UI
│   ├── Dashboard.tsx            # Updated with AIM metrics
│   └── AimMetricsPanel.tsx      # NEW: AIM metrics display
├── utils/
│   ├── endpointProbe.ts        # Enhanced with AIM detection
│   └── aimProfiles.ts           # NEW: Default AIM profiles
└── App.tsx                      # Updated to handle AIM provider
```

---

## Configuration Example

### AIM Profile JSON
```json
{
  "id": "aim-qwen3-32b",
  "name": "AIM - Qwen3-32B (MI300X)",
  "provider": "aim",
  "endpoint": "https://aim.example.com/v1",
  "apiKey": "optional-key",
  "model": "qwen3-32b-instruct",
  "temperature": 0.7,
  "maxTokens": 2048,
  "topP": 0.9,
  "aimConfig": {
    "baseUrl": "https://aim.example.com/v1",
    "defaultModel": "qwen3-32b-instruct",
    "profileName": "qwen3-32b-mi300x-throughput",
    "clusterDomain": "example.com"
  }
}
```

---

## Success Criteria

### Phase 1 Complete When:
✅ Users can select "AIM (KServe)" as a provider  
✅ AIM endpoint can be configured and tested  
✅ Health check works for AIM endpoints  
✅ Default AIM profiles are available  
✅ Basic AIM status is displayed in UI

### Phase 2 Complete When:
✅ AIM-specific settings section is intuitive  
✅ Users can import predefined AIM profiles  
✅ Enhanced health check shows AIM capabilities  
✅ AIM documentation is accessible from UI

### Phase 3 Complete When:
✅ AIM metrics are displayed in dashboard  
✅ Prometheus integration works (if configured)  
✅ Metrics update in real-time  
✅ Error handling for metrics failures is robust

---

## References

- [AMD AIM Documentation](https://rocm.blogs.amd.com/artificial-intelligence/enterprise-ai-aims/README.html)
- [KServe Documentation](https://kserve.github.io/website/)
- [OpenAI API Compatibility](https://platform.openai.com/docs/api-reference/chat)

---

## Next Steps

1. **Review this plan** with the team
2. **Prioritize phases** based on immediate needs
3. **Set up AIM test environment** for development
4. **Begin Phase 1 implementation** (Basic AIM Support)
5. **Iterate based on feedback** from AIM deployments

---

**Plan Status**: Ready for Implementation  
**Estimated Timeline**: 3-4 weeks for Phases 1-3  
**Dependencies**: Access to AIM deployment for testing

