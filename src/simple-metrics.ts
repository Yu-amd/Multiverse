// Simplified metrics collection for the AI Model Playground Dashboard

export interface SimpleModelMetrics {
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
  timeoutCount: number;
}

export interface SimpleSystemMetrics {
  cpuUtilization: number;
  cpuPerCore: number[];
  threadCount: number;
  gpuUtilization: number;
  gpuMemoryUsage: number;
  gpuTemperature: number;
  ramUsage: number;
  swapActivity: number;
  availableMemory: number;
  powerDraw: number;
  cpuTemperature: number;
  isThrottling: boolean;
  batteryLevel: number;
  batteryDrainRate: number;
  diskIO: number;
  networkThroughput: number;
  processId: number;
  uptime: number;
}

export interface SimpleCompositeMetrics {
  tokensPerWatt: number;
  powerEfficiency: number;
  batteryDrainRate: number;
  responseTimePerToken: number;
  decodingSmoothness: number;
  qualityScore: number;
  cpuGpuBalance: number;
  memoryEfficiency: number;
  loadDistribution: string;
  thermalEfficiency: number;
  sustainedDuration: number;
  throttleThreshold: number;
  performanceCurve: string;
  optimalSettings: string;
  recommendedAdjustments: string;
  performanceTrend: string;
  efficiencyRating: number;
}

export class SimpleMetricsCollector {
  private modelMetrics: SimpleModelMetrics;
  private systemMetrics: SimpleSystemMetrics;
  private compositeMetrics: SimpleCompositeMetrics;
  private isCollecting: boolean = false;
  private collectionInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.modelMetrics = this.initializeModelMetrics();
    this.systemMetrics = this.initializeSystemMetrics();
    this.compositeMetrics = this.initializeCompositeMetrics();
  }

  private initializeModelMetrics(): SimpleModelMetrics {
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

  private initializeSystemMetrics(): SimpleSystemMetrics {
    return {
      cpuUtilization: 0,
      cpuPerCore: [],
      threadCount: 0,
      gpuUtilization: 0,
      gpuMemoryUsage: 0,
      gpuTemperature: 0,
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

  private initializeCompositeMetrics(): SimpleCompositeMetrics {
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

  startCollection(intervalMs: number = 1000): void {
    if (this.isCollecting) return;
    
    console.log('Starting metrics collection with interval:', intervalMs);
    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.updateCompositeMetrics();
    }, intervalMs);
    console.log('Metrics collection interval set:', this.collectionInterval);
  }

  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
  }

  private collectSystemMetrics(): void {
    console.log('Collecting system metrics...');
    // Simulate system metrics with more realistic values
    this.systemMetrics = {
      cpuUtilization: Math.random() * 100,
      cpuPerCore: Array.from({ length: navigator.hardwareConcurrency || 4 }, () => Math.random() * 100),
      threadCount: Math.floor(Math.random() * 20) + 10,
      gpuUtilization: Math.random() * 100,
      gpuMemoryUsage: Math.random() * 8000,
      gpuTemperature: 30 + Math.random() * 40,
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

  private updateCompositeMetrics(): void {
    console.log('Updating composite metrics...');
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
    const { cpuUtilization, gpuUtilization, cpuTemperature } = this.systemMetrics;
    if (cpuUtilization > 80 && gpuUtilization < 60) return 'Increase GPU utilization';
    if (gpuUtilization > 80 && cpuUtilization < 60) return 'Increase CPU utilization';
    if (cpuTemperature > 75) return 'Reduce CPU load or improve cooling';
    return 'Settings appear optimal';
  }

  private generateRecommendations(): string {
    const { isThrottling, batteryLevel, powerDraw } = this.systemMetrics;
    if (isThrottling) return 'Reduce load or improve cooling';
    if (batteryLevel < 20) return 'Connect to power source';
    if (powerDraw > 80) return 'Consider power optimization';
    return 'No immediate adjustments needed';
  }

  private calculatePerformanceTrend(): string {
    const random = Math.random();
    if (random < 0.3) return 'Improving';
    if (random < 0.7) return 'Stable';
    return 'Declining';
  }

  private calculateEfficiencyRating(): number {
    const { tokensPerWatt, thermalEfficiency, memoryEfficiency } = this.compositeMetrics;
    return Math.min(10, (tokensPerWatt * 0.3 + thermalEfficiency * 0.4 + memoryEfficiency * 0.3));
  }

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

  recordError(): void {
    this.modelMetrics.errorCount++;
  }

  recordTimeout(): void {
    this.modelMetrics.timeoutCount++;
  }

  getModelMetrics(): SimpleModelMetrics {
    return { ...this.modelMetrics };
  }

  getSystemMetrics(): SimpleSystemMetrics {
    return { ...this.systemMetrics };
  }

  getCompositeMetrics(): SimpleCompositeMetrics {
    return { ...this.compositeMetrics };
  }
}

// Export a singleton instance
export const simpleMetricsCollector = new SimpleMetricsCollector();
