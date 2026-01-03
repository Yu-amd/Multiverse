import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export const useTheme = () => {
  const loadTheme = (): 'light' | 'dark' => {
    try {
      const saved = localStorage.getItem('multiverse-theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e) {
      logger.warn('Failed to load theme:', e);
    }
    return 'dark';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme());

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('multiverse-theme', theme);
    } catch (e) {
      logger.warn('Failed to save theme:', e);
    }
  }, [theme]);

  // Apply theme to document immediately on mount
  useEffect(() => {
    const initialTheme = loadTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);
    // Force a reflow to ensure CSS is applied
    void document.documentElement.offsetHeight;
  }, []);

  // Apply theme to document whenever it changes - SYNCHRONOUSLY
  useEffect(() => {
    // Apply immediately
    document.documentElement.setAttribute('data-theme', theme);
    // Force style recalculation
    const style = window.getComputedStyle(document.documentElement);
    void style.backgroundColor; // Force reflow
    // Also update all CSS custom properties directly as a fallback
    const root = document.documentElement;
    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#fafbfc');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--text-primary', '#0d1117');
      root.style.setProperty('--text-secondary', '#424a53');
    } else {
      root.style.setProperty('--bg-primary', '#0f0f0f');
      root.style.setProperty('--bg-secondary', '#1a1a1a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#a0a0a0');
    }
  }, [theme]);

  return {
    theme,
    setTheme
  };
};

