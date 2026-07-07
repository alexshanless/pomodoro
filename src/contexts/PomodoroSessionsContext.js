import React, { createContext, useContext } from 'react';
import { usePomodoroSessionsState } from '../hooks/usePomodoroSessionsState';

const PomodoroSessionsContext = createContext(null);

export const PomodoroSessionsProvider = ({ children }) => (
  <PomodoroSessionsContext.Provider value={usePomodoroSessionsState()}>
    {children}
  </PomodoroSessionsContext.Provider>
);

export const usePomodoroSessions = () => {
  const context = useContext(PomodoroSessionsContext);
  if (!context) {
    throw new Error('usePomodoroSessions must be used within a PomodoroSessionsProvider');
  }
  return context;
};

export default PomodoroSessionsContext;
