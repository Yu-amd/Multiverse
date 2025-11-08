// Basic metrics collection for the AI Model Playground Dashboard

export interface BasicModelMetrics {
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
}

export interface BasicSystemMetrics {
  cpuUtilization: number;
  gpuUtilization: number;
  ramUsage: number;
  powerDraw: number;
  temperature: number;
  isThrottling: boolean;
  gpuModel: string;
  gpuVendor: string;
  gpuMemoryTotal: number;
}

export interface BasicCompositeMetrics {
  tokensPerWatt: number;
  efficiencyRating: number;
  performanceTrend: string;
}

export class BasicMetricsCollector {
  private modelMetrics: BasicModelMetrics;
  private systemMetrics: BasicSystemMetrics;
  private compositeMetrics: BasicCompositeMetrics;

  constructor() {
    this.modelMetrics = {
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
    };

    this.systemMetrics = {
      cpuUtilization: 0,
      gpuUtilization: 0,
      ramUsage: 0,
      powerDraw: 0,
      temperature: 0,
      isThrottling: false,
      gpuModel: 'Unknown',
      gpuVendor: 'Unknown',
      gpuMemoryTotal: 0
    };

    this.compositeMetrics = {
      tokensPerWatt: 0,
      efficiencyRating: 0,
      performanceTrend: 'Stable'
    };
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

  getModelMetrics(): BasicModelMetrics {
    return { ...this.modelMetrics };
  }

  getSystemMetrics(): BasicSystemMetrics {
    // Simulate basic system metrics
    const detectedGpu = this.detectGPU();
    
    this.systemMetrics = {
      cpuUtilization: Math.random() * 100,
      gpuUtilization: Math.random() * 100,
      ramUsage: Math.random() * 16000,
      powerDraw: 20 + Math.random() * 100,
      temperature: 40 + Math.random() * 30,
      isThrottling: Math.random() > 0.9,
      gpuModel: detectedGpu.model,
      gpuVendor: detectedGpu.vendor,
      gpuMemoryTotal: detectedGpu.memoryTotal
    };
    return { ...this.systemMetrics };
  }

  // Detect GPU type and characteristics
  private detectGPU(): { model: string; vendor: string; memoryTotal: number } {
    if (Math.random() < 0.3) {
      return {
        model: 'MI300X',
        vendor: 'AMD',
        memoryTotal: 192 * 1024 // 192 GB HBM3
      };
    }
    
    const gpus = [
      { model: 'A100', vendor: 'NVIDIA', memoryTotal: 80 * 1024 },
      { model: 'H100', vendor: 'NVIDIA', memoryTotal: 80 * 1024 },
      { model: 'RTX 4090', vendor: 'NVIDIA', memoryTotal: 24 * 1024 },
      { model: 'MI250X', vendor: 'AMD', memoryTotal: 128 * 1024 },
      { model: 'Unknown', vendor: 'Unknown', memoryTotal: 8 * 1024 }
    ];
    
    return gpus[Math.floor(Math.random() * gpus.length)];
  }

  getCompositeMetrics(): BasicCompositeMetrics {
    // Calculate basic composite metrics
    this.compositeMetrics.tokensPerWatt = this.systemMetrics.powerDraw > 0 
      ? this.modelMetrics.tokensPerSecond / this.systemMetrics.powerDraw 
      : 0;
    this.compositeMetrics.efficiencyRating = Math.min(10, this.compositeMetrics.tokensPerWatt * 10);
    this.compositeMetrics.performanceTrend = this.modelMetrics.tokensPerSecond > 0 ? 'Improving' : 'Stable';
    return { ...this.compositeMetrics };
  }
}

// Export a singleton instance
export const basicMetricsCollector = new BasicMetricsCollector();
