import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const LOCAL_TASKS_KEY = 'localTasks';

const readLocalTasks = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const writeLocalTasks = (list) => {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
};

const convertTask = (row) => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  estimatedPomodoros: row.estimated_pomodoros,
  completedPomodoros: row.completed_pomodoros || 0,
  status: row.status,
  completedAt: row.completed_at,
  createdAt: row.created_at
});

// State implementation. Consumers use the shared context-backed useTasks;
// TasksProvider mounts exactly one instance of this.
export const useTasksState = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTasks = async () => {
      if (!user || !isSupabaseConfigured || !supabase) {
        setTasks(readLocalTasks());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTasks((data || []).map(convertTask));
        setError(null);
      } catch (err) {
        console.error('Error loading tasks from Supabase:', err);
        setError(err.message);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user]);

  const addTask = async (taskData) => {
    if (!user || !isSupabaseConfigured || !supabase) {
      try {
        const newTask = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: taskData.title,
          projectId: taskData.projectId || null,
          estimatedPomodoros: taskData.estimatedPomodoros || null,
          completedPomodoros: 0,
          status: 'open',
          completedAt: null,
          createdAt: new Date().toISOString()
        };
        writeLocalTasks([newTask, ...readLocalTasks()]);
        setTasks(prev => [newTask, ...prev]);
        return { data: newTask, error: null };
      } catch (err) {
        console.error('Error adding task to localStorage:', err);
        return { data: null, error: err.message };
      }
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: user.id,
          title: taskData.title,
          project_id: taskData.projectId || null,
          estimated_pomodoros: taskData.estimatedPomodoros || null
        }])
        .select()
        .single();

      if (error) throw error;

      const converted = convertTask(data);
      setTasks(prev => [converted, ...prev]);
      return { data: converted, error: null };
    } catch (err) {
      console.error('Error adding task to Supabase:', err);
      return { data: null, error: err.message };
    }
  };

  const updateTask = async (id, updates) => {
    const merged = {};
    if (updates.title !== undefined) merged.title = updates.title;
    if (updates.projectId !== undefined) merged.projectId = updates.projectId;
    if (updates.estimatedPomodoros !== undefined) merged.estimatedPomodoros = updates.estimatedPomodoros;
    if (updates.completedPomodoros !== undefined) merged.completedPomodoros = updates.completedPomodoros;
    if (updates.status !== undefined) {
      merged.status = updates.status;
      merged.completedAt = updates.status === 'done' ? new Date().toISOString() : null;
    }

    if (!user || !isSupabaseConfigured || !supabase) {
      try {
        const next = readLocalTasks().map(t => (t.id === id ? { ...t, ...merged } : t));
        writeLocalTasks(next);
        setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...merged } : t)));
        return { error: null };
      } catch (err) {
        console.error('Error updating task in localStorage:', err);
        return { error: err.message };
      }
    }

    try {
      const supabaseUpdates = {};
      if (merged.title !== undefined) supabaseUpdates.title = merged.title;
      if (merged.projectId !== undefined) supabaseUpdates.project_id = merged.projectId;
      if (merged.estimatedPomodoros !== undefined) supabaseUpdates.estimated_pomodoros = merged.estimatedPomodoros;
      if (merged.completedPomodoros !== undefined) supabaseUpdates.completed_pomodoros = merged.completedPomodoros;
      if (merged.status !== undefined) {
        supabaseUpdates.status = merged.status;
        supabaseUpdates.completed_at = merged.completedAt;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const converted = convertTask(data);
      setTasks(prev => prev.map(t => (t.id === id ? converted : t)));
      return { error: null };
    } catch (err) {
      console.error('Error updating task in Supabase:', err);
      return { error: err.message };
    }
  };

  const deleteTask = async (id) => {
    if (!user || !isSupabaseConfigured || !supabase) {
      try {
        writeLocalTasks(readLocalTasks().filter(t => t.id !== id));
        setTasks(prev => prev.filter(t => t.id !== id));
        return { error: null };
      } catch (err) {
        console.error('Error deleting task from localStorage:', err);
        return { error: err.message };
      }
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting task from Supabase:', err);
      return { error: err.message };
    }
  };

  const incrementTaskPomodoro = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return { error: 'Task not found' };
    return updateTask(id, { completedPomodoros: (task.completedPomodoros || 0) + 1 });
  };

  const toggleTaskDone = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return { error: 'Task not found' };
    return updateTask(id, { status: task.status === 'done' ? 'open' : 'done' });
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    incrementTaskPomodoro,
    toggleTaskDone
  };
};
