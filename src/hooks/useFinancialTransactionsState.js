import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { getMissingOccurrences } from '../utils/recurrence';
import { enqueueSync, getPendingSync, removeSynced, isPendingSyncId } from '../utils/syncQueue';

// One materialization pass per user per page load.
let materializedForUser = null;

// State implementation; consumers use the context-backed re-export below.
export const useFinancialTransactionsState = () => {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isDrainingRef = useRef(false);

  // Load transactions from Supabase or localStorage
  useEffect(() => {
    // Append due occurrences of recurring anchors to a legacy-format
    // localStorage list. Occurrence ids are derived from the anchor id +
    // timestamp so repeat runs are idempotent.
    const materializeLocalRecurring = (key, items) => {
      const anchors = items.filter(i => i.isRecurring && i.recurringType && !i.parentId);
      if (anchors.length === 0) return items;

      const existingIds = new Set(items.map(i => String(i.id)));
      const generated = [];
      anchors.forEach(anchor => {
        getMissingOccurrences(
          { id: anchor.id, date: anchor.date, recurring_type: anchor.recurringType },
          new Set()
        ).forEach(iso => {
          const id = `${anchor.id}-r-${iso}`;
          if (existingIds.has(id)) return;
          generated.push({
            ...anchor,
            id,
            date: iso,
            isRecurring: false,
            recurringType: null,
            parentId: anchor.id
          });
        });
      });

      if (generated.length === 0) return items;
      const next = [...items, ...generated];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    };

    const loadTransactionsFromLocalStorage = () => {
      try {
        const incomes = materializeLocalRecurring('incomes', JSON.parse(localStorage.getItem('incomes') || '[]'));
        const spendings = materializeLocalRecurring('spendings', JSON.parse(localStorage.getItem('spendings') || '[]'));

        // Convert old format to new format
        const convertedIncomes = incomes.map(income => ({
          id: income.id,
          type: 'income',
          amount: income.amount,
          description: income.description,
          category: null,
          date: income.date,
          project_id: income.projectId || null,
          is_recurring: income.isRecurring || false,
          recurring_type: income.recurringType || null,
          parent_transaction_id: income.parentId || null
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
          recurring_type: spending.recurringType || null,
          parent_transaction_id: spending.parentId || null
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
          .order('occurred_at', { ascending: false });

        if (error) throw error;

        // Convert Supabase format to app format
        const converted = (data || []).map(t => ({
          ...t,
          date: t.occurred_at, // Map occurred_at to date for compatibility
          project_id: t.project_id,
          is_recurring: t.is_recurring || false,
          recurring_type: t.recurring_type || null
        }));

        // Include queued-but-unsynced adds so they stay visible while offline.
        const pendingAdds = getPendingSync('transaction.add')
          .filter(item => item.payload.row.user_id === user.id)
          .map(item => {
            const row = item.payload.row;
            return {
              id: item.id,
              type: row.type,
              amount: row.amount,
              description: row.description,
              category: row.category,
              date: row.occurred_at,
              project_id: row.project_id,
              is_recurring: row.is_recurring || false,
              recurring_type: row.recurring_type || null
            };
          });

        setTransactions([...pendingAdds, ...converted]);
        setError(null);
        materializeRecurringInSupabase(converted);
      } catch (err) {
        console.error('Error loading transactions from Supabase:', err);
        setError(err.message);
        // Fallback to localStorage
        loadTransactionsFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    // Generate any occurrences of recurring anchors that came due while the
    // app was closed. The unique index on (parent_transaction_id, occurred_at)
    // plus ignoreDuplicates makes this idempotent across devices.
    const materializeRecurringInSupabase = async (loaded) => {
      if (materializedForUser === user.id) return;
      materializedForUser = user.id;

      try {
        const anchors = loaded.filter(t => t.is_recurring && t.recurring_type && !t.parent_transaction_id && !isPendingSyncId(t.id));
        if (anchors.length === 0) return;

        const existingKeys = new Set(
          loaded
            .filter(t => t.parent_transaction_id)
            .map(t => `${t.parent_transaction_id}|${new Date(t.date).toISOString()}`)
        );

        const rows = [];
        anchors.forEach(anchor => {
          getMissingOccurrences(anchor, existingKeys).forEach(iso => {
            rows.push({
              user_id: user.id,
              type: anchor.type,
              amount: anchor.amount,
              currency: anchor.currency || 'USD',
              description: anchor.description,
              category: anchor.category || null,
              project_id: anchor.project_id || null,
              occurred_at: iso,
              is_recurring: false,
              recurring_type: null,
              parent_transaction_id: anchor.id
            });
          });
        });
        if (rows.length === 0) return;

        const { data, error } = await supabase
          .from('financial_transactions')
          .upsert(rows, { onConflict: 'parent_transaction_id,occurred_at', ignoreDuplicates: true })
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          const converted = data.map(t => ({ ...t, date: t.occurred_at }));
          setTransactions(prev =>
            [...converted, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
          );
        }
      } catch (err) {
        console.error('Error materializing recurring transactions:', err);
      }
    };

    if (user && isSupabaseConfigured && supabase) {
      loadTransactionsFromSupabase();
    } else {
      loadTransactionsFromLocalStorage();
    }
  }, [user]);

  // Replay queued transaction adds once signed in and back online.
  useEffect(() => {
    if (!user || !isOnline || !isSupabaseConfigured || !supabase) return;
    if (isDrainingRef.current) return;
    const pending = getPendingSync('transaction.add')
      .filter(item => item.payload.row.user_id === user.id);
    if (pending.length === 0) return;
    isDrainingRef.current = true;

    (async () => {
      try {
        for (const item of pending) {
          const { row } = item.payload;
          const { data, error } = await supabase
            .from('financial_transactions')
            .insert([row])
            .select()
            .single();
          if (error) throw error;
          removeSynced([item.id]);

          const realTx = {
            ...data,
            date: data.occurred_at,
            is_recurring: data.is_recurring || false,
            recurring_type: data.recurring_type || null
          };

          setTransactions(prev => {
            const idx = prev.findIndex(t => t.id === item.id);
            if (idx === -1) return [realTx, ...prev];
            const updated = [...prev];
            updated[idx] = realTx;
            return updated;
          });
        }
      } catch (err) {
        console.error('Transaction sync replay failed; will retry on next reconnect:', err);
      } finally {
        isDrainingRef.current = false;
      }
    })();
  }, [user, isOnline]);

  const addTransaction = async (transactionData) => {
    if (user && isSupabaseConfigured && supabase) {
      return addTransactionToSupabase(transactionData);
    } else {
      return addTransactionToLocalStorage(transactionData);
    }
  };

  const addTransactionToSupabase = async (transactionData) => {
    const newTransaction = {
      user_id: user.id,
      type: transactionData.type,
      amount: parseFloat(transactionData.amount),
      description: transactionData.description,
      category: transactionData.category || null,
      occurred_at: transactionData.date, // Map date to occurred_at
      project_id: transactionData.project_id || null,
      currency: 'USD' // Default currency
    };

    // Only send recurring columns when set, so plain transactions still
    // save on databases that haven't run add_recurring_transactions.sql yet.
    if (transactionData.is_recurring) {
      newTransaction.is_recurring = true;
      newTransaction.recurring_type = transactionData.recurring_type || 'monthly';
    }

    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert([newTransaction])
        .select()
        .single();

      if (error) throw error;

      // Convert to app format
      const converted = {
        ...data,
        date: data.occurred_at,
        is_recurring: data.is_recurring || false,
        recurring_type: data.recurring_type || null
      };

      setTransactions(prev => [converted, ...prev]);
      return { data: converted, error: null };
    } catch (err) {
      console.error('Error adding transaction to Supabase, queueing for sync:', err);

      const queuedItem = enqueueSync('transaction.add', { row: newTransaction });
      const optimistic = {
        id: queuedItem.id,
        type: newTransaction.type,
        amount: newTransaction.amount,
        description: newTransaction.description,
        category: newTransaction.category,
        date: newTransaction.occurred_at,
        project_id: newTransaction.project_id,
        is_recurring: newTransaction.is_recurring || false,
        recurring_type: newTransaction.recurring_type || null
      };
      setTransactions(prev => [optimistic, ...prev]);
      return { data: optimistic, error: null, queued: true };
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
          projectId: newTransaction.project_id || null,
          isRecurring: newTransaction.is_recurring || false,
          recurringType: newTransaction.recurring_type || null
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

  const updateTransaction = async (id, updates) => {
    if (isPendingSyncId(id)) {
      return { error: 'This entry is still syncing — try again in a moment.' };
    }
    if (user && isSupabaseConfigured && supabase) {
      return updateTransactionInSupabase(id, updates);
    } else {
      return updateTransactionInLocalStorage(id, updates);
    }
  };

  const updateTransactionInSupabase = async (id, updates) => {
    try {
      // Map date to occurred_at, and drop recurring columns unless this
      // update actually uses them (keeps updates working pre-migration;
      // turning recurring OFF still persists because the existing row
      // can only be recurring post-migration).
      const { date, is_recurring, recurring_type, ...rest } = updates;
      const payload = { ...rest };
      if (date !== undefined) payload.occurred_at = date;
      const existing = transactions.find(t => t.id === id);
      if (is_recurring || existing?.is_recurring) {
        payload.is_recurring = !!is_recurring;
        payload.recurring_type = is_recurring ? (recurring_type || 'monthly') : null;
      }

      const { data, error } = await supabase
        .from('financial_transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const converted = {
        ...data,
        date: data.occurred_at,
        is_recurring: data.is_recurring || false,
        recurring_type: data.recurring_type || null
      };
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...converted } : t));
      return { error: null };
    } catch (err) {
      console.error('Error updating transaction in Supabase:', err);
      return { error: err.message };
    }
  };

  const updateTransactionInLocalStorage = (id, updates) => {
    try {
      const transaction = transactions.find(t => t.id === id);

      if (!transaction) {
        return { error: `Transaction with id ${id} not found` };
      }

      // Storage uses the legacy key names (projectId/isRecurring), so map
      // the app-format updates before merging or they silently don't stick.
      const legacyUpdates = {};
      if (updates.amount !== undefined) legacyUpdates.amount = parseFloat(updates.amount);
      if (updates.description !== undefined) legacyUpdates.description = updates.description;
      if (updates.category !== undefined) legacyUpdates.category = updates.category;
      if (updates.date !== undefined) legacyUpdates.date = updates.date;
      if (updates.project_id !== undefined) legacyUpdates.projectId = updates.project_id;
      if (updates.is_recurring !== undefined) legacyUpdates.isRecurring = updates.is_recurring;
      if (updates.recurring_type !== undefined) legacyUpdates.recurringType = updates.recurring_type;

      if (transaction.type === 'income') {
        const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
        const updated = incomes.map(income =>
          income.id === id ? { ...income, ...legacyUpdates } : income
        );
        localStorage.setItem('incomes', JSON.stringify(updated));
      } else {
        const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');
        const updated = spendings.map(spending =>
          spending.id === id ? { ...spending, ...legacyUpdates } : spending
        );
        localStorage.setItem('spendings', JSON.stringify(updated));
      }

      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return { error: null };
    } catch (err) {
      console.error('Error updating transaction in localStorage:', err);
      return { error: err.message };
    }
  };

  const deleteTransaction = async (id) => {
    if (isPendingSyncId(id)) {
      removeSynced([id]);
      setTransactions(prev => prev.filter(t => t.id !== id));
      return { error: null };
    }
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

      if (!transaction) {
        return { error: `Transaction with id ${id} not found` };
      }

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
    updateTransaction,
    deleteTransaction
  };
};
