import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';

describe('Settings Persistence Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist settings across page reloads', async () => {
    const { result, unmount } = renderHook(() => useSettings());
    
    // Update settings
    act(() => {
      result.current.updateSettings({
        selectedModel: 'Ollama',
        customEndpoint: 'http://localhost:11434',
        temperature: 0.8
      });
    });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('multiverse-settings') || '{}');
      expect(saved.selectedModel).toBe('Ollama');
      expect(saved.customEndpoint).toBe('http://localhost:11434');
      expect(saved.temperature).toBe(0.8);
    });

    // Unmount and remount to simulate page reload
    unmount();
    
    const { result: newResult } = renderHook(() => useSettings());
    
    // Settings should be loaded from localStorage
    expect(newResult.current.settings.selectedModel).toBe('Ollama');
    expect(newResult.current.settings.customEndpoint).toBe('http://localhost:11434');
    expect(newResult.current.settings.temperature).toBe(0.8);
  });

  it('should persist theme across page reloads', async () => {
    const { result, unmount } = renderHook(() => useTheme());
    
    // Change theme
    act(() => {
      result.current.setTheme('light');
    });

    await waitFor(() => {
      expect(localStorage.getItem('multiverse-theme')).toBe('light');
    });

    // Unmount and remount to simulate page reload
    unmount();
    
    const { result: newResult } = renderHook(() => useTheme());
    
    // Theme should be loaded from localStorage
    expect(newResult.current.theme).toBe('light');
  });

  it('should handle partial settings updates', async () => {
    const { result } = renderHook(() => useSettings());
    
    // Set initial settings
    act(() => {
      result.current.updateSettings({
        selectedModel: 'LM Studio',
        temperature: 0.7
      });
    });

    // Update only temperature
    act(() => {
      result.current.updateSettings({
        temperature: 0.9
      });
    });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('multiverse-settings') || '{}');
      expect(saved.selectedModel).toBe('LM Studio');
      expect(saved.temperature).toBe(0.9);
    });
  });
});

