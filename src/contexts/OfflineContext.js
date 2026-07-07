import React, { createContext, useContext } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// Shared connectivity state. One probe for the whole app — consumers use
// useOffline() instead of mounting their own useOnlineStatus interval.
// Failed Supabase writes are persisted via utils/syncQueue.js and replayed
// by the owning data provider (see usePomodoroSessionsState).
const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const { isOnline, isOffline } = useOnlineStatus();

  return (
    <OfflineContext.Provider value={{ isOnline, isOffline }}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
