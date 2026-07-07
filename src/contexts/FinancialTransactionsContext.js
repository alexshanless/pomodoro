import React, { createContext, useContext } from 'react';
import { useFinancialTransactionsState } from '../hooks/useFinancialTransactionsState';

const FinancialTransactionsContext = createContext(null);

export const FinancialTransactionsProvider = ({ children }) => (
  <FinancialTransactionsContext.Provider value={useFinancialTransactionsState()}>
    {children}
  </FinancialTransactionsContext.Provider>
);

export const useFinancialTransactions = () => {
  const context = useContext(FinancialTransactionsContext);
  if (!context) {
    throw new Error('useFinancialTransactions must be used within a FinancialTransactionsProvider');
  }
  return context;
};

export default FinancialTransactionsContext;
