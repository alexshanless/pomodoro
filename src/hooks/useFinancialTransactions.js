import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useFinancialTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load transactions from Supabase or localStorage
  useEffect(() => {
    const loadTransactionsFromLocalStorage = () => {
      try {
        const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
        const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');

        // Convert old format to new format
        const convertedIncomes = incomes.map(income => ({
          id: income.id,
          type: 'income',
          amount: income.amount,
          description: income.description,
          category: null,
          date: income.date,
          project_id: income.projectId || null,
          is_recurring: false,
          recurring_type: null
        }));

        const convertedSpendings = spendings.map(spending => ({
          id: spending.id,
          type: 'spending',
          amount: spending.amount,
          description: spending.description,
          category: spending.category || 'Other',
          date: spending.date,
          project_id: spending.projectId || null,
          is_recurring: spending.isRecurring || false,
          recurring_type: spending.recurringType || null
        }));

        setTransactions([...convertedIncomes, ...convertedSpendings]);
        setLoading(false);
      } catch (err) {
        console.error('Error loading from localStorage:', err);
        setTransactions([]);
        setLoading(false);
      }
    };

    const loadTransactionsFromSupabase = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;

        setTransactions(data || []);
        setError(null);
      } catch (err) {
        console.error('Error loading transactions from Supabase:', err);
        setError(err.message);
        // Fallback to localStorage
        loadTransactionsFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    if (user && isSupabaseConfigured && supabase) {
      loadTransactionsFromSupabase();
    } else {
      loadTransactionsFromLocalStorage();
    }
  }, [user]);

  const addTransaction = async (transactionData) => {
    if (user && isSupabaseConfigured && supabase) {
      return addTransactionToSupabase(transactionData);
    } else {
      return addTransactionToLocalStorage(transactionData);
    }
  };

  const addTransactionToSupabase = async (transactionData) => {
    try {
      const newTransaction = {
        user_id: user.id,
        type: transactionData.type,
        amount: parseFloat(transactionData.amount),
        description: transactionData.description,
        category: transactionData.category || null,
        date: transactionData.date,
        project_id: transactionData.project_id || null,
        is_recurring: transactionData.is_recurring || false,
        recurring_type: transactionData.recurring_type || null
      };

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert([newTransaction])
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      console.error('Error adding transaction to Supabase:', err);
      return { data: null, error: err.message };
    }
  };

  const addTransactionToLocalStorage = (transactionData) => {
    try {
      const newTransaction = {
        id: Date.now(),
        ...transactionData,
        amount: parseFloat(transactionData.amount),
        date: transactionData.date
      };

      if (transactionData.type === 'income') {
        const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
        const legacyIncome = {
          id: newTransaction.id,
          amount: newTransaction.amount,
          description: newTransaction.description,
          date: newTransaction.date,
          projectId: newTransaction.project_id || null
        };
        incomes.push(legacyIncome);
        localStorage.setItem('incomes', JSON.stringify(incomes));
      } else {
        const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');
        const legacySpending = {
          id: newTransaction.id,
          amount: newTransaction.amount,
          description: newTransaction.description,
          category: newTransaction.category || 'Other',
          date: newTransaction.date,
          projectId: newTransaction.project_id || null,
          isRecurring: newTransaction.is_recurring || false,
          recurringType: newTransaction.recurring_type || null
        };
        spendings.push(legacySpending);
        localStorage.setItem('spendings', JSON.stringify(spendings));
      }

      setTransactions(prev => [newTransaction, ...prev]);
      return { data: newTransaction, error: null };
    } catch (err) {
      console.error('Error adding transaction to localStorage:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteTransaction = async (id) => {
    if (user && isSupabaseConfigured && supabase) {
      return deleteTransactionFromSupabase(id);
    } else {
      return deleteTransactionFromLocalStorage(id);
    }
  };

  const deleteTransactionFromSupabase = async (id) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting transaction from Supabase:', err);
      return { error: err.message };
    }
  };

  const deleteTransactionFromLocalStorage = (id) => {
    try {
      const transaction = transactions.find(t => t.id === id);

      if (transaction.type === 'income') {
        const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
        const updated = incomes.filter(income => income.id !== id);
        localStorage.setItem('incomes', JSON.stringify(updated));
      } else {
        const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');
        const updated = spendings.filter(spending => spending.id !== id);
        localStorage.setItem('spendings', JSON.stringify(updated));
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting transaction from localStorage:', err);
      return { error: err.message };
    }
  };

  // Get incomes and spendings separately for backwards compatibility
  const incomes = transactions.filter(t => t.type === 'income');
  const spendings = transactions.filter(t => t.type === 'spending');

  return {
    transactions,
    incomes,
    spendings,
    loading,
    error,
    addTransaction,
    deleteTransaction
  };
};
