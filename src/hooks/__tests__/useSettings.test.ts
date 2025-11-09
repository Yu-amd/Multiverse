import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from '../useSettings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.settings.selectedModel).toBe('LM Studio (Local)');
    expect(result.current.settings.customEndpoint).toBe('http://localhost:1234');
    expect(result.current.settings.temperature).toBe(0.7);
    expect(result.current.settings.maxTokens).toBe(2048);
    expect(result.current.settings.topP).toBe(0.9);
  });

  it('should load settings from localStorage', () => {
    const savedSettings = {
      selectedModel: 'Ollama',
      customEndpoint: 'http://localhost:11434',
      apiKey: 'test-key',
      temperature: 0.8,
      maxTokens: 4096,
      topP: 0.95
    };
    // Clear localStorage first, then set it BEFORE rendering the hook
    localStorage.clear();
    localStorage.setItem('multiverse-settings', JSON.stringify(savedSettings));

    const { result } = renderHook(() => useSettings());
    
    // Settings should be loaded from localStorage in initial state (loadSettings is called during useState)
    expect(result.current.settings.selectedModel).toBe('Ollama');
    expect(result.current.settings.customEndpoint).toBe('http://localhost:11434');
  });

  it('should update settings', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.updateSettings({ temperature: 0.9 });
    });

    expect(result.current.settings.temperature).toBe(0.9);
    expect(result.current.settings.selectedModel).toBe('LM Studio (Local)'); // Other settings unchanged
  });

  it('should save settings to localStorage on update', async () => {
    localStorage.clear();
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.updateSettings({ temperature: 0.9 });
    });

    expect(result.current.settings.temperature).toBe(0.9);
    
    // Wait for useEffect to save to localStorage
    // useEffect runs after render, so we need to wait
    await act(async () => {
      // Wait a tick for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const saved = JSON.parse(localStorage.getItem('multiverse-settings') || '{}');
    expect(saved.temperature).toBe(0.9);
  });

  it('should handle partial updates', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.updateSettings({ 
        selectedModel: 'Custom',
        customEndpoint: 'http://example.com'
      });
    });

    expect(result.current.settings.selectedModel).toBe('Custom');
    expect(result.current.settings.customEndpoint).toBe('http://example.com');
    expect(result.current.settings.temperature).toBe(0.7); // Unchanged
  });

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => useSettings());
    
    // Should still return default settings
    expect(result.current.settings.selectedModel).toBe('LM Studio (Local)');
    
    getItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

