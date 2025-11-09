import { useState, useEffect } from 'react';

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
      console.warn('Failed to load theme:', e);
    }
    return 'dark';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme());

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('multiverse-theme', theme);
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    setTheme
  };
};

