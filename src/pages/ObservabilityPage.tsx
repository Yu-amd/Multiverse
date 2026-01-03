import React, { useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import { useSettings } from '../hooks/useSettings';
import { useConversation } from '../hooks/useConversation';
import { useLayout } from '../hooks/useLayout';
import { useBackendMetrics } from '../hooks/useBackendMetrics';
import { logger } from '../utils/logger';
import './ObservabilityPage.css';

export const ObservabilityPage: React.FC = () => {
  const { settings } = useSettings();
  const { selectedModel, customEndpoint, apiKey, temperature, maxTokens } = settings;
  
  const { messages } = useConversation();
  const { isMobile, isTablet, isROGAllyX } = useLayout();
  
  const backendMetricsUrl = 'http://localhost:8000';
  const { 
    metrics: backendMetrics, 
    connected: backendConnected
  } = useBackendMetrics({
    backendUrl: backendMetricsUrl,
    enabled: false, // Disable backend metrics for now (backend may not be running)
    onError: () => {
      // Silently handle errors - backend metrics are optional
    }
  });
  
  // Initialize metrics state (same as AppWithChat)
  const [modelMetrics, setModelMetrics] = useState({
    promptToFirstToken: 0,
    totalResponseTime: 0,
    tokensPerSecond: 0,
    tokensIn: 0,
    tokensOut: 0,
    promptLength: 0,
    maxTokens: 0,
    contextUtilization: 0,
    activeRequests: 0,
    quantizationFormat: 'Unknown',
    cacheHitRate: 0,
    errorCount: 0
  });
  
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUtilization: 0,
    gpuUtilization: 0,
    gpuMemoryUsage: 0,
    ramUsage: 0,
    powerDraw: 0,
    temperature: 0,
    isThrottling: false,
    batteryLevel: 100,
    gpuModel: 'Unknown',
    gpuVendor: 'Unknown',
    gpuMemoryTotal: 0,
    gpuMemoryBandwidth: 0,
    gpuComputeUnits: 0,
    gpuClockSpeed: 0,
    activeAccelerator: 'Unknown',
    acceleratorType: 'Unknown',
    npuAvailable: false,
    npuUtilization: 0,
    npuModel: 'Unknown',
    igpuAvailable: false,
    igpuUtilization: 0,
    igpuModel: 'Unknown',
    igpuMemoryTotal: 0
  });
  
  const [compositeMetrics, setCompositeMetrics] = useState({
    tokensPerWatt: 0,
    efficiencyRating: 0,
    performanceTrend: 'Stable'
  });

  // Calculate session metrics
  const assistantMessages = messages.filter(m => m.role === 'assistant' && m.metrics);
  const sessionMetrics = assistantMessages.length > 0 ? {
    totalMessages: assistantMessages.length,
    totalTokens: assistantMessages.reduce((sum, m) => sum + (m.metrics?.tokensIn || 0) + (m.metrics?.tokensOut || 0), 0),
    averageLatency: assistantMessages.reduce((sum, m) => sum + (m.metrics?.totalTime || 0), 0) / assistantMessages.length,
    errorRate: 0,
    averageTimeToFirstToken: assistantMessages.reduce((sum, m) => sum + (m.metrics?.timeToFirstToken || 0), 0) / assistantMessages.length,
    averageTokensPerSecond: assistantMessages.reduce((sum, m) => sum + (m.metrics?.tokensPerSecond || 0), 0) / assistantMessages.length,
    totalTokensIn: assistantMessages.reduce((sum, m) => sum + (m.metrics?.tokensIn || 0), 0),
    totalTokensOut: assistantMessages.reduce((sum, m) => sum + (m.metrics?.tokensOut || 0), 0),
    totalTime: assistantMessages.reduce((sum, m) => sum + (m.metrics?.totalTime || 0), 0)
  } : undefined;

  // Render Dashboard as page (not modal)
  return (
    <div className="observability-page">
      <div className="observability-header">
        <h1 className="observability-title">OBSERVABILITY</h1>
        <p className="observability-subtitle">Performance metrics and system insights</p>
      </div>
      <div className="observability-content">
        <Dashboard
          showDashboard={true}
          onClose={() => {}} // No-op since it's not a modal
          asPage={true} // Render as page instead of modal
          messages={messages}
          sessionMetrics={sessionMetrics}
          modelMetrics={modelMetrics}
          systemMetrics={systemMetrics}
          compositeMetrics={compositeMetrics}
          selectedModel={selectedModel}
          customEndpoint={customEndpoint}
          temperature={temperature}
          maxTokens={maxTokens}
          isMobile={isMobile}
          isROGAllyX={isROGAllyX}
        />
      </div>
    </div>
  );
};

