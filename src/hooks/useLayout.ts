import { useState, useEffect } from 'react';

/**
 * Hook to manage global layout settings (ROG Ally X layout)
 * This hook provides a global state that can be used across all pages
 */
export const useLayout = () => {
  const [forceROGAlly, setForceROGAllyState] = useState(() => {
    return localStorage.getItem('force-rog-ally') === 'true';
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isROGAllyX, setIsROGAllyX] = useState(false);

  // Update layout detection when forceROGAlly changes
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const isROG = navigator.userAgent.includes('ROG') || (width >= 1920 && width <= 1920);
      const isMobileDevice = width < 768;
      const isTabletDevice = width >= 768 && width < 1024;
      
      setIsMobile(isMobileDevice);
      setIsTablet(isTabletDevice);
      setIsROGAllyX(isROG || forceROGAlly);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [forceROGAlly]);

  // Apply ROG layout class to document root for global styling
  useEffect(() => {
    if (isROGAllyX) {
      document.documentElement.classList.add('rog-ally-layout');
    } else {
      document.documentElement.classList.remove('rog-ally-layout');
    }
  }, [isROGAllyX]);

  const setForceROGAlly = (value: boolean) => {
    setForceROGAllyState(value);
    localStorage.setItem('force-rog-ally', value.toString());
    // Immediately update layout detection
    const width = window.innerWidth;
    const isROG = navigator.userAgent.includes('ROG') || (width >= 1920 && width <= 1920);
    setIsROGAllyX(isROG || value);
  };

  return {
    forceROGAlly,
    setForceROGAlly,
    isMobile,
    isTablet,
    isROGAllyX,
  };
};

