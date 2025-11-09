import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should default to dark theme', () => {
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should load theme from localStorage', () => {
    // Clear localStorage first, then set it BEFORE rendering the hook
    localStorage.clear();
    localStorage.setItem('multiverse-theme', 'light');
    
    const { result } = renderHook(() => useTheme());
    
    // Theme should be loaded from localStorage in initial state (loadTheme is called during useState)
    expect(result.current.theme).toBe('light');
    // Wait for useEffect to apply theme to document
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should update theme', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should save theme to localStorage on update', async () => {
    localStorage.clear();
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    
    // Wait for useEffect to save to localStorage
    // useEffect runs after render, so we need to wait
    await act(async () => {
      // Wait a tick for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(localStorage.getItem('multiverse-theme')).toBe('light');
  });

  it('should apply theme to document element', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    
    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should detect system preference when no saved theme', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    window.matchMedia = matchMediaMock;
    localStorage.clear();

    const { result } = renderHook(() => useTheme());
    
    // Should detect light theme from system preference
    expect(result.current.theme).toBe('light');
  });
});

