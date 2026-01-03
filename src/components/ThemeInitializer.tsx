import { useEffect } from 'react';

/**
 * Component to initialize theme and layout on app load
 * This ensures the theme and layout are applied immediately, before any components render
 * We use direct DOM manipulation here to avoid hook order issues
 */
// Initialize theme synchronously BEFORE React renders
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
    // Ignore errors
  }
  return 'dark';
};

// Apply theme immediately on module load (before React)
const initialTheme = loadTheme();
document.documentElement.setAttribute('data-theme', initialTheme);

export const ThemeInitializer: React.FC = () => {
  // Initialize theme immediately on mount (before React renders)
  useEffect(() => {
    const theme = loadTheme();
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', theme);
    // Force a reflow to ensure CSS is applied
    void document.documentElement.offsetHeight;
  }, []);

  // Initialize layout immediately on mount
  useEffect(() => {
    const forceROGAlly = localStorage.getItem('force-rog-ally') === 'true';
    const width = window.innerWidth;
    const isROG = navigator.userAgent.includes('ROG') || (width >= 1920 && width <= 1920);
    const isROGAllyX = isROG || forceROGAlly;

    if (isROGAllyX) {
      document.documentElement.classList.add('rog-ally-layout');
    } else {
      document.documentElement.classList.remove('rog-ally-layout');
    }
  }, []);

  return null;
};

