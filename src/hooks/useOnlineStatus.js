import { useState, useEffect } from 'react';

/**
 * Online Status Hook
 * Detects and monitors network connectivity status
 *
 * Uses multiple detection methods:
 * - navigator.onLine API
 * - online/offline events
 * - Network change events
 *
 * @returns {Object} - { isOnline, isOffline }
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    // Initial state from navigator.onLine
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    // Update online status
    const handleOnline = () => {
      setIsOnline(true);
    };

    // Update offline status
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen for network change events (more reliable on some browsers)
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (connection) {
        const handleConnectionChange = () => {
          // Check if we're actually online even though connection changed
          setIsOnline(navigator.onLine);
        };

        connection.addEventListener('change', handleConnectionChange);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          connection.removeEventListener('change', handleConnectionChange);
        };
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Additional check: periodically verify online status by attempting a lightweight request
  // This helps detect "lying" browsers that report online but have no actual connectivity
  useEffect(() => {
    if (!isOnline) return; // Skip if already offline

    const verifyConnection = async () => {
      try {
        // Try to fetch a tiny resource with no-cache to verify real connectivity
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });

        // If we get here, we're definitely online
        if (!isOnline) {
          setIsOnline(true);
        }
      } catch (error) {
        // Failed to fetch - we might be offline despite navigator.onLine saying otherwise
        if (isOnline && !navigator.onLine) {
          setIsOnline(false);
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(verifyConnection, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return {
    isOnline,
    isOffline: !isOnline
  };
};

export default useOnlineStatus;
