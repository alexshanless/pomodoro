import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Offline Request Queue Hook
 * Queues failed requests when offline and automatically retries when online
 *
 * @param {Object} options
 * @param {Function} options.onSync - Callback when queue is being synced
 * @param {Function} options.onSyncComplete - Callback when sync completes
 * @param {Function} options.onSyncError - Callback when sync fails
 *
 * @returns {Object} - { enqueue, queue, isProcessing, clearQueue }
 */
export const useOfflineQueue = ({
  onSync,
  onSyncComplete,
  onSyncError
} = {}) => {
  const { isOnline } = useOnlineStatus();
  const [queue, setQueue] = useState(() => {
    // Load queue from localStorage on mount
    const saved = localStorage.getItem('offlineRequestQueue');
    return saved ? JSON.parse(saved) : [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('offlineRequestQueue', JSON.stringify(queue));
  }, [queue]);

  /**
   * Add a request to the queue
   * @param {Object} request - Request object to queue
   * @param {string} request.id - Unique identifier for the request
   * @param {string} request.type - Type of request (e.g., 'CREATE_SESSION', 'UPDATE_USER')
   * @param {Function} request.fn - Async function to execute
   * @param {Object} request.data - Data associated with the request
   * @param {number} request.timestamp - When the request was queued
   */
  const enqueue = useCallback((request) => {
    const queuedRequest = {
      id: request.id || `${Date.now()}-${Math.random()}`,
      type: request.type,
      fn: request.fn,
      data: request.data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };

    setQueue(prev => [...prev, queuedRequest]);

    return queuedRequest.id;
  }, []);

  /**
   * Remove a request from the queue
   */
  const dequeue = useCallback((requestId) => {
    setQueue(prev => prev.filter(req => req.id !== requestId));
  }, []);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem('offlineRequestQueue');
  }, []);

  /**
   * Process the queue - execute all queued requests
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0 || !isOnline) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    if (onSync) {
      onSync(queue.length);
    }

    const results = {
      succeeded: [],
      failed: []
    };

    // Process each request in the queue
    for (const request of queue) {
      try {
        // Execute the request function
        if (typeof request.fn === 'function') {
          await request.fn(request.data);
          results.succeeded.push(request);
          dequeue(request.id);
        } else {
          // Invalid request - remove it
          dequeue(request.id);
        }
      } catch (error) {
        console.error(`Failed to process queued request ${request.id}:`, error);

        // Increment retry count
        const updatedRequest = {
          ...request,
          retries: request.retries + 1
        };

        // Check if we've exceeded max retries
        if (updatedRequest.retries >= updatedRequest.maxRetries) {
          results.failed.push({
            ...updatedRequest,
            error: error.message
          });
          dequeue(request.id);
        } else {
          // Update request with new retry count
          setQueue(prev =>
            prev.map(req =>
              req.id === request.id ? updatedRequest : req
            )
          );
        }
      }
    }

    processingRef.current = false;
    setIsProcessing(false);

    // Call completion callback
    if (onSyncComplete) {
      onSyncComplete(results);
    }

    // Call error callback if any failed
    if (results.failed.length > 0 && onSyncError) {
      onSyncError(results.failed);
    }
  }, [queue, isOnline, onSync, onSyncComplete, onSyncError, dequeue]);

  /**
   * Auto-process queue when coming back online
   */
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        processQueue();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, queue.length, isProcessing, processQueue]);

  return {
    enqueue,
    queue,
    queueLength: queue.length,
    isProcessing,
    clearQueue,
    processQueue
  };
};

export default useOfflineQueue;
