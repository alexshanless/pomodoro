import { useState, useEffect } from 'react';
import { useOffline } from '../contexts/OfflineContext';

export const FOCUS_REFRESH_INTERVAL_MS = 60000;

// The data providers stay mounted for the whole session and load once per
// user, so changes made in another tab, on another device or in the desktop
// gadget would otherwise stay invisible until reload. Returns a key that
// changes when the app regains focus, at most once per interval, for load
// effects to depend on. Skipped while offline: a failed reload would replace
// good in-memory data with the fallback.
export const useFocusRefresh = (minIntervalMs = FOCUS_REFRESH_INTERVAL_MS) => {
  const { isOnline } = useOffline();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOnline) return undefined;

    let lastRefresh = Date.now();
    const handleFocus = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefresh < minIntervalMs) return;
      lastRefresh = now;
      setRefreshKey((key) => key + 1);
    };

    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOnline, minIntervalMs]);

  return refreshKey;
};

export default useFocusRefresh;
