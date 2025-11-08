// Metrics collection utilities for the AI Model Playground Dashboard

export interface ModelMetrics {
  // Latency metrics
  promptToFirstToken: number; // ms
  totalResponseTime: number; // ms
  
  // Token throughput
  tokensPerSecond: number;
  tokensIn: number;
  tokensOut: number;
  
  // Context utilization
  promptLength: number;
  maxTokens: number;
  contextUtilization: number; // percentage
  
  // Performance metrics
  activeRequests: number;
  quantizationFormat: string;
  cacheHitRate: number; // percentage
  errorCount: number;
  timeoutCount: number;
}

export interface SystemMetrics {
  // CPU metrics
  cpuUtilization: number; // percentage
  cpuPerCore: number[]; // per-core utilization
  threadCount: number;
  
  // GPU metrics
  gpuUtilization: number; // percentage
  gpuMemoryUsage: number; // MB
  gpuTemperature: number; // Celsius
  gpuModel: string; // GPU model name (e.g., "MI300X", "A100", "RTX 4090")
  gpuVendor: string; // GPU vendor (e.g., "AMD", "NVIDIA")
  gpuMemoryTotal: number; // Total GPU memory in MB
  gpuMemoryBandwidth: number; // Memory bandwidth in GB/s
  gpuComputeUnits: number; // Number of compute units (for AMD GPUs)
  gpuClockSpeed: number; // GPU clock speed in MHz
  
  // Accelerator information (NPU, iGPU, etc.)
  activeAccelerator: string; // What LM Studio is currently using (e.g., "dGPU", "iGPU", "NPU", "CPU")
  acceleratorType: string; // Type of accelerator (e.g., "NVIDIA RTX 4090", "Intel Arc iGPU", "Apple Neural Engine", "Qualcomm NPU")
  npuAvailable: boolean; // Whether NPU is available
  npuUtilization: number; // NPU utilization percentage
  npuModel: string; // NPU model name
  igpuAvailable: boolean; // Whether integrated GPU is available
  igpuUtilization: number; // iGPU utilization percentage
  igpuModel: string; // iGPU model name
  igpuMemoryTotal: number; // iGPU memory in MB
  
  // Memory metrics
  ramUsage: number; // MB
  swapActivity: number; // MB
  availableMemory: number; // MB
  
  // Power & Thermal
  powerDraw: number; // Watts
  cpuTemperature: number; // Celsius
  isThrottling: boolean;
  batteryLevel: number; // percentage
  batteryDrainRate: number; // percentage per minute
  
  // I/O metrics
  diskIO: number; // MB/s
  networkThroughput: number; // MB/s
  processId: number;
  uptime: number; // seconds
}

export interface CompositeMetrics {
  // Energy efficiency
  tokensPerWatt: number;
  powerEfficiency: number;
  batteryDrainRate: number;
  
  // Response quality
  responseTimePerToken: number; // ms/token
  decodingSmoothness: number; // 0-10 scale
  qualityScore: number; // 0-10 scale
  
  // Resource balance
  cpuGpuBalance: number; // ratio
  memoryEfficiency: number; // percentage
  loadDistribution: string;
  
  // Thermal performance
  thermalEfficiency: number; // 0-10 scale
  sustainedDuration: number; // minutes
  throttleThreshold: number; // Celsius
  performanceCurve: string;
  
  // Insights
  optimalSettings: string;
  recommendedAdjustments: string;
  performanceTrend: string;
  efficiencyRating: number; // 0-10 scale
}

export class MetricsCollector {
  private modelMetrics: ModelMetrics;
  private systemMetrics: SystemMetrics;
  private compositeMetrics: CompositeMetrics;
  private isCollecting: boolean = false;
  private collectionInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.modelMetrics = this.initializeModelMetrics();
    this.systemMetrics = this.initializeSystemMetrics();
    this.compositeMetrics = this.initializeCompositeMetrics();
  }

  private initializeModelMetrics(): ModelMetrics {
    return {
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
      errorCount: 0,
      timeoutCount: 0
    };
  }

  private initializeSystemMetrics(): SystemMetrics {
    return {
      cpuUtilization: 0,
      cpuPerCore: [],
      threadCount: 0,
      gpuUtilization: 0,
      gpuMemoryUsage: 0,
      gpuTemperature: 0,
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
      igpuMemoryTotal: 0,
      ramUsage: 0,
      swapActivity: 0,
      availableMemory: 0,
      powerDraw: 0,
      cpuTemperature: 0,
      isThrottling: false,
      batteryLevel: 0,
      batteryDrainRate: 0,
      diskIO: 0,
      networkThroughput: 0,
      processId: 0,
      uptime: 0
    };
  }

  private initializeCompositeMetrics(): CompositeMetrics {
    return {
      tokensPerWatt: 0,
      powerEfficiency: 0,
      batteryDrainRate: 0,
      responseTimePerToken: 0,
      decodingSmoothness: 0,
      qualityScore: 0,
      cpuGpuBalance: 0,
      memoryEfficiency: 0,
      loadDistribution: 'Unknown',
      thermalEfficiency: 0,
      sustainedDuration: 0,
      throttleThreshold: 0,
      performanceCurve: 'Unknown',
      optimalSettings: 'Not detected',
      recommendedAdjustments: 'None',
      performanceTrend: 'Stable',
      efficiencyRating: 0
    };
  }

  // Start collecting metrics
  startCollection(intervalMs: number = 1000): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.updateCompositeMetrics();
    }, intervalMs);
  }

  // Stop collecting metrics
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
  }

  // Collect system metrics (simulated for now)
  private collectSystemMetrics(): void {
    // Simulate system metrics collection
    // In a real implementation, you would use:
    // - psutil for CPU, memory, disk I/O
    // - pynvml for NVIDIA GPU metrics
    // - rocm-smi for AMD GPU metrics (including MI300X)
    // - Battery APIs for power metrics
    
    // Detect GPU type (simulated - in real implementation, query rocm-smi or nvidia-smi)
    const detectedGpu = this.detectGPU();
    const detectedAccelerators = this.detectAccelerators();
    
    this.systemMetrics = {
      cpuUtilization: Math.random() * 100,
      cpuPerCore: Array.from({ length: navigator.hardwareConcurrency || 4 }, () => Math.random() * 100),
      threadCount: Math.floor(Math.random() * 20) + 10,
      gpuUtilization: Math.random() * 100,
      gpuMemoryUsage: Math.random() * (detectedGpu.memoryTotal || 8000),
      gpuTemperature: 30 + Math.random() * 40,
      gpuModel: detectedGpu.model,
      gpuVendor: detectedGpu.vendor,
      gpuMemoryTotal: detectedGpu.memoryTotal,
      gpuMemoryBandwidth: detectedGpu.memoryBandwidth,
      gpuComputeUnits: detectedGpu.computeUnits,
      gpuClockSpeed: detectedGpu.clockSpeed,
      activeAccelerator: detectedAccelerators.active,
      acceleratorType: detectedAccelerators.type,
      npuAvailable: detectedAccelerators.npuAvailable,
      npuUtilization: detectedAccelerators.npuUtilization,
      npuModel: detectedAccelerators.npuModel,
      igpuAvailable: detectedAccelerators.igpuAvailable,
      igpuUtilization: detectedAccelerators.igpuUtilization,
      igpuModel: detectedAccelerators.igpuModel,
      igpuMemoryTotal: detectedAccelerators.igpuMemoryTotal,
      ramUsage: Math.random() * 16000,
      swapActivity: Math.random() * 1000,
      availableMemory: Math.random() * 8000,
      powerDraw: 20 + Math.random() * 100,
      cpuTemperature: 40 + Math.random() * 30,
      isThrottling: Math.random() > 0.9,
      batteryLevel: Math.random() * 100,
      batteryDrainRate: Math.random() * 5,
      diskIO: Math.random() * 100,
      networkThroughput: Math.random() * 50,
      processId: Math.floor(Math.random() * 10000) + 1000,
      uptime: Date.now() / 1000 - Math.random() * 86400
    };
  }

  // Update composite metrics based on model and system metrics
  private updateCompositeMetrics(): void {
    const { modelMetrics, systemMetrics } = this;
    
    // Energy efficiency
    this.compositeMetrics.tokensPerWatt = systemMetrics.powerDraw > 0 
      ? modelMetrics.tokensPerSecond / systemMetrics.powerDraw 
      : 0;
    this.compositeMetrics.powerEfficiency = systemMetrics.powerDraw > 0 
      ? (modelMetrics.tokensPerSecond / systemMetrics.powerDraw) * 100 
      : 0;
    this.compositeMetrics.batteryDrainRate = systemMetrics.batteryDrainRate;
    
    // Response quality
    this.compositeMetrics.responseTimePerToken = modelMetrics.tokensOut > 0 
      ? modelMetrics.totalResponseTime / modelMetrics.tokensOut 
      : 0;
    this.compositeMetrics.decodingSmoothness = Math.min(10, 
      modelMetrics.tokensPerSecond / 10);
    this.compositeMetrics.qualityScore = Math.min(10, 
      (modelMetrics.cacheHitRate / 10) + (this.compositeMetrics.decodingSmoothness / 2));
    
    // Resource balance
    this.compositeMetrics.cpuGpuBalance = systemMetrics.gpuUtilization > 0 
      ? systemMetrics.cpuUtilization / systemMetrics.gpuUtilization 
      : 0;
    this.compositeMetrics.memoryEfficiency = systemMetrics.availableMemory > 0 
      ? (systemMetrics.ramUsage / (systemMetrics.ramUsage + systemMetrics.availableMemory)) * 100 
      : 0;
    this.compositeMetrics.loadDistribution = this.calculateLoadDistribution();
    
    // Thermal performance
    this.compositeMetrics.thermalEfficiency = Math.max(0, 10 - (systemMetrics.cpuTemperature / 10));
    this.compositeMetrics.sustainedDuration = systemMetrics.isThrottling ? 0 : Math.random() * 60;
    this.compositeMetrics.throttleThreshold = 80 + Math.random() * 10;
    this.compositeMetrics.performanceCurve = this.calculatePerformanceCurve();
    
    // Insights
    this.compositeMetrics.optimalSettings = this.generateOptimalSettings();
    this.compositeMetrics.recommendedAdjustments = this.generateRecommendations();
    this.compositeMetrics.performanceTrend = this.calculatePerformanceTrend();
    this.compositeMetrics.efficiencyRating = this.calculateEfficiencyRating();
  }

  private calculateLoadDistribution(): string {
    const { cpuUtilization, gpuUtilization } = this.systemMetrics;
    if (cpuUtilization > gpuUtilization * 1.5) return 'CPU-bound';
    if (gpuUtilization > cpuUtilization * 1.5) return 'GPU-bound';
    return 'Balanced';
  }

  private calculatePerformanceCurve(): string {
    const { cpuTemperature, gpuTemperature } = this.systemMetrics;
    const avgTemp = (cpuTemperature + gpuTemperature) / 2;
    if (avgTemp < 50) return 'Optimal';
    if (avgTemp < 70) return 'Good';
    if (avgTemp < 85) return 'Thermal throttling risk';
    return 'Thermal throttling active';
  }

  private generateOptimalSettings(): string {
    const { cpuUtilization, gpuUtilization, cpuTemperature, gpuModel } = this.systemMetrics;
    
    // MI300X-specific optimizations
    if (gpuModel === 'MI300X') {
      if (gpuUtilization < 70) return 'MI300X: Increase batch size to utilize 192GB HBM3';
      if (gpuUtilization > 90 && cpuUtilization < 50) return 'MI300X: Leverage 304 compute units with larger models';
      if (this.systemMetrics.gpuMemoryUsage < this.systemMetrics.gpuMemoryTotal * 0.3) {
        return 'MI300X: Utilize high-bandwidth HBM3 memory (5.3 TB/s)';
      }
      return 'MI300X: Optimal configuration for AI workloads';
    }
    
    if (cpuUtilization > 80 && gpuUtilization < 60) return 'Increase GPU utilization';
    if (gpuUtilization > 80 && cpuUtilization < 60) return 'Increase CPU utilization';
    if (cpuTemperature > 75) return 'Reduce CPU load or improve cooling';
    return 'Settings appear optimal';
  }

  private generateRecommendations(): string {
    const { isThrottling, batteryLevel, powerDraw, gpuModel, gpuUtilization } = this.systemMetrics;
    
    // MI300X-specific recommendations
    if (gpuModel === 'MI300X') {
      if (gpuUtilization < 50) return 'MI300X: Consider larger models to fully utilize compute units';
      if (this.systemMetrics.gpuMemoryUsage < this.systemMetrics.gpuMemoryTotal * 0.2) {
        return 'MI300X: Increase model size to leverage 192GB HBM3 memory';
      }
      if (isThrottling) return 'MI300X: Monitor thermal limits for sustained performance';
      return 'MI300X: ROCm optimization recommended for best performance';
    }
    
    if (isThrottling) return 'Reduce load or improve cooling';
    if (batteryLevel < 20) return 'Connect to power source';
    if (powerDraw > 80) return 'Consider power optimization';
    return 'No immediate adjustments needed';
  }

  private calculatePerformanceTrend(): string {
    // This would be calculated over time in a real implementation
    const random = Math.random();
    if (random < 0.3) return 'Improving';
    if (random < 0.7) return 'Stable';
    return 'Declining';
  }

  private calculateEfficiencyRating(): number {
    const { tokensPerWatt, thermalEfficiency, memoryEfficiency } = this.compositeMetrics;
    return Math.min(10, (tokensPerWatt * 0.3 + thermalEfficiency * 0.4 + memoryEfficiency * 0.3));
  }

  // Detect GPU type and characteristics
  private detectGPU(): { model: string; vendor: string; memoryTotal: number; memoryBandwidth: number; computeUnits: number; clockSpeed: number } {
    // In a real implementation, this would query rocm-smi or nvidia-smi
    // For now, simulate detection with preference for MI300X if available
    
    // Simulate MI300X detection (30% chance in simulation)
    if (Math.random() < 0.3) {
      return {
        model: 'MI300X',
        vendor: 'AMD',
        memoryTotal: 192 * 1024, // 192 GB HBM3
        memoryBandwidth: 5300, // 5.3 TB/s = 5300 GB/s
        computeUnits: 304, // 304 CDNA compute units
        clockSpeed: 1700 // ~1.7 GHz typical
      };
    }
    
    // Simulate other GPUs
    const gpus = [
      { model: 'A100', vendor: 'NVIDIA', memoryTotal: 80 * 1024, memoryBandwidth: 2039, computeUnits: 0, clockSpeed: 1410 },
      { model: 'H100', vendor: 'NVIDIA', memoryTotal: 80 * 1024, memoryBandwidth: 3000, computeUnits: 0, clockSpeed: 1830 },
      { model: 'RTX 4090', vendor: 'NVIDIA', memoryTotal: 24 * 1024, memoryBandwidth: 1008, computeUnits: 0, clockSpeed: 2520 },
      { model: 'MI250X', vendor: 'AMD', memoryTotal: 128 * 1024, memoryBandwidth: 3277, computeUnits: 220, clockSpeed: 1700 },
      { model: 'Unknown', vendor: 'Unknown', memoryTotal: 8 * 1024, memoryBandwidth: 500, computeUnits: 0, clockSpeed: 1000 }
    ];
    
    return gpus[Math.floor(Math.random() * gpus.length)];
  }

  // Detect accelerators (NPU, iGPU, etc.) and what LM Studio is using
  private detectAccelerators(): {
    active: string;
    type: string;
    npuAvailable: boolean;
    npuUtilization: number;
    npuModel: string;
    igpuAvailable: boolean;
    igpuUtilization: number;
    igpuModel: string;
    igpuMemoryTotal: number;
  } {
    // In a real implementation, this would query:
    // - LM Studio API to see what accelerator it's using
    // - System APIs to detect NPU (Intel NPU, Qualcomm NPU, Apple Neural Engine, etc.)
    // - iGPU detection (Intel Arc, AMD APU, etc.)
    
    // Simulate accelerator detection
    const hasNPU = Math.random() < 0.2; // 20% chance of NPU
    const hasIGPU = Math.random() < 0.6; // 60% chance of iGPU
    
    let activeAccelerator = 'dGPU'; // Default to discrete GPU
    let acceleratorType = 'Unknown';
    let npuModel = 'Unknown';
    let igpuModel = 'Unknown';
    let igpuMemoryTotal = 0;
    
    // Detect NPU
    if (hasNPU) {
      const npus = [
        { model: 'Intel NPU', type: 'Intel NPU' },
        { model: 'Apple Neural Engine', type: 'Apple Neural Engine' },
        { model: 'Qualcomm NPU', type: 'Qualcomm NPU' },
        { model: 'MediaTek APU', type: 'MediaTek APU' }
      ];
      const npu = npus[Math.floor(Math.random() * npus.length)];
      npuModel = npu.model;
      
      // Sometimes LM Studio might use NPU
      if (Math.random() < 0.3) {
        activeAccelerator = 'NPU';
        acceleratorType = npu.type;
      }
    }
    
    // Detect iGPU
    if (hasIGPU) {
      const igpus = [
        { model: 'Intel Arc A770', memory: 16 * 1024 },
        { model: 'Intel UHD Graphics', memory: 2 * 1024 },
        { model: 'AMD Radeon Graphics', memory: 4 * 1024 },
        { model: 'Apple M3 GPU', memory: 24 * 1024 },
        { model: 'Apple M2 GPU', memory: 16 * 1024 }
      ];
      const igpu = igpus[Math.floor(Math.random() * igpus.length)];
      igpuModel = igpu.model;
      igpuMemoryTotal = igpu.memory;
      
      // Sometimes LM Studio might use iGPU instead of dGPU
      if (Math.random() < 0.4 && activeAccelerator !== 'NPU') {
        activeAccelerator = 'iGPU';
        acceleratorType = igpu.model;
      }
    }
    
    // If no special accelerator, use dGPU
    if (activeAccelerator === 'dGPU') {
      acceleratorType = this.systemMetrics.gpuModel !== 'Unknown' 
        ? `${this.systemMetrics.gpuVendor} ${this.systemMetrics.gpuModel}`
        : 'Discrete GPU';
    }
    
    return {
      active: activeAccelerator,
      type: acceleratorType,
      npuAvailable: hasNPU,
      npuUtilization: hasNPU && activeAccelerator === 'NPU' ? Math.random() * 100 : 0,
      npuModel: npuModel,
      igpuAvailable: hasIGPU,
      igpuUtilization: hasIGPU && activeAccelerator === 'iGPU' ? Math.random() * 100 : Math.random() * 30,
      igpuModel: igpuModel,
      igpuMemoryTotal: igpuMemoryTotal
    };
  }

  // Record model inference metrics
  recordInference(
    promptLength: number,
    responseLength: number,
    responseTime: number,
    firstTokenTime: number,
    tokensPerSecond: number,
    quantizationFormat: string = 'Unknown'
  ): void {
    this.modelMetrics.promptLength = promptLength;
    this.modelMetrics.tokensOut = responseLength;
    this.modelMetrics.tokensIn = promptLength;
    this.modelMetrics.totalResponseTime = responseTime;
    this.modelMetrics.promptToFirstToken = firstTokenTime;
    this.modelMetrics.tokensPerSecond = tokensPerSecond;
    this.modelMetrics.quantizationFormat = quantizationFormat;
    this.modelMetrics.maxTokens = Math.max(this.modelMetrics.maxTokens, promptLength + responseLength);
    this.modelMetrics.contextUtilization = (promptLength / this.modelMetrics.maxTokens) * 100;
  }

  // Record error
  recordError(): void {
    this.modelMetrics.errorCount++;
  }

  // Record timeout
  recordTimeout(): void {
    this.modelMetrics.timeoutCount++;
  }

  // Get current metrics
  getModelMetrics(): ModelMetrics {
    return { ...this.modelMetrics };
  }

  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  getCompositeMetrics(): CompositeMetrics {
    return { ...this.compositeMetrics };
  }

  // Get all metrics
  getAllMetrics() {
    return {
      model: this.getModelMetrics(),
      system: this.getSystemMetrics(),
      composite: this.getCompositeMetrics()
    };
  }
}

// Export a singleton instance
export const metricsCollector = new MetricsCollector();
