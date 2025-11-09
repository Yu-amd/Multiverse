import { useState, useEffect } from 'react';

export const useConnection = (endpoint: string, apiKey: string) => {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('online');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus('checking');
        // Try to ping the endpoint with a simple request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          await fetch(`${endpoint}/v1/models`, { 
            method: 'GET',
            signal: controller.signal,
            headers: {
              ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
            }
          });
          clearTimeout(timeoutId);
          // If we get any response (even 404), we're connected
          setConnectionStatus('online');
        } catch (fetchError) {
          clearTimeout(timeoutId);
          // If it's a network error, we're offline
          if (fetchError instanceof Error && (fetchError.name === 'TypeError' || fetchError.name === 'AbortError')) {
            setConnectionStatus('offline');
          } else {
            // Other errors might mean the endpoint is reachable but returned an error
            setConnectionStatus('online');
          }
        }
      } catch (error) {
        setConnectionStatus('offline');
      }
    };

    // Check on mount and when endpoint changes
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    // Also listen to browser online/offline events
    const handleOnline = () => {
      setConnectionStatus('online');
      checkConnection();
    };
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [endpoint, apiKey]);

  return connectionStatus;
};

