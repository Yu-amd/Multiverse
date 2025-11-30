import { useEffect, useState, useRef } from 'react';
import { logger } from '../utils/logger';
import { validateMetricsMessage } from '../schemas/metrics';

interface BackendMetrics {
  timestamp: string;
  cpu: {
    utilization: number;
    cores: number;
    frequency: number | null;
    maxFrequency: number | null;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
    swapTotal: number;
    swapUsed: number;
    swapPercent: number;
  };
  gpu: {
    model: string;
    vendor: string;
    memoryTotal: number;
    memoryUsed: number;
    memoryFree: number;
    memoryPercent: number;
    utilization: number;
    memoryUtilization: number;
    temperature: number;
    powerDraw: number | null;
    graphicsClock: number | null;
    memoryClock: number | null;
  } | null;
  battery: {
    level: number;
    charging: boolean;
    timeRemaining: number | null;
  } | null;
}

interface UseBackendMetricsOptions {
  backendUrl?: string;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Hook to connect to backend metrics service via WebSocket
 */
export const useBackendMetrics = (options: UseBackendMetricsOptions = {}) => {
  const { backendUrl = 'http://localhost:8000', enabled = true, onError } = options;
  const [metrics, setMetrics] = useState<BackendMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!enabled) return;

    try {
      const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/metrics';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (reconnectAttempts.current > 0) {
          logger.log('[Backend Metrics] WebSocket reconnected successfully');
        } else {
          logger.log('[Backend Metrics] WebSocket connected');
        }
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          // Validate with Zod schema
          const validatedData = validateMetricsMessage(rawData);
          if (validatedData.type === 'metrics' && validatedData.data) {
            // Convert validated data to BackendMetrics format
            const metricsData = validatedData.data;
            setMetrics({
              timestamp: new Date().toISOString(),
              cpu: {
                utilization: metricsData.cpu?.utilization ?? 0,
                cores: metricsData.cpu?.cores ?? 0,
                frequency: metricsData.cpu?.frequency ?? null,
                maxFrequency: metricsData.cpu?.frequency ?? null
              },
              memory: {
                total: metricsData.memory?.total ?? 0,
                used: metricsData.memory?.used ?? 0,
                available: metricsData.memory?.available ?? 0,
                percent: metricsData.memory?.percentage ?? 0,
                swapTotal: 0,
                swapUsed: 0,
                swapPercent: 0
              },
              gpu: metricsData.gpu ? {
                model: metricsData.gpu.model ?? 'Unknown',
                vendor: metricsData.gpu.vendor ?? 'Unknown',
                memoryTotal: metricsData.gpu.memory_total ?? 0,
                memoryUsed: metricsData.gpu.memory_used ?? 0,
                memoryFree: (metricsData.gpu.memory_total ?? 0) - (metricsData.gpu.memory_used ?? 0),
                memoryPercent: metricsData.gpu.memory_used && metricsData.gpu.memory_total 
                  ? (metricsData.gpu.memory_used / metricsData.gpu.memory_total) * 100 
                  : 0,
                utilization: metricsData.gpu.utilization ?? 0,
                memoryUtilization: metricsData.gpu.memory_used && metricsData.gpu.memory_total 
                  ? (metricsData.gpu.memory_used / metricsData.gpu.memory_total) * 100 
                  : 0,
                temperature: metricsData.gpu.temperature ?? 0,
                powerDraw: metricsData.gpu.power_draw ?? null,
                graphicsClock: metricsData.gpu.clock_speed ?? null,
                memoryClock: null
              } : null,
              battery: metricsData.battery ? {
                level: metricsData.battery.level ?? 100,
                charging: metricsData.battery.charging ?? false,
                timeRemaining: metricsData.battery.discharging_time ?? null
              } : null
            });
          } else if (validatedData.type === 'error') {
            logger.error('[Backend Metrics] Error from backend:', validatedData.error);
          }
        } catch (e) {
          logger.error('[Backend Metrics] Failed to parse or validate metrics:', e);
          if (e instanceof Error && e.message.includes('Invalid metrics')) {
            logger.error('[Backend Metrics] Backend returned invalid payload. Check backend implementation.');
          }
        }
      };

      ws.onerror = () => {
        // Only log if we're not already in a reconnection attempt
        // This reduces noise from initial connection failures
        if (reconnectAttempts.current === 0) {
          const wsState = ws.readyState;
          const stateNames: { [key: number]: string } = {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING',
            3: 'CLOSED'
          };
          logger.warn(
            `[Backend Metrics] WebSocket connection error (will retry):`,
            `State: ${stateNames[wsState] || wsState}`,
            `URL: ${wsUrl}`,
            `Is backend running? Check http://localhost:8000/api/health`
          );
        }
        const err = new Error('WebSocket connection error');
        setError(err);
        if (onError) onError(err);
      };

      ws.onclose = (event) => {
        // Only log if it wasn't a clean close or if we're not in initial connection
        if (event.code !== 1000 || reconnectAttempts.current === 0) {
          logger.log('[Backend Metrics] WebSocket closed', event.code !== 1000 ? '(unexpected)' : '');
        }
        setConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          // Only log reconnection attempts, not the initial connection failure
          if (reconnectAttempts.current > 1) {
            logger.log(`[Backend Metrics] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          logger.warn('[Backend Metrics] Max reconnection attempts reached. Backend metrics unavailable - using browser metrics.');
          const err = new Error('Failed to connect to metrics service after multiple attempts');
          setError(err);
          if (onError) onError(err);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      logger.error('[Backend Metrics] Failed to create WebSocket:', e);
      const err = e instanceof Error ? e : new Error('Failed to create WebSocket connection');
      setError(err);
      if (onError) onError(err);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      // Only close if not already closed
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnected(false);
    // Don't reset reconnectAttempts here - let it continue trying
  };

  useEffect(() => {
    if (enabled) {
      // Small delay to avoid immediate disconnect in React StrictMode
      const timeoutId = setTimeout(() => {
        connect();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        disconnect();
      };
    } else {
      disconnect();
      return () => {};
    }
  }, [enabled, backendUrl]);

  // Fetch metrics via HTTP as fallback
  const fetchMetrics = async (): Promise<BackendMetrics | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json() as BackendMetrics;
      return data;
    } catch (e) {
      logger.error('[Backend Metrics] Failed to fetch metrics:', e);
      return null;
    }
  };

  return {
    metrics,
    connected,
    error,
    reconnect: connect,
    disconnect,
    fetchMetrics
  };
};
