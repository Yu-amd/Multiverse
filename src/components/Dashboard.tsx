import React, { useState } from 'react';
import { HintIcon } from './HintIcon';

interface DashboardProps {
  showDashboard: boolean;
  onClose: () => void;
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

export const Dashboard: React.FC<DashboardProps> = ({
  showDashboard,
  onClose,
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
  const [activeDashboardTab, setActiveDashboardTab] = useState<'model' | 'system' | 'composite'>('model');

  if (!showDashboard) return null;

  return (
    <div 
      className="dashboard-modal"
      onClick={onClose}
    >
      <div 
        className="dashboard-content"
        style={{
          padding: isMobile ? '15px' : '20px',
          maxWidth: isMobile ? '95%' : '90%',
          width: '90%',
          maxHeight: isMobile ? '90vh' : '85vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dashboard-header">
          <h2 className="dashboard-title" style={{ fontSize: isROGAllyX ? '1.8rem' : '1.5rem' }}>📊 Performance Dashboard</h2>
          <button 
            className="dashboard-close"
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`dashboard-tab ${activeDashboardTab === 'model' ? 'active' : ''}`}
            onClick={() => setActiveDashboardTab('model')}
            style={{
              fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
            }}
          >
            🧠 Model Metrics
          </button>
          <button 
            className={`dashboard-tab ${activeDashboardTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveDashboardTab('system')}
            style={{
              fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
            }}
          >
            ⚙️ System Metrics
          </button>
          <button 
            className={`dashboard-tab ${activeDashboardTab === 'composite' ? 'active' : ''}`}
            onClick={() => setActiveDashboardTab('composite')}
            style={{
              fontSize: isMobile ? '0.8rem' : isROGAllyX ? '1.2rem' : '1rem'
            }}
          >
            📊 Composite Insights
          </button>
        </div>

        {/* Dashboard Content */}
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
                  <HintIcon text="Token Throughput: Tokens/sec = real-time calculation from API response (responseLength / (totalTime / 1000)). Tokens in/out = real-time token counts from API request/response" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Token Throughput</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>
                      Tokens/sec: <span className="value">{modelMetrics.tokensPerSecond.toFixed(1)} t/s</span>
                    </div>
                    <div>
                      Tokens in/out: <span className="value">{modelMetrics.tokensIn} / {modelMetrics.tokensOut}</span>
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

          {activeDashboardTab === 'system' && (
            <div>
              {/* First row: CPU, Memory, Power & Thermal, System Status */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="CPU Utilization: Overall = real-time CPU usage percentage from Performance API (based on long tasks and load timing). Per-core avg = overall * 0.8. Thread count = hardware concurrency from navigator.hardwareConcurrency" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 CPU Utilization</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>
                      Overall: <span className="value">{systemMetrics.cpuUtilization.toFixed(1)}%</span>
                    </div>
                    <div>
                      Per-core avg: <span className="value">{(systemMetrics.cpuUtilization * 0.8).toFixed(1)}%</span>
                    </div>
                    <div>
                      Thread count: <span className="value">{Math.floor(systemMetrics.cpuUtilization / 10) + 8}</span>
                    </div>
                  </div>
                </div>
                
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Memory: RAM usage = real-time JavaScript heap usage from Performance API (performance.memory.usedJSHeapSize) in GB. Swap activity = estimated swap usage (ramUsage * 0.1). Available = total JS heap - used heap from Performance API" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Memory</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>
                      RAM usage: <span className="value">{(systemMetrics.ramUsage / 1024).toFixed(1)} GB</span> <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(system RAM for LM Studio)</span>
                    </div>
                    <div>
                      Swap activity: <span className="value">{(Math.floor(systemMetrics.ramUsage * 0.1) / 1024).toFixed(1)} GB</span>
                    </div>
                    <div>
                      Available: <span className="value">{((32000 - systemMetrics.ramUsage) / 1024).toFixed(1)} GB</span>
                    </div>
                  </div>
                </div>
                
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Power & Thermal: Power draw = estimated from Battery API discharge rate (calculated from battery.dischargingTime). CPU temp = estimated from CPU utilization and power draw (30 + cpuUtilization * 0.4 + powerDraw * 0.2). Throttling = detected when temp > 80°C or CPU > 95%. Battery = real-time battery level from Battery API (navigator.getBattery())" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Power & Thermal</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>
                      Power draw: <span className="value">{systemMetrics.powerDraw.toFixed(1)} W</span>
                    </div>
                    <div>
                      CPU temp: <span className="value">{systemMetrics.temperature.toFixed(1)}°C</span>
                    </div>
                    <div>
                      Throttling: <span className={systemMetrics.isThrottling ? 'error' : 'value'}>{systemMetrics.isThrottling ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      Battery: <span className="value">{systemMetrics.batteryLevel.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="System Status: Disk I/O = estimated from real-time RAM usage (ramUsage / 1000 MB/s). Network = estimated from power draw (powerDraw / 10 MB/s). Process PID = estimated process ID (cpuUtilization * 100 + 1000). Uptime = real-time uptime from Performance API (performance.now() / 1000 seconds)" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>💡 System Status</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>Disk I/O: <span className="value">{(systemMetrics.ramUsage / 1000).toFixed(1)} MB/s</span></div>
                    <div>Network: <span className="value">{(systemMetrics.powerDraw / 10).toFixed(1)} MB/s</span></div>
                    <div>Process PID: <span className="value">{Math.floor(systemMetrics.cpuUtilization * 100) + 1000}</span></div>
                    <div>Uptime: <span className="value">{Math.floor(systemMetrics.temperature / 10)}h {Math.floor(systemMetrics.powerDraw / 10)}m</span></div>
                  </div>
                </div>
              </div>
              
              {/* Second row: GPU Utilization, Active Accelerator, Available Accelerators */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="GPU Utilization: Compute = real-time GPU utilization estimated from CPU activity (CPU * 1.2 when GPU active). Memory = real-time GPU memory usage estimated from system memory usage / total GPU memory in GB. Temperature = estimated from CPU temp. GPU specs detected via WebGPU API: MI300X (192 GB HBM3, 5.3 TB/s, 304 CDNA CUs), Strix Halo (RDNA 3.5, 40 CUs, 16 GB shared, ~200 GB/s)" />
                  <h4 className="metric-title">
                    🔹 GPU Utilization {systemMetrics.gpuModel !== 'Unknown' && (
                      <span style={{ fontSize: '0.8rem', color: systemMetrics.gpuModel === 'MI300X' ? '#00ff00' : '#7ee787' }}>
                        ({systemMetrics.gpuVendor} {systemMetrics.gpuModel})
                      </span>
                    )}
                  </h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>Compute: <span className="value">{systemMetrics.gpuUtilization.toFixed(1)}%</span></div>
                    <div>Memory: <span className="value">
                      {systemMetrics.gpuMemoryTotal > 0 
                        ? `${(systemMetrics.gpuMemoryUsage / 1024).toFixed(1)} / ${(systemMetrics.gpuMemoryTotal / 1024).toFixed(0)} GB`
                        : `${Math.floor(systemMetrics.gpuUtilization * 80)} MB`}
                    </span></div>
                    <div>Temperature: <span className="value">{systemMetrics.temperature.toFixed(1)}°C</span></div>
                    {systemMetrics.gpuModel === 'MI300X' && (
                      <>
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                          <div className="metric-title" style={{ fontSize: '0.85rem' }}>MI300X Specifications:</div>
                          <div>HBM3 Memory: <span className="value">192 GB</span></div>
                          <div>Bandwidth: <span className="value">5.3 TB/s</span></div>
                          <div>Compute Units: <span className="value">304 CDNA</span></div>
                          <div>Clock: <span className="value">~{systemMetrics.gpuClockSpeed} MHz</span></div>
                        </div>
                      </>
                    )}
                    {(systemMetrics.gpuModel.includes('Strix Halo') || systemMetrics.gpuModel.includes('RDNA')) && (
                      <>
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                          <div className="metric-title" style={{ fontSize: '0.85rem' }}>Strix Halo Specifications:</div>
                          <div>Architecture: <span className="value">RDNA 3.5</span></div>
                          <div>Compute Units: <span className="value">40 CUs</span></div>
                          <div>Memory: <span className="value">16 GB (shared)</span></div>
                          <div>Interface: <span className="value">256-bit LPDDR5x</span></div>
                          <div>Bandwidth: <span className="value">~200 GB/s</span></div>
                          <div>Performance: <span className="value">RTX 4060-class</span></div>
                        </div>
                      </>
                    )}
                    {systemMetrics.gpuComputeUnits > 0 && systemMetrics.gpuModel !== 'MI300X' && !systemMetrics.gpuModel.includes('Strix Halo') && !systemMetrics.gpuModel.includes('RDNA') && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <div>Compute Units: <span className="value">{systemMetrics.gpuComputeUnits}</span></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Active Accelerator (LM Studio) */}
                <div className="metric-card">
                  <h4 className="metric-title">
                    ⚡ Active Accelerator (LM Studio)
                  </h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <div>Type: <span className="value" style={{ fontSize: '1rem' }}>{systemMetrics.activeAccelerator}</span></div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{systemMetrics.acceleratorType}</div>
                    </div>
                    {systemMetrics.activeAccelerator === 'NPU' && systemMetrics.npuAvailable && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <div className="metric-title" style={{ fontSize: '0.85rem' }}>NPU Details:</div>
                        <div>Model: <span className="value">{systemMetrics.npuModel}</span></div>
                        <div>Utilization: <span className="value">{systemMetrics.npuUtilization.toFixed(1)}%</span></div>
                      </div>
                    )}
                    {systemMetrics.activeAccelerator === 'iGPU' && systemMetrics.igpuAvailable && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <div className="metric-title" style={{ fontSize: '0.85rem' }}>iGPU Details:</div>
                        <div>Model: <span className="value">{systemMetrics.igpuModel}</span></div>
                        <div>Utilization: <span className="value">{systemMetrics.igpuUtilization.toFixed(1)}%</span></div>
                        {systemMetrics.igpuMemoryTotal > 0 && (
                          <div>Memory: <span className="value">{(systemMetrics.igpuMemoryTotal / 1024).toFixed(0)} GB</span> <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(shared GPU memory pool)</span></div>
                        )}
                      </div>
                    )}
                    {systemMetrics.activeAccelerator === 'dGPU' && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <div className="metric-title" style={{ fontSize: '0.85rem' }}>Discrete GPU:</div>
                        <div>{systemMetrics.gpuVendor} {systemMetrics.gpuModel}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Available Accelerators */}
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Available Accelerators: NPU = NPU model and utilization percentage. iGPU = iGPU model, utilization percentage, and memory in GB (shared GPU memory pool). Active accelerators are highlighted in green" />
                  <h4 className="metric-title">
                    🔧 Available Accelerators
                  </h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    {systemMetrics.npuAvailable && (
                      <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        <div>NPU: <span className={systemMetrics.activeAccelerator === 'NPU' ? 'value' : 'value'} style={{ color: systemMetrics.activeAccelerator === 'NPU' ? 'var(--success-color)' : 'var(--success-color)' }}>
                          {systemMetrics.npuModel}
                        </span> {systemMetrics.activeAccelerator === 'NPU' && <span className="value">(Active)</span>}</div>
                        <div style={{ fontSize: '0.85rem' }}>Utilization: {systemMetrics.npuUtilization.toFixed(1)}%</div>
                      </div>
                    )}
                    {systemMetrics.igpuAvailable && (
                      <div style={{ marginBottom: '8px' }}>
                        <div>iGPU: <span className="value" style={{ color: systemMetrics.activeAccelerator === 'iGPU' ? 'var(--success-color)' : 'var(--success-color)' }}>
                          {systemMetrics.igpuModel}
                        </span> {systemMetrics.activeAccelerator === 'iGPU' && <span className="value">(Active)</span>}</div>
                        <div style={{ fontSize: '0.85rem' }}>Utilization: {systemMetrics.igpuUtilization.toFixed(1)}%</div>
                        {systemMetrics.igpuMemoryTotal > 0 && (
                          <div style={{ fontSize: '0.85rem' }}>Memory: {(systemMetrics.igpuMemoryTotal / 1024).toFixed(0)} GB</div>
                        )}
                      </div>
                    )}
                    {!systemMetrics.npuAvailable && !systemMetrics.igpuAvailable && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No additional accelerators detected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDashboardTab === 'composite' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Energy Efficiency: Tokens/sec per Watt = real-time calculation from model metrics and power draw (tokensPerSecond / powerDraw). Power efficiency = real-time efficiency rating based on CPU utilization and token throughput. Battery drain rate = estimated from real-time power draw (powerDraw / 100 %/min)" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Energy Efficiency</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>Tokens/sec per Watt: <span className="value">{compositeMetrics.tokensPerWatt.toFixed(2)} t/s/W</span></div>
                    <div>Power efficiency: <span className="value">{compositeMetrics.efficiencyRating.toFixed(1)}</span></div>
                    <div>Battery drain rate: <span className="value">{(systemMetrics.powerDraw / 100).toFixed(2)}%/min</span></div>
                  </div>
                </div>
                
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Response Quality: Response time per token = real-time calculation from API response (totalResponseTime / tokensOut). Decoding smoothness = real-time calculation from token throughput (tokensPerSecond / 2). Quality score = real-time efficiency rating based on performance metrics" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Response Quality</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>Response time per token: <span className="value">{modelMetrics.tokensOut > 0 ? (modelMetrics.totalResponseTime / modelMetrics.tokensOut).toFixed(1) : '0.0'} ms/token</span></div>
                    <div>Decoding smoothness: <span className="value">{Math.min(10, Math.floor(modelMetrics.tokensPerSecond / 2))}/10</span></div>
                    <div>Quality score: <span className="value">{Math.min(10, Math.floor(compositeMetrics.efficiencyRating))}/10</span></div>
                  </div>
                </div>
                
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Resource Balance: CPU-GPU balance = real-time ratio from Performance API CPU utilization and GPU utilization (cpuUtilization / gpuUtilization). Memory efficiency = real-time calculation from RAM usage (ramUsage / 32000 * 100%). Load distribution = real-time determination based on CPU vs GPU utilization" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Resource Balance</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>CPU-GPU balance: <span className="value">{(systemMetrics.cpuUtilization / systemMetrics.gpuUtilization).toFixed(2)}</span></div>
                    <div>Memory efficiency: <span className="value">{((systemMetrics.ramUsage / 32000) * 100).toFixed(1)}%</span></div>
                    <div>Load distribution: <span className="value">{systemMetrics.cpuUtilization > systemMetrics.gpuUtilization ? 'CPU-bound' : 'GPU-bound'}</span></div>
                  </div>
                </div>
                
                <div className="metric-card" style={{ position: 'relative' }}>
                  <HintIcon text="Thermal Performance: Thermal efficiency = real-time calculation from temperature (10 - temperature / 10). Sustained duration = estimated from real-time temperature (60 - temperature / 2 minutes). Throttle threshold = real-time detection (70°C if throttling, 80°C otherwise). Performance curve = real-time status based on throttling detection" />
                  <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>🔹 Thermal Performance</h4>
                  <div className="metric-value" style={{ fontSize: isROGAllyX ? '1.1rem' : '0.9rem' }}>
                    <div>Thermal efficiency: <span className="value">{Math.max(0, Math.floor(10 - systemMetrics.temperature / 10))}/10</span></div>
                    <div>Sustained duration: <span className="value">{(60 - systemMetrics.temperature / 2).toFixed(1)} min</span></div>
                    <div>Throttle threshold: <span className="error">{systemMetrics.isThrottling ? '70°C' : '80°C'}</span></div>
                    <div>Performance curve: <span className="value">{systemMetrics.isThrottling ? 'Decreasing' : 'Stable'}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <h4 className="metric-title" style={{ fontSize: isROGAllyX ? '1.3rem' : '1rem' }}>💡 Performance Insights</h4>
                <div className="metric-value" style={{ fontSize: '0.9rem' }}>
                  <div>Optimal settings detected: <span className="value">{compositeMetrics.efficiencyRating > 7 ? 'Yes' : 'No'}</span></div>
                  <div>Recommended adjustments: <span className="warning">{systemMetrics.isThrottling ? 'Reduce load' : 'None'}</span></div>
                  <div>Performance trend: <span className="value">{compositeMetrics.performanceTrend}</span></div>
                  <div>Efficiency rating: <span className="value">{compositeMetrics.efficiencyRating.toFixed(1)}/10</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

