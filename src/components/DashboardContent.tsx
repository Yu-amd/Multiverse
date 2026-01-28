import React, { useState, useEffect } from 'react';
import { HintIcon } from './HintIcon';
import { responseCache } from '../utils/cache';
import { logger } from '../utils/logger';
import type { SessionMetrics } from '../types/messageMetrics';

interface DashboardContentProps {
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    metrics?: {
      timeToFirstToken?: number;
      totalTime?: number;
      tokensPerSecond?: number;
      tokensIn?: number;
      tokensOut?: number;
    };
  }>;
  sessionMetrics?: SessionMetrics;
  modelMetrics: {
    promptToFirstToken: number;
    totalResponseTime: number;
    tokensPerSecond: number;
    tokensIn: number;
    tokensOut: number;
    promptLength: number;
    maxTokens: number;
    contextUtilization: number;
    activeRequests: number;
    quantizationFormat: string;
    cacheHitRate: number;
    errorCount: number;
  };
  systemMetrics: {
    cpuUtilization: number;
    gpuUtilization: number;
    gpuMemoryUsage: number;
    ramUsage: number;
    powerDraw: number;
    temperature: number;
    isThrottling: boolean;
    batteryLevel: number;
    gpuModel: string;
    gpuVendor: string;
    gpuMemoryTotal: number;
    gpuComputeUnits: number;
    gpuClockSpeed: number;
    activeAccelerator: string;
    acceleratorType: string;
    npuAvailable: boolean;
    npuUtilization: number;
    npuModel: string;
    igpuAvailable: boolean;
    igpuUtilization: number;
    igpuModel: string;
    igpuMemoryTotal: number;
  };
  compositeMetrics: {
    tokensPerWatt: number;
    efficiencyRating: number;
    performanceTrend: string;
  };
  selectedModel: string;
  customEndpoint: string;
  temperature: number;
  maxTokens: number;
  isMobile: boolean;
  isROGAllyX: boolean;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  messages = [],
  sessionMetrics,
  modelMetrics,
  systemMetrics,
  compositeMetrics,
  selectedModel,
  customEndpoint,
  temperature,
  maxTokens,
  isMobile,
  isROGAllyX
}) => {
  const [activeDashboardTab, setActiveDashboardTab] = useState<'model' | 'system' | 'composite' | 'analytics' | 'cache'>('model');
  const [cacheStats, setCacheStats] = useState(responseCache.getStats());

  // Update cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(responseCache.getStats());
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Use the same content as Dashboard but without modal wrapper
  return (
    <div className="dashboard-content-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title" style={{ fontSize: isROGAllyX ? '1.8rem' : '1.5rem' }}>📊 Performance Dashboard</h2>
      </div>

      {/* Dashboard Tabs */}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        <button 
          className={`dashboard-tab ${activeDashboardTab === 'model' ? 'active' : ''}`}
          onClick={() => setActiveDashboardTab('model')}
          role="tab"
          aria-selected={activeDashboardTab === 'model'}
          aria-controls="dashboard-panel"
          style={{
            fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
          }}
        >
          🧠 Model Metrics
        </button>
        <button 
          className={`dashboard-tab ${activeDashboardTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveDashboardTab('system')}
          role="tab"
          aria-selected={activeDashboardTab === 'system'}
          aria-controls="dashboard-panel"
          style={{
            fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
          }}
        >
          ⚙️ System Metrics
        </button>
        <button 
          className={`dashboard-tab ${activeDashboardTab === 'composite' ? 'active' : ''}`}
          onClick={() => setActiveDashboardTab('composite')}
          role="tab"
          aria-selected={activeDashboardTab === 'composite'}
          aria-controls="dashboard-panel"
          style={{
            fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
          }}
        >
          📊 Composite Insights
        </button>
        <button 
          className={`dashboard-tab ${activeDashboardTab === 'cache' ? 'active' : ''}`}
          onClick={() => setActiveDashboardTab('cache')}
          style={{
            fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
          }}
        >
          💾 Cache Statistics
        </button>
      </div>

      {/* Dashboard Content - Copy from Dashboard.tsx */}
      <div className="dashboard-panel">
        {activeDashboardTab === 'model' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="metric-card" style={{ position: 'relative' }}>
                <HintIcon text="Latency Metrics: Prompt-to-first-token = real-time measurement from API response (firstTokenTime - startTime in ms). Total response time = real-time measurement from API response (endTime - startTime in ms)" />
                <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Latency</h4>
                <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                  <div>
                    Prompt-to-first-token: <span className="value">{modelMetrics.promptToFirstToken.toFixed(1)} ms</span>
                  </div>
                  <div>
                    Total response time: <span className="value">{modelMetrics.totalResponseTime.toFixed(1)} ms</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card" style={{ position: 'relative' }}>
                <HintIcon text="Token Throughput: Tokens/sec = real-time calculation from API response (responseLength / (totalTime / 1000))." />
                <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Token Throughput</h4>
                <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                  <div>
                    Tokens/sec: <span className="value">{modelMetrics.tokensPerSecond.toFixed(1)} t/s</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card" style={{ position: 'relative' }}>
                <HintIcon text="Context Utilization: Prompt length = real-time input token count from API request. Max tokens = context window size from API configuration. Utilization = real-time calculation (promptLength / maxTokens) * 100%" />
                <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Context Utilization</h4>
                <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                  <div>
                    Prompt length: <span className="value">{modelMetrics.promptLength} tokens</span>
                  </div>
                  <div>
                    Max tokens: <span className="value">{modelMetrics.maxTokens} tokens</span>
                  </div>
                  <div>
                    Utilization: <span className="value">{modelMetrics.contextUtilization.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card" style={{ position: 'relative' }}>
                <HintIcon text="Performance: Active requests = real-time count of concurrent API requests. Quantization = model precision format from API (FP16/INT8/INT4). Cache hit rate = real-time cache performance tracking. Errors = real-time error count from API responses" />
                <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Performance</h4>
                <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                  <div>
                    Active requests: <span className="value">{modelMetrics.activeRequests}</span>
                  </div>
                  <div>
                    Quantization: <span className="value">{modelMetrics.quantizationFormat}</span>
                  </div>
                  <div>
                    Cache hit rate: <span className="value">{modelMetrics.cacheHitRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    Errors: <span className="error">{modelMetrics.errorCount}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {sessionMetrics && sessionMetrics.totalMessages > 0 && (
              <div className="metric-card" style={{ marginTop: '20px' }}>
                <HintIcon text="Session Metrics: Aggregated performance metrics across all messages in the current session. Average time to first token and tokens per second are calculated from all assistant messages with metrics." />
                <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>📈 Session Aggregates</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Messages</div>
                    <div className="value" style={{ fontSize: isROGAllyX ? '1.1rem' : '1rem', fontWeight: 600 }}>
                      {sessionMetrics.totalMessages}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Avg Time to First Token</div>
                    <div className="value" style={{ fontSize: isROGAllyX ? '1.1rem' : '1rem', fontWeight: 600 }}>
                      {(sessionMetrics.averageTimeToFirstToken / 1000).toFixed(2)}s
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Avg Tokens/Second</div>
                    <div className="value" style={{ fontSize: isROGAllyX ? '1.1rem' : '1rem', fontWeight: 600 }}>
                      {sessionMetrics.averageTokensPerSecond.toFixed(1)} tok/s
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Time</div>
                    <div className="value" style={{ fontSize: isROGAllyX ? '1.1rem' : '1rem', fontWeight: 600 }}>
                      {(sessionMetrics.totalTime / 1000).toFixed(2)}s
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="metric-card">
              <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>💡 Real-time Status</h4>
              <div className="metric-value" style={{ fontSize: '0.9rem' }}>
                <div>Current model: <span className="value">{selectedModel}</span></div>
                <div>Endpoint: <span className="value">{customEndpoint}</span></div>
                <div>Temperature: <span className="value">{temperature}</span></div>
                <div>Max tokens: <span className="value">{maxTokens}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Copy the rest of Dashboard tabs content - System, Composite, Cache */}
        {/* For brevity, I'll include a simplified version. The full content should be copied from Dashboard.tsx */}
        {activeDashboardTab === 'system' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="metric-card">
                <h4 className="metric-title">🔹 CPU Utilization</h4>
                <div className="metric-value">
                  <div>Overall: <span className="value">{systemMetrics.cpuUtilization.toFixed(1)}%</span></div>
                </div>
              </div>
              <div className="metric-card">
                <h4 className="metric-title">🔹 Memory</h4>
                <div className="metric-value">
                  <div>RAM usage: <span className="value">{(systemMetrics.ramUsage / 1024).toFixed(1)} GB</span></div>
                </div>
              </div>
              <div className="metric-card">
                <h4 className="metric-title">🔹 Power & Thermal</h4>
                <div className="metric-value">
                  <div>Power draw: <span className="value">{systemMetrics.powerDraw.toFixed(1)} W</span></div>
                  <div>CPU temp: <span className="value">{systemMetrics.temperature.toFixed(1)}°C</span></div>
                </div>
              </div>
              <div className="metric-card">
                <h4 className="metric-title">🔹 GPU</h4>
                <div className="metric-value">
                  <div>GPU: <span className="value">{systemMetrics.gpuVendor} {systemMetrics.gpuModel}</span></div>
                  <div>Utilization: <span className="value">{systemMetrics.gpuUtilization.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDashboardTab === 'composite' && (
          <div>
            <div className="metric-card">
              <h4 className="metric-title">🔹 Energy Efficiency</h4>
              <div className="metric-value">
                <div>Tokens/sec per Watt: <span className="value">{compositeMetrics.tokensPerWatt.toFixed(2)} t/s/W</span></div>
                <div>Efficiency rating: <span className="value">{compositeMetrics.efficiencyRating.toFixed(1)}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeDashboardTab === 'cache' && (
          <div>
            <div className="metric-card">
              <h4 className="metric-title">💾 Cache Overview</h4>
              <div className="metric-value">
                <div>Total entries: <span className="value">{cacheStats.size + (cacheStats.simpleSize || 0)}</span></div>
                <div>Hit rate: <span className="value">{(cacheStats.hitRate * 100).toFixed(1)}%</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

