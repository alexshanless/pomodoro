import React, { createContext, useContext, useCallback } from 'react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineContext = createContext({});

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const { isOnline, isOffline } = useOnlineStatus();

  const handleSync = useCallback((count) => {
    console.log(`Syncing ${count} queued requests...`);
  }, []);

  const handleSyncComplete = useCallback((results) => {
    console.log('Sync complete:', {
      succeeded: results.succeeded.length,
      failed: results.failed.length
    });

    if (results.succeeded.length > 0) {
      // Show success notification (could integrate with a toast system)
      console.log(`Successfully synced ${results.succeeded.length} changes`);
    }
  }, []);

  const handleSyncError = useCallback((failed) => {
    console.error('Some requests failed to sync:', failed);
  }, []);

  const {
    enqueue,
    queue,
    queueLength,
    isProcessing,
    clearQueue,
    processQueue
  } = useOfflineQueue({
    onSync: handleSync,
    onSyncComplete: handleSyncComplete,
    onSyncError: handleSyncError
  });

  /**
   * Execute a function with offline support
   * If online, executes immediately
   * If offline, queues for later execution
   *
   * @param {Function} fn - Async function to execute
   * @param {Object} options
   * @param {string} options.type - Type of operation (for logging)
   * @param {Object} options.data - Data for the operation
   * @param {Function} options.fallback - Local fallback function to execute immediately
   * @returns {Promise}
   */
  const executeWithOfflineSupport = useCallback(async (fn, options = {}) => {
    const { type, data, fallback } = options;

    if (isOnline) {
      // We're online - execute immediately
      try {
        return await fn(data);
      } catch (error) {
        // Request failed even though we're online
        // Could be a server error - queue it for retry
        console.error(`Request failed (${type}):`, error);

        enqueue({
          type,
          fn,
          data
        });

        // Execute fallback if provided (e.g., save to localStorage)
        if (fallback) {
          return await fallback(data);
        }

        throw error;
      }
    } else {
      // We're offline - queue for later and execute fallback
      enqueue({
        type,
        fn,
        data
      });

      // Execute fallback if provided (e.g., save to localStorage)
      if (fallback) {
        return await fallback(data);
      }

      return { success: true, queued: true };
    }
  }, [isOnline, enqueue]);

  const value = {
    isOnline,
    isOffline,
    enqueue,
    queue,
    queueLength,
    isProcessing,
    clearQueue,
    processQueue,
    executeWithOfflineSupport
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
