/**
 * Hook for configurable and adaptive metrics sampling
 * Auto-adapts sampling interval based on page visibility and battery saver mode
 */

import { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

export type SamplingInterval = 0.5 | 1 | 2; // seconds

interface UseMetricsSamplingOptions {
  defaultInterval?: SamplingInterval;
  enabled?: boolean;
  onIntervalChange?: (interval: SamplingInterval) => void;
}

export const useMetricsSampling = (options: UseMetricsSamplingOptions = {}) => {
  const { defaultInterval = 1, enabled = true, onIntervalChange } = options;
  const [currentInterval, setCurrentInterval] = useState<SamplingInterval>(defaultInterval);
  const [isBackground, setIsBackground] = useState(false);
  const [isBatterySaver, setIsBatterySaver] = useState(false);
  const visibilityRef = useRef<boolean>(true);
  const batteryRef = useRef<any | null>(null); // BatteryManager type not available in all browsers

  // Detect page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      visibilityRef.current = !isHidden;
      setIsBackground(isHidden);
      
      // Adjust interval based on visibility
      if (isHidden) {
        // Background: use longer interval (2s)
        setCurrentInterval(2);
        if (onIntervalChange) onIntervalChange(2);
      } else {
        // Foreground: use default or battery-aware interval
        const newInterval = isBatterySaver ? 2 : defaultInterval;
        setCurrentInterval(newInterval);
        if (onIntervalChange) onIntervalChange(newInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleVisibilityChange(); // Initial check

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [defaultInterval, isBatterySaver, onIntervalChange]);

  // Detect battery saver mode
  useEffect(() => {
    const checkBatterySaver = async () => {
      try {
        // Check if Battery Status API is available
        if ('getBattery' in navigator && typeof (navigator as any).getBattery === 'function') {
          const battery = await (navigator as any).getBattery();
          batteryRef.current = battery;
          
          const updateBatteryState = () => {
            const charging = battery.charging;
            const level = battery.level;
            // Consider battery saver if level < 20% or if explicitly set
            const saverMode = level < 0.2 || (!charging && level < 0.5);
            setIsBatterySaver(saverMode);
            
            // Adjust interval based on battery state
            if (saverMode && !isBackground) {
              setCurrentInterval(2); // Use longer interval when battery is low
              if (onIntervalChange) onIntervalChange(2);
            } else if (!isBackground) {
              setCurrentInterval(defaultInterval);
              if (onIntervalChange) onIntervalChange(defaultInterval);
            }
          };
          
          battery.addEventListener('chargingchange', updateBatteryState);
          battery.addEventListener('levelchange', updateBatteryState);
          updateBatteryState();
          
          return () => {
            battery.removeEventListener('chargingchange', updateBatteryState);
            battery.removeEventListener('levelchange', updateBatteryState);
          };
        }
      } catch (error) {
        // Battery API not available or failed
        logger.debug('Battery API not available:', error);
      }
    };

    if (enabled) {
      checkBatterySaver();
    }
  }, [enabled, defaultInterval, isBackground, onIntervalChange]);

  return {
    currentInterval,
    isBackground,
    isBatterySaver,
    samplingIntervalMs: currentInterval * 1000
  };
};

