import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface Settings {
  selectedModel: string;
  aimModelId: string;
  customEndpoint: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  thinkingGestureEnabled: boolean;
}

const defaultSettings: Settings = {
  selectedModel: 'LM Studio (Local)',
  aimModelId: '',
  customEndpoint: 'http://localhost:1234',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  thinkingGestureEnabled: true
};

export const useSettings = () => {
  const loadSettings = (): Settings => {
    try {
      const saved = localStorage.getItem('multiverse-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return {
          selectedModel: settings.selectedModel || defaultSettings.selectedModel,
          aimModelId: settings.aimModelId || defaultSettings.aimModelId,
          customEndpoint: settings.customEndpoint || defaultSettings.customEndpoint,
          apiKey: settings.apiKey || defaultSettings.apiKey,
          temperature: settings.temperature ?? defaultSettings.temperature,
          maxTokens: settings.maxTokens ?? defaultSettings.maxTokens,
          topP: settings.topP ?? defaultSettings.topP,
          thinkingGestureEnabled:
            settings.thinkingGestureEnabled ?? defaultSettings.thinkingGestureEnabled
        };
      }
    } catch (e) {
      logger.warn('Failed to load settings:', e);
    }
    return defaultSettings;
  };

  const [settings, setSettings] = useState<Settings>(loadSettings());

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('multiverse-settings', JSON.stringify(settings));
    } catch (e) {
      logger.warn('Failed to save settings:', e);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return {
    settings,
    updateSettings,
    setSettings
  };
};

