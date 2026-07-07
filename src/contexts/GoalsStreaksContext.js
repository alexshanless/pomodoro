import React, { createContext, useContext } from 'react';
import { useGoalsStreaksState } from '../hooks/useGoalsStreaksState';

const GoalsStreaksContext = createContext(null);

export const GoalsStreaksProvider = ({ children }) => (
  <GoalsStreaksContext.Provider value={useGoalsStreaksState()}>
    {children}
  </GoalsStreaksContext.Provider>
);

export const useGoalsStreaks = () => {
  const context = useContext(GoalsStreaksContext);
  if (!context) {
    throw new Error('useGoalsStreaks must be used within a GoalsStreaksProvider');
  }
  return context;
};

export default GoalsStreaksContext;
