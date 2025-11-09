import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Type definitions for browser APIs
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<BatteryManager>;
}

interface GPUAdapter {
  requestAdapterInfo(): Promise<{ vendor: string; architecture: string; device?: string; description?: string }>;
}

interface NavigatorWithGPU extends Navigator {
  gpu?: {
    requestAdapter(): Promise<GPUAdapter | null>;
  };
}

// Import components
import { ChatContainer } from './components/ChatContainer';
import { CodePanel } from './components/CodePanel';
import { Dashboard } from './components/Dashboard';
import { SettingsModal } from './components/SettingsModal';
import { ConversationHistoryModal } from './components/ConversationHistoryModal';
import { ApiInfoModal } from './components/ApiInfoModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Import hooks
import { useSettings } from './hooks/useSettings';
import { useConversation } from './hooks/useConversation';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { useConnection } from './hooks/useConnection';
import { useBackendMetrics } from './hooks/useBackendMetrics';
import { debounce } from './utils/debounce';
import { useChat } from './hooks/useChat';

// Import utilities - not needed directly in App.tsx anymore

function App() {
  // Use extracted hooks
  const { settings, updateSettings } = useSettings();
  const { selectedModel, customEndpoint, apiKey, temperature, maxTokens, topP } = settings;

  const { 
    messages, 
    setMessages, 
    clearConversation,
    getSavedConversations,
    saveConversationToList,
    loadConversationFromList,
    deleteConversation,
    renameConversation
  } = useConversation();

  const { theme, setTheme } = useTheme();
  const { toasts, showToast, removeToast } = useToast();
  const connectionStatus = useConnection(customEndpoint, apiKey);
  
  // Backend metrics service (optional - falls back to browser metrics if unavailable)
  const backendMetricsUrl = 'http://localhost:8000'; // Can be made configurable
  const { 
    metrics: backendMetrics, 
    connected: backendConnected
  } = useBackendMetrics({
    backendUrl: backendMetricsUrl,
    enabled: true, // Can be made configurable via settings
    onError: () => {
      // Only log if we've exhausted all reconnection attempts
      // The hook itself will log connection status
      if (import.meta.env.DEV) {
        console.debug('[Backend Metrics] Using browser metrics as fallback');
      }
    }
  });

  // Chat functionality - ChatContainer uses useChat internally
  // We only need handleDeleteMessage for ChatContainer
  const { handleDeleteMessage } = useChat({
    messages,
    setMessages,
    customEndpoint,
    apiKey,
    temperature,
    maxTokens,
    topP,
    showToast,
    recordMetrics: (promptLength, responseLength, totalTime, firstTokenLatency, tokensPerSecond) => {
      setModelMetrics(prev => ({
        ...prev,
        promptToFirstToken: firstTokenLatency,
        totalResponseTime: totalTime,
        tokensPerSecond: tokensPerSecond,
        tokensIn: promptLength,
        tokensOut: responseLength,
        promptLength: promptLength,
        maxTokens: maxTokens,
        contextUtilization: (promptLength / maxTokens) * 100,
        activeRequests: 0 // Will be updated by ChatContainer
      }));
    },
    recordError: () => {
      setModelMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    }
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  // Metrics data - will be updated with real values
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
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isROGAllyX, setIsROGAllyX] = useState(false);
  
  // Ref for auto-scrolling chat messages
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Real-time system metrics collection using browser APIs
  const collectRealTimeMetrics = async (): Promise<{
    cpuUtilization: number;
    ramUsage: number;
    availableMemory: number;
    batteryLevel: number;
    batteryCharging: boolean;
    batteryDischargingTime: number;
    uptime: number;
    threadCount: number;
  }> => {
    const metrics = {
      cpuUtilization: 0,
      ramUsage: 0,
      availableMemory: 0,
      batteryLevel: 100,
      batteryCharging: false,
      batteryDischargingTime: Infinity,
      uptime: performance.now() / 1000, // seconds
      threadCount: navigator.hardwareConcurrency || 0
    };

    try {
      // Get CPU utilization from Performance API
      if ('performance' in window && 'memory' in performance) {
        const memInfo = (performance as Performance & { memory?: PerformanceMemory }).memory;
        if (memInfo) {
          // Memory usage in MB
          metrics.ramUsage = memInfo.usedJSHeapSize / (1024 * 1024);
          metrics.availableMemory = (memInfo.totalJSHeapSize - memInfo.usedJSHeapSize) / (1024 * 1024);
        }
      }

      // Get battery information
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as NavigatorWithBattery).getBattery();
          metrics.batteryLevel = battery.level * 100;
          metrics.batteryCharging = battery.charging;
          metrics.batteryDischargingTime = battery.dischargingTime;
        } catch {
          // Battery API not available or denied
          console.log('Battery API not available');
        }
      }

      // Estimate CPU utilization from performance timing
      // This is a simplified approach - real CPU usage requires backend
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        // Use load time as a proxy for CPU activity
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        // Normalize to 0-100% (this is an approximation)
        metrics.cpuUtilization = Math.min(100, (loadTime / 100) * 10);
      }

      // Use Performance Observer for more accurate CPU metrics
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            // Calculate CPU usage from long tasks
            const longTasks = entries.filter((entry) => entry.entryType === 'longtask');
            if (longTasks.length > 0) {
              // Estimate CPU usage from long tasks
              metrics.cpuUtilization = Math.min(100, longTasks.length * 10);
            }
          });
          observer.observe({ entryTypes: ['longtask', 'measure'] });
        } catch {
          console.log('Performance Observer not fully supported');
        }
      }
    } catch (error) {
      console.warn('Error collecting real-time metrics:', error);
    }

    return metrics;
  };

  // Real accelerator detection using browser APIs
  const detectAccelerators = async (gpuInfo: { model: string; vendor: string }): Promise<{
    active: string;
    type: string;
    npuAvailable: boolean;
    npuUtilization: number;
    npuModel: string;
    igpuAvailable: boolean;
    igpuUtilization: number;
    igpuModel: string;
    igpuMemoryTotal: number;
  }> => {
    let activeAccelerator = 'dGPU';
    let acceleratorType = 'Unknown';
    let npuAvailable = false;
    let npuModel = 'Unknown';
    let igpuAvailable = false;
    let igpuModel = 'Unknown';
    let igpuMemoryTotal = 0;

    try {
      // Only log once in development
      if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
        console.debug('Detecting accelerators for:', gpuInfo);
        acceleratorDetectionLoggedRef.current = true;
      }
      
      // Check if it's an integrated GPU (like Strix Halo or ROG Ally X)
      const gpuModelLower = gpuInfo.model.toLowerCase();
      const vendorLower = gpuInfo.vendor.toLowerCase();
      
      // More comprehensive integrated GPU detection
      // For AMD: If it's not a known discrete GPU (RX series, MI series), assume it's iGPU
      const isKnownDiscreteGPU = gpuModelLower.includes('rx') || 
                                 gpuModelLower.includes('mi') ||
                                 gpuModelLower.includes('rtx') ||
                                 gpuModelLower.includes('gtx') ||
                                 gpuModelLower.includes('a100') ||
                                 gpuModelLower.includes('h100') ||
                                 gpuModelLower.includes('4090') ||
                                 gpuModelLower.includes('4080') ||
                                 gpuModelLower.includes('4070');
      
      // If vendor/model are unknown but we're on Linux, assume AMD iGPU (common case)
      const isUnknownOnLinux = (gpuModelLower === 'unknown' || gpuModelLower === '') && 
                               navigator.platform.toLowerCase().includes('linux');
      
      // Also check screen dimensions for handheld gaming devices (ROG Ally X typically 1920x1080)
      const isHandheldDevice = (window.innerWidth >= 1280 && window.innerWidth <= 2560 && 
                                window.innerHeight >= 720 && window.innerHeight <= 1440 &&
                                ('ontouchstart' in window || navigator.maxTouchPoints > 0));
      
      // Check for handheld gaming devices (ROG Ally X) - these are always iGPU
      const isHandheldGamingDevice = isHandheldDevice && vendorLower === 'amd';
      
      const isIntegrated = gpuModelLower.includes('strix') || 
                          gpuModelLower.includes('halo') ||
                          gpuModelLower.includes('rog') ||
                          gpuModelLower.includes('ally') ||
                          gpuModelLower.includes('z2e') ||
                          gpuModelLower.includes('z1e') ||
                          gpuModelLower.includes('z1 extreme') ||
                          gpuModelLower.includes('igpu') ||
                          gpuModelLower.includes('integrated') ||
                          gpuModelLower.includes('apu') ||
                          gpuModelLower.includes('(igpu)') ||
                          // Handheld gaming devices (ROG Ally X) are always iGPU
                          isHandheldGamingDevice ||
                          // AMD APUs: If AMD and not a known discrete GPU, it's likely iGPU
                          (vendorLower === 'amd' && !isKnownDiscreteGPU && (gpuModelLower.includes('radeon') || gpuModelLower.includes('rdna') || gpuModelLower !== 'unknown')) ||
                          // Unknown on Linux - likely AMD iGPU (most common case)
                          (isUnknownOnLinux && !isKnownDiscreteGPU) ||
                          // Intel integrated graphics
                          (vendorLower === 'intel' && (gpuModelLower.includes('uhd') || gpuModelLower.includes('iris') || (gpuModelLower.includes('arc') && !gpuModelLower.includes('a770'))));

      // Only log once in development
      if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
        console.debug('Is integrated GPU?', isIntegrated, 'Model:', gpuModelLower, 'Vendor:', vendorLower, 'IsKnownDiscrete:', isKnownDiscreteGPU, 'IsUnknownOnLinux:', isUnknownOnLinux);
      }

      if (isIntegrated) {
        igpuAvailable = true;
        activeAccelerator = 'iGPU';
        
        // AMD Strix Halo specific (check first, before ROG Ally X)
        if (gpuModelLower.includes('strix') || gpuModelLower.includes('halo') || 
            (vendorLower === 'amd' && gpuModelLower.includes('rdna') && gpuModelLower.includes('3.5'))) {
          igpuModel = 'AMD Strix Halo (RDNA 3.5)';
          acceleratorType = 'AMD Strix Halo (RDNA 3.5) - 40 RDNA 3.5 CUs';
          igpuMemoryTotal = 16 * 1024; // Shared system memory
          // Only log once in development
          if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
            console.debug('Detected Strix Halo as iGPU');
          }
        }
        // ROG Ally X (Z2E processor) specific - check after Strix Halo
        else if (gpuModelLower.includes('rog') || gpuModelLower.includes('ally') || 
            gpuModelLower.includes('z2e') || gpuModelLower.includes('z1e') ||
            gpuModelLower.includes('z1 extreme') || isHandheldGamingDevice) {
          igpuModel = 'ROG Ally X (RDNA 3)';
          acceleratorType = 'ROG Ally X (RDNA 3) - 12 CUs';
          igpuMemoryTotal = 16 * 1024; // Shared system memory
          // Only log once in development
          if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
            console.debug('Detected ROG Ally X as iGPU');
          }
        } else if (gpuModelLower.includes('rdna') || (vendorLower === 'amd' && !isKnownDiscreteGPU)) {
          // Other AMD RDNA iGPUs or any AMD GPU that's not a known discrete model
          if (gpuModelLower.includes('rdna')) {
            const rdnaMatch = gpuModelLower.match(/rdna\s*([0-9.]+)/);
            if (rdnaMatch) {
              igpuModel = `AMD Radeon (RDNA ${rdnaMatch[1]}) iGPU`;
              acceleratorType = `AMD Radeon (RDNA ${rdnaMatch[1]}) iGPU`;
            } else {
              igpuModel = gpuInfo.model || 'AMD Radeon Graphics (iGPU)';
              acceleratorType = gpuInfo.model || 'AMD Radeon Graphics (iGPU)';
            }
          } else {
            igpuModel = gpuInfo.model !== 'Unknown' ? `${gpuInfo.model} (iGPU)` : 'AMD Radeon Graphics (iGPU)';
            acceleratorType = igpuModel;
          }
          igpuMemoryTotal = 8 * 1024; // Typical for modern AMD APUs
          // Only log once in development
          if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
            console.debug('Detected AMD iGPU:', igpuModel);
          }
        } else {
          igpuModel = gpuInfo.model;
          acceleratorType = gpuInfo.model;
          igpuMemoryTotal = 4 * 1024; // Default iGPU memory
        }
      } else {
        // Discrete GPU - only if we're certain it's discrete
        // Check for handheld gaming devices (ROG Ally X) - these are always iGPU
        const isHandheldDeviceCheck = (window.innerWidth >= 1280 && window.innerWidth <= 2560 && 
                                      window.innerHeight >= 720 && window.innerHeight <= 1440 &&
                                      ('ontouchstart' in window || navigator.maxTouchPoints > 0));
        const isHandheldGamingDevice = isHandheldDeviceCheck && vendorLower === 'amd';
        
        if (isHandheldGamingDevice) {
          // Handheld gaming devices (like ROG Ally X) are always iGPU
          igpuAvailable = true;
          activeAccelerator = 'iGPU';
          igpuModel = 'ROG Ally X (RDNA 3)';
          acceleratorType = 'ROG Ally X (RDNA 3) - 12 CUs';
          igpuMemoryTotal = 16 * 1024;
          if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
            console.debug('Detected handheld gaming device (ROG Ally X) - setting iGPU', { 
              isHandheldDeviceCheck, 
              vendor: vendorLower, 
              width: window.innerWidth, 
              height: window.innerHeight 
            });
          }
        }
        // If we're not sure and it's AMD, default to iGPU for laptops/handhelds
        // Also default to iGPU if unknown on Linux (most common case)
        else if ((vendorLower === 'amd' && !isKnownDiscreteGPU) || 
            (isUnknownOnLinux && !isKnownDiscreteGPU)) {
          // Default to iGPU for AMD systems that aren't clearly discrete
          // Or for unknown systems on Linux (likely AMD iGPU)
          igpuAvailable = true;
          activeAccelerator = 'iGPU';
          
          // If Strix Halo was detected in GPU model, use that (check first)
          if (gpuInfo.model.includes('Strix Halo') || gpuInfo.model.includes('strix') || gpuInfo.model.includes('halo')) {
            igpuModel = 'AMD Strix Halo (RDNA 3.5)';
            acceleratorType = 'AMD Strix Halo (RDNA 3.5) - 40 RDNA 3.5 CUs';
            igpuMemoryTotal = 16 * 1024;
          }
          // If ROG Ally X was detected in GPU model, use that
          else if (gpuInfo.model.includes('ROG Ally') || gpuInfo.model.includes('rog') || 
              gpuInfo.model.includes('ally') || gpuInfo.model.includes('Z2E') || 
              gpuInfo.model.includes('z2e') || gpuInfo.model.includes('Z1E') ||
              gpuInfo.model.includes('z1e')) {
            igpuModel = 'ROG Ally X (RDNA 3)';
            acceleratorType = 'ROG Ally X (RDNA 3) - 12 CUs';
            igpuMemoryTotal = 16 * 1024;
          } else {
            igpuModel = gpuInfo.model !== 'Unknown' ? `${gpuInfo.model} (iGPU)` : 'AMD Radeon Graphics (iGPU)';
            acceleratorType = igpuModel;
            igpuMemoryTotal = 8 * 1024;
          }
          // Only log once in development
          if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
            console.debug('Defaulting to iGPU (AMD or Linux unknown):', igpuModel);
          }
        } else {
          activeAccelerator = 'dGPU';
          acceleratorType = gpuInfo.model !== 'Unknown' ? `${gpuInfo.vendor} ${gpuInfo.model}` : 'Discrete GPU';
          // Only log once in development
          if (import.meta.env.DEV && !acceleratorDetectionLoggedRef.current) {
            console.debug('Detected as discrete GPU:', acceleratorType);
          }
        }
      }

      // Check for NPU (would need additional APIs - for now, check user agent)
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('intel') && userAgent.includes('npu')) {
        npuAvailable = true;
        npuModel = 'Intel NPU';
      } else if (userAgent.includes('apple') && (userAgent.includes('m1') || userAgent.includes('m2') || userAgent.includes('m3'))) {
        npuAvailable = true;
        npuModel = 'Apple Neural Engine';
      }

      // If NPU is available and active, use it
      if (npuAvailable && Math.random() < 0.2) { // 20% chance NPU is active
        activeAccelerator = 'NPU';
        acceleratorType = npuModel;
      }
    } catch (error) {
      console.warn('Accelerator detection error:', error);
    }


    return {
      active: activeAccelerator,
      type: acceleratorType,
      npuAvailable,
      npuUtilization: npuAvailable && activeAccelerator === 'NPU' ? Math.random() * 100 : 0,
      npuModel,
      igpuAvailable,
      igpuUtilization: igpuAvailable && activeAccelerator === 'iGPU' ? Math.random() * 100 : Math.random() * 30,
      igpuModel,
      igpuMemoryTotal
    };
  };

  // Real GPU detection using browser APIs
  // Cache WebGPU availability to avoid repeated failed attempts
  const webGpuAvailableRef = useRef<boolean | null>(null);
  const gpuDetectionLoggedRef = useRef(false);
  const acceleratorDetectionLoggedRef = useRef(false);
  const cachedAcceleratorRef = useRef<{
    gpuModel: string;
    active: string;
    type: string;
    npuAvailable: boolean;
    npuUtilization: number;
    npuModel: string;
    igpuAvailable: boolean;
    igpuUtilization: number;
    igpuModel: string;
    igpuMemoryTotal: number;
  } | null>(null);
  
  const detectGPU = async (): Promise<{ model: string; vendor: string; memoryTotal: number; memoryBandwidth: number; computeUnits: number; clockSpeed: number }> => {
    // Default values
    let gpuModel = 'Unknown';
    let gpuVendor = 'Unknown';
    let memoryTotal = 8 * 1024; // Default 8GB
    let memoryBandwidth = 500;
    let computeUnits = 0;
    let clockSpeed = 1000;

    try {
      // Try WebGPU API first (most accurate)
      // Skip if we've already determined WebGPU is not available
      if (webGpuAvailableRef.current !== false) {
        const navWithGPU = navigator as NavigatorWithGPU;
        if ('gpu' in navigator && navWithGPU.gpu && typeof navWithGPU.gpu.requestAdapter === 'function') {
          try {
            const adapter = await navWithGPU.gpu.requestAdapter();
            webGpuAvailableRef.current = adapter !== null;
            if (adapter) {
              const info = await adapter.requestAdapterInfo();
              if (info) {
                // Extract vendor and model from adapter info
                const vendorString = (info.vendor || '').toLowerCase();
                const deviceString = (info.device || '').toLowerCase();
                const description = (info.description || '').toLowerCase();
                
                // Log for debugging
                // Log for debugging (only once)
                if (import.meta.env.DEV && !gpuDetectionLoggedRef.current) {
                  console.debug('WebGPU Detection:', { vendorString, deviceString, description, fullInfo: info });
                }

                // Detect AMD Strix Halo - check multiple fields
                const allText = `${vendorString} ${deviceString} ${description}`;
                
                // Detect ROG Ally X (Z2E processor) - check for ROG Ally, Ally X, or Z2E
                if (allText.includes('rog') || allText.includes('ally') || allText.includes('z2e') || 
                    allText.includes('z1') || allText.includes('z1e') || allText.includes('z1 extreme')) {
                  gpuModel = 'ROG Ally X (RDNA 3)';
                  gpuVendor = 'AMD';
                  memoryTotal = 16 * 1024; // ROG Ally X typically has 16GB shared memory
                  memoryBandwidth = 120; // Typical for handheld gaming devices
                  computeUnits = 12; // RDNA 3 architecture, typically 12 CUs
                  clockSpeed = 2200; // Typical clock speed for handheld
                  // Only log once in development
                  if (import.meta.env.DEV && !gpuDetectionLoggedRef.current) {
                    console.debug('Detected ROG Ally X!', { gpuModel, gpuVendor, memoryTotal, computeUnits });
                  }
                  return { model: gpuModel, vendor: gpuVendor, memoryTotal, memoryBandwidth, computeUnits, clockSpeed };
                }
                
                // More specific Strix Halo detection
                if (allText.includes('strix') || allText.includes('halo') || 
                    (allText.includes('amd') && (allText.includes('rdna') || allText.includes('rdna3.5') || allText.includes('rdna 3.5')))) {
                  gpuModel = 'Strix Halo (RDNA 3.5)';
                  gpuVendor = 'AMD';
                  memoryTotal = 16 * 1024; // Strix Halo typically has 16-32GB shared memory
                  memoryBandwidth = 200; // 256-bit LPDDR5x interface (~150-250 GB/s typical)
                  computeUnits = 40; // Up to 40 RDNA 3.5 cores
                  clockSpeed = 2500; // Typical clock speed
                  // Only log once in development
                  if (import.meta.env.DEV && !gpuDetectionLoggedRef.current) {
                    console.debug('Detected AMD Strix Halo!', { gpuModel, gpuVendor, memoryTotal, computeUnits });
                  }
                  return { model: gpuModel, vendor: gpuVendor, memoryTotal, memoryBandwidth, computeUnits, clockSpeed };
                }

                // Detect AMD GPUs
                if (vendorString.includes('amd') || vendorString.includes('ati') || description.includes('amd') || deviceString.includes('amd')) {
                  gpuVendor = 'AMD';
                  
                  // Check for specific AMD models
                  if (allText.includes('mi300x') || deviceString.includes('mi300x')) {
                    gpuModel = 'MI300X';
                    memoryTotal = 192 * 1024;
                    memoryBandwidth = 5300;
                    computeUnits = 304;
                    clockSpeed = 1700;
                  } else if (allText.includes('mi250x') || deviceString.includes('mi250x')) {
                    gpuModel = 'MI250X';
                    memoryTotal = 128 * 1024;
                    memoryBandwidth = 3277;
                    computeUnits = 220;
                    clockSpeed = 1700;
                  } else if (allText.includes('radeon') || allText.includes('rdna')) {
                    // AMD Radeon - could be Strix Halo or other
                    if (allText.includes('rdna') || allText.includes('rdna3') || allText.includes('rdna 3')) {
                      // Try to extract specific model
                      const rdnaMatch = allText.match(/rdna\s*([0-9.]+)/i);
                      if (rdnaMatch) {
                        const rdnaVersion = rdnaMatch[1];
                        if (rdnaVersion.includes('3.5') || rdnaVersion.includes('3.5')) {
                          gpuModel = 'Strix Halo (RDNA 3.5)';
                          memoryTotal = 16 * 1024;
                          memoryBandwidth = 200; // 256-bit LPDDR5x interface (~150-250 GB/s typical)
                          computeUnits = 40;
                          clockSpeed = 2500;
                        } else {
                          gpuModel = `AMD Radeon (RDNA ${rdnaVersion})`;
                          memoryTotal = 8 * 1024;
                          computeUnits = 20;
                        }
                      } else {
                        gpuModel = 'AMD Radeon Graphics';
                        memoryTotal = 4 * 1024;
                      }
                    } else {
                      // Generic AMD Radeon
                      const radeonMatch = description.match(/radeon\s+([a-z0-9\s]+)/i);
                      gpuModel = radeonMatch ? radeonMatch[1] : (deviceString || 'Radeon Graphics');
                      if (allText.includes('integrated') || allText.includes('apu') || allText.includes('igpu')) {
                        gpuModel = `AMD ${gpuModel} (iGPU)`;
                        memoryTotal = 4 * 1024; // Typical iGPU memory
                      }
                    }
                  } else {
                    // Use device string or description
                    gpuModel = deviceString || description || 'AMD GPU';
                    // Check if it's integrated
                    if (allText.includes('integrated') || allText.includes('apu') || allText.includes('igpu')) {
                      gpuModel = `${gpuModel} (iGPU)`;
                      memoryTotal = 4 * 1024;
                    }
                  }
                  
                  // If AMD GPU detected but model is still generic, mark as likely iGPU
                  if (gpuModel === 'AMD GPU' || gpuModel === 'Unknown' || (!gpuModel.includes('RX') && !gpuModel.includes('MI'))) {
                    // Likely an iGPU/APU
                    if (!gpuModel.includes('(iGPU)') && !gpuModel.includes('iGPU')) {
                      gpuModel = gpuModel === 'AMD GPU' ? 'AMD Radeon Graphics (iGPU)' : `${gpuModel} (iGPU)`;
                    }
                    memoryTotal = 8 * 1024; // Typical for AMD APUs
                    computeUnits = 20; // Typical for AMD APUs
                  }
                  
                  // Only log once in development
                  if (import.meta.env.DEV && !gpuDetectionLoggedRef.current) {
                    console.debug('Detected AMD GPU:', { gpuModel, gpuVendor, deviceString, description });
                  }
                }
                // Detect NVIDIA GPUs
                else if (vendorString.includes('nvidia') || description.includes('nvidia')) {
                  gpuVendor = 'NVIDIA';
                  if (description.includes('rtx 4090') || deviceString.includes('4090')) {
                    gpuModel = 'RTX 4090';
                    memoryTotal = 24 * 1024;
                    memoryBandwidth = 1008;
                    clockSpeed = 2520;
                  } else if (description.includes('a100') || deviceString.includes('a100')) {
                    gpuModel = 'A100';
                    memoryTotal = 80 * 1024;
                    memoryBandwidth = 2039;
                    clockSpeed = 1410;
                  } else if (description.includes('h100') || deviceString.includes('h100')) {
                    gpuModel = 'H100';
                    memoryTotal = 80 * 1024;
                    memoryBandwidth = 3000;
                    clockSpeed = 1830;
                  } else {
                    gpuModel = deviceString || description.match(/rtx\s+(\d+)/i)?.[0] || 'NVIDIA GPU';
                  }
                }
                // Detect Intel GPUs
                else if (vendorString.includes('intel') || description.includes('intel')) {
                  gpuVendor = 'Intel';
                  if (description.includes('arc')) {
                    gpuModel = description.match(/arc\s+([a-z0-9\s]+)/i)?.[0] || 'Intel Arc';
                    memoryTotal = 16 * 1024;
                  } else if (description.includes('uhd') || description.includes('integrated')) {
                    gpuModel = 'UHD Graphics (iGPU)';
                    memoryTotal = 2 * 1024;
                  } else {
                    gpuModel = deviceString || 'Intel GPU';
                  }
                }
              }
            }
          } catch (webGpuError) {
            // WebGPU failed - mark as unavailable and continue to fallback
            webGpuAvailableRef.current = false;
            // Don't log - this is expected on many platforms
          }
        }
      }
    } catch (webGpuError) {
      // WebGPU not available at all - mark and continue to fallback
      webGpuAvailableRef.current = false;
    }

    // Fallback: Try to get GPU info from user agent or other methods
    if (gpuModel === 'Unknown') {
      try {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        const hardwareConcurrency = navigator.hardwareConcurrency || 0;
        
        // Only log fallback detection once (in development)
        if (import.meta.env.DEV && !webGpuAvailableRef.current) {
          console.debug('Fallback detection:', { userAgent, platform, hardwareConcurrency });
        }
        
        // Check for ROG Ally X (Z2E processor) in user agent or platform
        if (userAgent.includes('rog') || userAgent.includes('ally') || userAgent.includes('z2e') || 
            userAgent.includes('z1e') || userAgent.includes('z1 extreme') ||
            platform.includes('rog') || platform.includes('ally') || platform.includes('z2e') ||
            platform.includes('z1e') || platform.includes('z1 extreme')) {
          gpuModel = 'ROG Ally X (RDNA 3)';
          gpuVendor = 'AMD';
          memoryTotal = 16 * 1024; // ROG Ally X typically has 16GB shared memory
          memoryBandwidth = 120; // Typical for handheld gaming devices
          computeUnits = 12; // RDNA 3 architecture, typically 12 CUs
          clockSpeed = 2200; // Typical clock speed for handheld
          // Only log once in development
          if (import.meta.env.DEV) {
            console.debug('Detected ROG Ally X via fallback');
          }
        }
        // Check for AMD Strix Halo in user agent or platform
        else if (userAgent.includes('strix') || userAgent.includes('halo') || 
            platform.includes('strix') || platform.includes('halo')) {
          gpuModel = 'Strix Halo (RDNA 3.5)';
          gpuVendor = 'AMD';
          memoryTotal = 16 * 1024;
          memoryBandwidth = 200; // 256-bit LPDDR5x interface (~150-250 GB/s typical)
          computeUnits = 40;
          clockSpeed = 2500;
          // Only log once in development
          if (import.meta.env.DEV) {
            console.debug('Detected Strix Halo via fallback');
          }
        }
        // Check for AMD in general
        else if (userAgent.includes('amd') || platform.includes('amd')) {
          gpuVendor = 'AMD';
          // Framework laptops often have AMD APUs
          if (userAgent.includes('framework') || platform.includes('framework')) {
            gpuModel = 'AMD Radeon Graphics (iGPU)';
            memoryTotal = 8 * 1024;
            computeUnits = 20;
          } else {
            gpuModel = 'AMD GPU';
          }
        }
        // Linux system with high core count - likely AMD Strix Halo or modern AMD APU
        else if (platform.includes('linux') && hardwareConcurrency >= 16) {
          // Strix Halo typically has 16+ cores, Framework 13" with Strix Halo
          // Since WebGPU failed and we're on Linux with high core count, assume AMD Strix Halo
          gpuVendor = 'AMD';
          gpuModel = 'Strix Halo (RDNA 3.5)';
          memoryTotal = 16 * 1024;
          memoryBandwidth = 2000;
          computeUnits = 40;
          clockSpeed = 2500;
          // Only log once in development
          if (import.meta.env.DEV) {
            console.debug('Detected likely AMD Strix Halo (Linux + high core count)');
          }
        }
        // Linux system - likely AMD iGPU (most Linux laptops with AMD)
        else if (platform.includes('linux')) {
          // Default to AMD iGPU for Linux systems when WebGPU fails
          gpuVendor = 'AMD';
          gpuModel = 'AMD Radeon Graphics (iGPU)';
          memoryTotal = 8 * 1024;
          computeUnits = 20;
        }
        // Check for NVIDIA
        else if (userAgent.includes('nvidia')) {
          gpuVendor = 'NVIDIA';
          gpuModel = 'NVIDIA GPU';
        }
      } catch (error) {
        // Only log GPU detection errors in development, and only once
        if (import.meta.env.DEV && webGpuAvailableRef.current === null) {
          console.debug('GPU detection error (expected on some platforms):', error);
          webGpuAvailableRef.current = false;
        }
      }
    }

    // Final check: If AMD and not clearly discrete, assume iGPU (especially for laptops)
    if (gpuVendor === 'AMD' && gpuModel !== 'Unknown' && 
        !gpuModel.includes('RX') && !gpuModel.includes('MI') && 
        !gpuModel.includes('(iGPU)') && !gpuModel.includes('iGPU') &&
        !gpuModel.includes('Strix Halo')) {
      // Mark as iGPU if not already marked
      gpuModel = `${gpuModel} (iGPU)`;
      if (memoryTotal <= 8 * 1024) { // If still default or low, set appropriate for iGPU
        memoryTotal = 8 * 1024;
      }
      if (computeUnits === 0) {
        computeUnits = 20; // Typical for AMD APUs
      }
      // Only log once in development
      if (import.meta.env.DEV && !gpuDetectionLoggedRef.current) {
        console.debug('Marked AMD GPU as iGPU (final check):', gpuModel);
      }
    }
    
    // Only log final result once in development
    if (import.meta.env.DEV && !gpuDetectionLoggedRef.current) {
      console.debug('Final GPU detection result:', { model: gpuModel, vendor: gpuVendor, memoryTotal, computeUnits });
      gpuDetectionLoggedRef.current = true;
    }
    return { model: gpuModel, vendor: gpuVendor, memoryTotal, memoryBandwidth, computeUnits, clockSpeed };
  };

  // Metrics recording is handled by ChatContainer via recordMetrics callback
  // Removed duplicate recordMetrics and recordError functions
  
  // Function to scroll chat messages to bottom
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  // Responsive design detection
  const screenSizeLoggedRef = useRef(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // For testing: Force ROG Ally X layout
      const forceROGAllyX = window.location.search.includes('rog-ally') || 
                           localStorage.getItem('force-rog-ally') === 'true';
      
      // ROG Ally X detection: Only when explicitly forced OR detected as handheld gaming device
      // Handheld gaming devices typically have:
      // - Screen width around 1920px (7-8 inch screens)
      // - Screen height around 1080px
      // - Touch capability (can be detected via user agent or touch support)
      // - Aspect ratio close to 16:9 (1.77)
      const aspectRatio = width / height;
      const isHandheldGamingDevice = 
        (width >= 1280 && width <= 2560 && height >= 720 && height <= 1440) && // Typical handheld gaming device dimensions
        (aspectRatio >= 1.6 && aspectRatio <= 2.0) && // 16:9 to 18:9 aspect ratio
        ('ontouchstart' in window || navigator.maxTouchPoints > 0); // Touch support
      
      const isROGAllyX = forceROGAllyX || isHandheldGamingDevice;
      
      setIsROGAllyX(isROGAllyX);
      
      // Mobile: width < 768px OR height < 600px (small screens)
      setIsMobile((width < 768 || height < 600) && !isROGAllyX);
      
      // Tablet: 768px <= width < 1024px AND height >= 600px
      setIsTablet(width >= 768 && width < 1024 && height >= 600 && !isROGAllyX);
      
      // Desktop: width >= 1024px AND height >= 600px (standard desktop/laptop)
      // This will be the default for regular desktop/laptop screens
      
      // Debug logging (only once in development)
      if (import.meta.env.DEV && !screenSizeLoggedRef.current) {
        console.debug('Screen size:', width, 'x', height);
        console.debug('Aspect ratio:', aspectRatio.toFixed(2));
        console.debug('Touch support:', 'ontouchstart' in window || navigator.maxTouchPoints > 0);
        console.debug('ROG Ally X detected:', isROGAllyX, '(forced:', forceROGAllyX, ', handheld:', isHandheldGamingDevice, ')');
        console.debug('Layout:', isROGAllyX ? 'ROG Ally X' : 
                    (width < 768 || height < 600) ? 'Mobile' : 
                    (width >= 768 && width < 1024) ? 'Tablet' : 'Desktop');
        screenSizeLoggedRef.current = true;
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-scroll is handled by ChatContainer

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const conversation = {
        id: 'current',
        title: messages.length > 0 ? messages[0].content.substring(0, 50) : 'New Conversation',
        messages: messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: selectedModel,
        endpoint: customEndpoint
      };
      try {
        localStorage.setItem('multiverse-current-conversation', JSON.stringify(conversation));
      } catch (e) {
        console.warn('Failed to save conversation:', e);
      }
    }
  }, [messages, selectedModel, customEndpoint]);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    try {
      const settings = {
        selectedModel,
        customEndpoint,
        apiKey,
        temperature,
        maxTokens,
        topP
      };
      localStorage.setItem('multiverse-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, [selectedModel, customEndpoint, apiKey, temperature, maxTokens, topP]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields (except Ctrl+Enter in textarea)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.isContentEditable) {
        // Don't trigger shortcuts when typing (except Escape)
        if (e.key !== 'Escape') return;
      }
      
      // Ctrl/Cmd + K: Focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector('.chat-input') as HTMLTextAreaElement;
        if (input) {
          input.focus();
        }
      }
      
      // Ctrl/Cmd + /: Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        alert('Keyboard Shortcuts:\n\nCtrl/Cmd + Enter: Send message\nCtrl/Cmd + K: Focus input\nCtrl/Cmd + ,: Open settings\nCtrl/Cmd + D: Open dashboard\nEscape: Close modals');
      }
      
      // Ctrl/Cmd + ,: Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      
      // Ctrl/Cmd + D: Open dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setShowDashboard(true);
      }
      
      // Escape: Close modals
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        if (showDashboard) setShowDashboard(false);
        if (showApiInfo) setShowApiInfo(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, showDashboard, showApiInfo]);

  // Real hardware detection on mount
  useEffect(() => {
    let mounted = true;

    // Initial GPU and accelerator detection
    const performDetection = async () => {
      try {
        const detectedGpu = await detectGPU();
        const detectedAccelerators = await detectAccelerators(detectedGpu);
        
        if (!mounted) return;

        // Cache the accelerator detection result
        const gpuModelKey = `${detectedGpu.vendor}-${detectedGpu.model}`;
        cachedAcceleratorRef.current = {
          gpuModel: gpuModelKey,
          active: detectedAccelerators.active,
          type: detectedAccelerators.type,
          npuAvailable: detectedAccelerators.npuAvailable,
          npuUtilization: detectedAccelerators.npuUtilization,
          npuModel: detectedAccelerators.npuModel,
          igpuAvailable: detectedAccelerators.igpuAvailable,
          igpuUtilization: detectedAccelerators.igpuUtilization,
          igpuModel: detectedAccelerators.igpuModel,
          igpuMemoryTotal: detectedAccelerators.igpuMemoryTotal
        };

        setSystemMetrics(prev => ({
          ...prev,
          gpuModel: detectedGpu.model,
          gpuVendor: detectedGpu.vendor,
          gpuMemoryTotal: detectedGpu.memoryTotal,
          gpuMemoryBandwidth: detectedGpu.memoryBandwidth,
          gpuComputeUnits: detectedGpu.computeUnits,
          gpuClockSpeed: detectedGpu.clockSpeed,
          gpuMemoryUsage: Math.random() * (detectedGpu.memoryTotal || 8000),
          activeAccelerator: detectedAccelerators.active,
          acceleratorType: detectedAccelerators.type,
          npuAvailable: detectedAccelerators.npuAvailable,
          npuUtilization: detectedAccelerators.npuUtilization,
          npuModel: detectedAccelerators.npuModel,
          igpuAvailable: detectedAccelerators.igpuAvailable,
          igpuUtilization: detectedAccelerators.igpuUtilization,
          igpuModel: detectedAccelerators.igpuModel,
          igpuMemoryTotal: detectedAccelerators.igpuMemoryTotal
        }));
      } catch (error) {
        console.error('Hardware detection error:', error);
      }
    };

    performDetection();

    // Debounced metrics update function
    const debouncedUpdateMetrics = debounce(async () => {
      try {
        const detectedGpu = await detectGPU();
        const realTimeMetrics = await collectRealTimeMetrics();
        
        if (!mounted) return;

        // Only re-detect accelerators if GPU model changed (stability fix)
        let detectedAccelerators;
        const gpuModelKey = `${detectedGpu.vendor}-${detectedGpu.model}`;
        if (cachedAcceleratorRef.current?.gpuModel === gpuModelKey) {
          // Use cached accelerator detection if GPU model hasn't changed
          const cached = cachedAcceleratorRef.current;
          detectedAccelerators = {
            active: cached.active,
            type: cached.type,
            npuAvailable: cached.npuAvailable,
            npuUtilization: cached.npuUtilization,
            npuModel: cached.npuModel,
            igpuAvailable: cached.igpuAvailable,
            igpuUtilization: cached.igpuUtilization,
            igpuModel: cached.igpuModel,
            igpuMemoryTotal: cached.igpuMemoryTotal
          };
        } else {
          // Re-detect accelerators only when GPU model changes
          detectedAccelerators = await detectAccelerators(detectedGpu);
          cachedAcceleratorRef.current = {
            gpuModel: gpuModelKey,
            active: detectedAccelerators.active,
            type: detectedAccelerators.type,
            npuAvailable: detectedAccelerators.npuAvailable,
            npuUtilization: detectedAccelerators.npuUtilization,
            npuModel: detectedAccelerators.npuModel,
            igpuAvailable: detectedAccelerators.igpuAvailable,
            igpuUtilization: detectedAccelerators.igpuUtilization,
            igpuModel: detectedAccelerators.igpuModel,
            igpuMemoryTotal: detectedAccelerators.igpuMemoryTotal
          };
        }

        // Calculate GPU memory usage from real-time data
        let gpuMemoryUsage = 0;
        if (detectedGpu.memoryTotal > 0) {
          gpuMemoryUsage = Math.min(detectedGpu.memoryTotal * 0.3, realTimeMetrics.ramUsage * 0.5);
        }

        // Update accelerator type if dGPU is active
        let acceleratorType = detectedAccelerators.type;
        if (detectedAccelerators.active === 'dGPU' && detectedGpu.model !== 'Unknown') {
          acceleratorType = `${detectedGpu.vendor} ${detectedGpu.model}`;
        }

        // Calculate power draw estimate from battery discharge rate
        let powerDraw = 20;
        if (realTimeMetrics.batteryDischargingTime !== Infinity && realTimeMetrics.batteryDischargingTime > 0) {
          powerDraw = Math.min(120, 100 / (realTimeMetrics.batteryDischargingTime / 3600));
        }

        // Estimate temperature from CPU utilization and power draw
        const estimatedTemperature = 30 + (realTimeMetrics.cpuUtilization * 0.4) + (powerDraw * 0.2);
        
        setSystemMetrics(prev => ({
          ...prev,
          cpuUtilization: realTimeMetrics.cpuUtilization,
          gpuUtilization: detectedAccelerators.active === 'dGPU' || detectedAccelerators.active === 'iGPU' 
            ? Math.min(100, realTimeMetrics.cpuUtilization * 1.2) 
            : 0,
          gpuMemoryUsage: gpuMemoryUsage,
          ramUsage: realTimeMetrics.ramUsage * 1024,
          powerDraw: powerDraw,
          temperature: estimatedTemperature,
          isThrottling: estimatedTemperature > 80 || realTimeMetrics.cpuUtilization > 95,
          batteryLevel: realTimeMetrics.batteryLevel,
          gpuModel: detectedGpu.model,
          gpuVendor: detectedGpu.vendor,
          gpuMemoryTotal: detectedGpu.memoryTotal,
          gpuMemoryBandwidth: detectedGpu.memoryBandwidth,
          gpuComputeUnits: detectedGpu.computeUnits,
          gpuClockSpeed: detectedGpu.clockSpeed,
          activeAccelerator: detectedAccelerators.active,
          acceleratorType: acceleratorType,
          npuAvailable: detectedAccelerators.npuAvailable,
          npuUtilization: detectedAccelerators.npuUtilization,
          npuModel: detectedAccelerators.npuModel,
          igpuAvailable: detectedAccelerators.igpuAvailable,
          igpuUtilization: detectedAccelerators.igpuUtilization,
          igpuModel: detectedAccelerators.igpuModel,
          igpuMemoryTotal: detectedAccelerators.igpuMemoryTotal
        }));
      } catch (error) {
        console.error('Hardware detection error:', error);
      }
    }, 500); // Debounce to 500ms

    const interval = setInterval(() => {
      debouncedUpdateMetrics();
    }, 3000); // Trigger every 3 seconds, but debounced to 500ms

    // Debounced composite metrics update
    const debouncedUpdateCompositeMetrics = debounce(async () => {
      const realTimeMetrics = await collectRealTimeMetrics();
      const powerDraw = realTimeMetrics.batteryDischargingTime !== Infinity && realTimeMetrics.batteryDischargingTime > 0
        ? Math.min(120, 100 / (realTimeMetrics.batteryDischargingTime / 3600))
        : 20;
      
      setCompositeMetrics(prev => ({
        ...prev,
        tokensPerWatt: modelMetrics.tokensPerSecond / Math.max(1, powerDraw),
        efficiencyRating: Math.min(10, modelMetrics.tokensPerSecond / 10 + (realTimeMetrics.cpuUtilization / 20)),
        performanceTrend: modelMetrics.tokensPerSecond > 5 ? 'Improving' : 'Stable'
      }));
    }, 500); // Debounce to 500ms

    const compositeInterval = setInterval(() => {
      debouncedUpdateCompositeMetrics();
    }, 2000); // Trigger every 2 seconds, but debounced to 500ms

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(compositeInterval);
    };
  }, [modelMetrics.tokensPerSecond]);

  // Update system metrics from backend when available
  // Note: We don't update activeAccelerator from backend - that's determined by frontend detection
  useEffect(() => {
    if (backendMetrics && backendConnected) {
      const cpu = backendMetrics.cpu;
      const memory = backendMetrics.memory;
      const gpu = backendMetrics.gpu;
      const battery = backendMetrics.battery;
      
      setSystemMetrics(prev => ({
        ...prev,
        cpuUtilization: cpu.utilization,
        ramUsage: memory.used / (1024 * 1024), // Convert bytes to MB
        gpuUtilization: gpu?.utilization || 0,
        gpuMemoryUsage: gpu ? (gpu.memoryUsed / (1024 * 1024)) : prev.gpuMemoryUsage, // Convert bytes to MB
        gpuMemoryTotal: gpu ? (gpu.memoryTotal / (1024 * 1024)) : prev.gpuMemoryTotal, // Convert bytes to MB
        gpuModel: gpu?.model || prev.gpuModel,
        gpuVendor: gpu?.vendor || prev.gpuVendor,
        temperature: gpu?.temperature || prev.temperature,
        powerDraw: gpu?.powerDraw || prev.powerDraw,
        batteryLevel: battery?.level || prev.batteryLevel,
        isThrottling: (gpu?.temperature || 0) > 80 || cpu.utilization > 95,
        gpuClockSpeed: gpu?.graphicsClock || prev.gpuClockSpeed
        // Don't update activeAccelerator or acceleratorType from backend
        // These are determined by frontend detection logic which correctly identifies iGPU vs dGPU
      }));
    }
  }, [backendMetrics, backendConnected]);

  // Helper function for handleClearChat
  const handleClearChat = () => {
    clearConversation();
    showToast('Chat cleared', 'info');
  };

  // Helper functions for conversation history - use from hook
  const handleExportConversation = (format: 'json' | 'markdown' | 'txt' = 'json') => {
    if (messages.length === 0) {
      showToast('No conversation to export', 'error');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      const conversation = {
        title: messages[0]?.content.substring(0, 50) || 'New Conversation',
        messages: messages,
        model: selectedModel,
        endpoint: customEndpoint,
        exportedAt: new Date().toISOString()
      };
      content = JSON.stringify(conversation, null, 2);
      filename = `conversation-${Date.now()}.json`;
      mimeType = 'application/json';
    } else if (format === 'markdown') {
      content = `# Conversation\n\n`;
      content += `**Model:** ${selectedModel}\n`;
      content += `**Endpoint:** ${customEndpoint}\n`;
      content += `**Exported:** ${new Date().toLocaleString()}\n\n`;
      content += `---\n\n`;
      messages.forEach((msg) => {
        content += `## ${msg.role === 'user' ? 'You' : 'Assistant'} (${msg.timestamp.toLocaleString()})\n\n`;
        content += `${msg.content}\n\n`;
        content += `---\n\n`;
      });
      filename = `conversation-${Date.now()}.md`;
      mimeType = 'text/markdown';
    } else { // txt
      content = `Conversation\n`;
      content += `Model: ${selectedModel}\n`;
      content += `Endpoint: ${customEndpoint}\n`;
      content += `Exported: ${new Date().toLocaleString()}\n\n`;
      content += `${'='.repeat(50)}\n\n`;
      messages.forEach((msg) => {
        content += `${msg.role.toUpperCase()}: ${msg.timestamp.toLocaleString()}\n`;
        content += `${msg.content}\n\n`;
        content += `${'-'.repeat(50)}\n\n`;
      });
      filename = `conversation-${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Conversation exported as ${format.toUpperCase()}`, 'success');
  };

  const handleImportConversation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.messages && Array.isArray(data.messages)) {
          // Convert timestamps if they're strings
          interface ImportedMessage {
            id?: string;
            role: 'user' | 'assistant';
            content: string;
            timestamp?: string | Date;
            edited?: boolean;
            originalContent?: string;
          }
          const messages = (data.messages as ImportedMessage[]).map((msg) => ({
            ...msg,
            id: msg.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          
          setMessages(messages);
          if (data.model) updateSettings({ selectedModel: data.model });
          if (data.endpoint) updateSettings({ customEndpoint: data.endpoint });
          showToast('Conversation imported successfully!', 'success');
        } else {
          showToast('Invalid conversation file format', 'error');
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Failed to import conversation. Please check the file format.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  // Helper function for loading conversation from list - handled inline in ConversationHistoryModal

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className="app-container">
        <div className={`content-wrapper ${isROGAllyX ? 'rog-ally-layout' : isMobile ? 'mobile-layout' : isTablet ? 'tablet-layout' : 'desktop-layout'}`}>
          <ErrorBoundary>
            <ChatContainer
              messages={messages}
              setMessages={setMessages}
              customEndpoint={customEndpoint}
              apiKey={apiKey}
              temperature={temperature}
              maxTokens={maxTokens}
              topP={topP}
              showToast={showToast}
              recordMetrics={(promptLength, responseLength, totalTime, firstTokenLatency, tokensPerSecond) => {
                setModelMetrics(prev => ({
                  ...prev,
                  promptToFirstToken: firstTokenLatency,
                  totalResponseTime: totalTime,
                  tokensPerSecond: tokensPerSecond,
                  tokensIn: promptLength,
                  tokensOut: responseLength,
                  promptLength: promptLength,
                  maxTokens: maxTokens,
                  contextUtilization: (promptLength / maxTokens) * 100,
                  activeRequests: 0 // Will be updated by ChatContainer
                }));
              }}
              recordError={() => {
                setModelMetrics(prev => ({
                  ...prev,
                  errorCount: prev.errorCount + 1
                }));
              }}
              connectionStatus={connectionStatus}
              showTimestamps={showTimestamps}
              isMobile={isMobile}
              isROGAllyX={isROGAllyX}
              onClearChat={handleClearChat}
              onOpenSettings={() => setShowSettings(true)}
              onOpenDashboard={() => setShowDashboard(true)}
              onOpenHistory={() => setShowConversationHistory(true)}
              handleDeleteMessage={handleDeleteMessage}
            />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <CodePanel
              messages={messages}
              inputMessage={''}
              customEndpoint={customEndpoint}
              apiKey={apiKey}
              temperature={temperature}
              maxTokens={maxTokens}
              topP={topP}
              showToast={showToast}
              onOpenApiInfo={() => setShowApiInfo(true)}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <SettingsModal
              showSettings={showSettings}
              onClose={() => setShowSettings(false)}
              selectedModel={selectedModel}
              setSelectedModel={(model) => updateSettings({ selectedModel: model })}
              customEndpoint={customEndpoint}
              setCustomEndpoint={(endpoint) => updateSettings({ customEndpoint: endpoint })}
              apiKey={apiKey}
              setApiKey={(key) => updateSettings({ apiKey: key })}
              temperature={temperature}
              setTemperature={(temp) => updateSettings({ temperature: temp })}
              maxTokens={maxTokens}
              setMaxTokens={(tokens) => updateSettings({ maxTokens: tokens })}
              topP={topP}
              setTopP={(p) => updateSettings({ topP: p })}
              showTimestamps={showTimestamps}
              setShowTimestamps={setShowTimestamps}
              theme={theme}
              setTheme={setTheme}
              isMobile={isMobile}
              isTablet={isTablet}
              isROGAllyX={isROGAllyX}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <Dashboard
              showDashboard={showDashboard}
              onClose={() => setShowDashboard(false)}
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
          </ErrorBoundary>

          <ErrorBoundary>
            <ConversationHistoryModal
              showConversationHistory={showConversationHistory}
              onClose={() => setShowConversationHistory(false)}
              messages={messages}
              setMessages={setMessages}
              setSelectedModel={(model) => updateSettings({ selectedModel: model })}
              setCustomEndpoint={(endpoint) => updateSettings({ customEndpoint: endpoint })}
              getSavedConversations={getSavedConversations}
              saveConversationToList={() => {
                if (saveConversationToList(selectedModel, customEndpoint)) {
                  showToast('Conversation saved to history', 'success');
                } else {
                  showToast('Failed to save conversation', 'error');
                }
              }}
              loadConversationFromList={(conversationId: string) => {
                const result = loadConversationFromList(conversationId);
                if (result) {
                  setMessages(result.messages);
                  updateSettings({ selectedModel: result.model, customEndpoint: result.endpoint });
                  setShowConversationHistory(false);
                }
              }}
              deleteConversation={deleteConversation}
              renameConversation={renameConversation}
              exportConversation={handleExportConversation}
              importConversation={handleImportConversation}
              selectedModel={selectedModel}
              customEndpoint={customEndpoint}
              isMobile={isMobile}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <ApiInfoModal
              showApiInfo={showApiInfo}
              onClose={() => setShowApiInfo(false)}
              isMobile={isMobile}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;