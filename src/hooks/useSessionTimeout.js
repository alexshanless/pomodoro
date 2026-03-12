import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Session Timeout Hook
 * Automatically logs out users after a period of inactivity
 * Shows warning before logout and auto-saves work
 *
 * @param {Object} options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30 minutes)
 * @param {number} options.warningTime - Warning time before timeout in ms (default: 2 minutes)
 * @param {Function} options.onTimeout - Callback when timeout occurs
 * @param {Function} options.onWarning - Callback when warning should be shown
 * @param {Function} options.onActivity - Callback when activity detected (optional)
 * @param {boolean} options.enabled - Enable/disable timeout (default: true)
 *
 * @returns {Object} - { resetTimer, remainingTime, isWarning, extendSession }
 */
export const useSessionTimeout = ({
  timeout = 120 * 60 * 1000, // 2 hours default
  warningTime = 2 * 60 * 1000, // 2 minutes warning default
  onTimeout,
  onWarning,
  onActivity,
  enabled = true
} = {}) => {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);

  const timeoutIdRef = useRef(null);
  const warningIdRef = useRef(null);
  const intervalIdRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const hasWarnedRef = useRef(false);

  /**
   * Reset the inactivity timer
   */
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Clear existing timers
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    // Reset state
    setIsWarning(false);
    hasWarnedRef.current = false;
    lastActivityRef.current = Date.now();
    setRemainingTime(timeout);

    // Set warning timer
    warningIdRef.current = setTimeout(() => {
      if (!hasWarnedRef.current) {
        setIsWarning(true);
        hasWarnedRef.current = true;
        if (onWarning) {
          onWarning();
        }

        // Start countdown interval for warning period
        intervalIdRef.current = setInterval(() => {
          const elapsed = Date.now() - lastActivityRef.current;
          const remaining = timeout - elapsed;
          setRemainingTime(Math.max(0, remaining));
        }, 1000);
      }
    }, timeout - warningTime);

    // Set timeout timer
    timeoutIdRef.current = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }

      // Clean up
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      setRemainingTime(0);
    }, timeout);
  }, [enabled, timeout, warningTime, onTimeout, onWarning]);

  /**
   * Extend session (called when user interacts during warning)
   */
  const extendSession = useCallback(() => {
    resetTimer();
    if (onActivity) {
      onActivity();
    }
  }, [resetTimer, onActivity]);

  /**
   * Handle user activity
   */
  const handleActivity = useCallback(() => {
    if (!enabled) return;

    // Debounce - only reset if enough time has passed
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    if (timeSinceLastActivity > 1000) { // 1 second debounce
      if (onActivity) {
        onActivity();
      }

      // If not in warning state, reset timer
      if (!isWarning) {
        resetTimer();
      }
    }
  }, [enabled, isWarning, resetTimer, onActivity]);

  /**
   * Set up activity listeners
   */
  useEffect(() => {
    if (!enabled) return;

    // Activity events to track
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (warningIdRef.current) {
        clearTimeout(warningIdRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [enabled, handleActivity, resetTimer]);

  /**
   * Handle visibility change (tab switching)
   */
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause timers (optional)
        // For security, we keep timers running even when tab is hidden
      } else {
        // Tab visible - check if timeout occurred while hidden
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeout) {
          if (onTimeout) {
            onTimeout();
          }
        } else if (elapsed >= timeout - warningTime && !isWarning) {
          // Show warning if we're past warning time
          setIsWarning(true);
          if (onWarning) {
            onWarning();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeout, warningTime, isWarning, onTimeout, onWarning]);

  return {
    resetTimer,
    extendSession,
    remainingTime,
    isWarning,
    isActive: enabled
  };
};

export default useSessionTimeout;
