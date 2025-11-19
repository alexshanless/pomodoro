import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects from Supabase or localStorage
  useEffect(() => {
    const loadProjectsFromLocalStorage = () => {
      try {
        const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        setProjects(savedProjects);
        setLoading(false);
      } catch (err) {
        console.error('Error loading from localStorage:', err);
        setProjects([]);
        setLoading(false);
      }
    };

    const loadProjectsFromSupabase = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Convert Supabase format to app format
        const converted = (data || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          color: p.color || '#e94560',
          timeTracked: p.total_time_minutes || 0,
          balance: parseFloat(p.balance) || 0,
          createdAt: p.created_at,
          createdDate: p.created_at,
          projectNumber: p.project_number, // Sequential project number
          rate: parseFloat(p.hourly_rate) || 0,
          pomodoros: p.pomodoros_count || 0,
          financials: {
            income: 0,
            expenses: 0
          }
        }));

        setProjects(converted);
        setError(null);
      } catch (err) {
        console.error('Error loading projects from Supabase:', err);
        setError(err.message);
        // Fallback to localStorage
        loadProjectsFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    if (user && isSupabaseConfigured && supabase) {
      loadProjectsFromSupabase();
    } else {
      loadProjectsFromLocalStorage();
    }
  }, [user]);

  const addProject = async (projectData) => {
    if (user && isSupabaseConfigured && supabase) {
      return addProjectToSupabase(projectData);
    } else {
      return addProjectToLocalStorage(projectData);
    }
  };

  const addProjectToSupabase = async (projectData) => {
    try {
      const newProject = {
        user_id: user.id,
        name: projectData.name,
        description: projectData.description || '',
        color: projectData.color || '#e94560',
        total_time_minutes: 0,
        balance: 0,
        hourly_rate: parseFloat(projectData.rate) || 0,
        pomodoros_count: 0,
        is_archived: false
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

      if (error) throw error;

      // Convert to app format
      const converted = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        color: data.color,
        timeTracked: data.total_time_minutes || 0,
        balance: parseFloat(data.balance) || 0,
        createdAt: data.created_at,
        createdDate: data.created_at,
        projectNumber: data.project_number, // Sequential project number
        rate: parseFloat(data.hourly_rate) || 0,
        pomodoros: data.pomodoros_count || 0,
        financials: {
          income: 0,
          expenses: 0
        }
      };

      setProjects(prev => [converted, ...prev]);
      return { data: converted, error: null };
    } catch (err) {
      console.error('Error adding project to Supabase:', err);
      return { data: null, error: err.message };
    }
  };

  const addProjectToLocalStorage = (projectData) => {
    try {
      const nextProjectNumber = parseInt(localStorage.getItem('nextProjectNumber') || '1', 10);

      const newProject = {
        id: Date.now(),
        projectNumber: nextProjectNumber,
        name: projectData.name,
        rate: parseFloat(projectData.rate) || 0,
        color: projectData.color || '#e94560',
        timeTracked: 0,
        pomodoros: 0,
        createdAt: new Date().toISOString(),
        createdDate: new Date().toISOString(),
        balance: 0,
        description: projectData.description || '',
        financials: {
          income: 0,
          expenses: 0
        }
      };

      const updatedProjects = [newProject, ...projects];
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      localStorage.setItem('nextProjectNumber', (nextProjectNumber + 1).toString());

      setProjects(updatedProjects);
      return { data: newProject, error: null };
    } catch (err) {
      console.error('Error adding project to localStorage:', err);
      return { data: null, error: err.message };
    }
  };

  const updateProject = async (id, updates) => {
    if (user && isSupabaseConfigured && supabase) {
      return updateProjectInSupabase(id, updates);
    } else {
      return updateProjectInLocalStorage(id, updates);
    }
  };

  const updateProjectInSupabase = async (id, updates) => {
    try {
      const supabaseUpdates = {};

      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.color !== undefined) supabaseUpdates.color = updates.color;
      if (updates.timeTracked !== undefined) supabaseUpdates.total_time_minutes = updates.timeTracked;
      if (updates.balance !== undefined) supabaseUpdates.balance = updates.balance;
      if (updates.rate !== undefined) supabaseUpdates.hourly_rate = parseFloat(updates.rate) || 0;
      if (updates.pomodoros !== undefined) supabaseUpdates.pomodoros_count = updates.pomodoros;

      const { data, error } = await supabase
        .from('projects')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === id
          ? {
              ...p,
              name: data.name,
              description: data.description || '',
              color: data.color,
              timeTracked: data.total_time_minutes || 0,
              balance: parseFloat(data.balance) || 0,
              rate: parseFloat(data.hourly_rate) || 0,
              pomodoros: data.pomodoros_count || 0
            }
          : p
      ));

      return { error: null };
    } catch (err) {
      console.error('Error updating project in Supabase:', err);
      return { error: err.message };
    }
  };

  const updateProjectInLocalStorage = (id, updates) => {
    try {
      const updatedProjects = projects.map(p =>
        p.id === id ? { ...p, ...updates } : p
      );
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
      return { error: null };
    } catch (err) {
      console.error('Error updating project in localStorage:', err);
      return { error: err.message };
    }
  };

  const deleteProject = async (id) => {
    if (user && isSupabaseConfigured && supabase) {
      return deleteProjectFromSupabase(id);
    } else {
      return deleteProjectFromLocalStorage(id);
    }
  };

  const deleteProjectFromSupabase = async (id) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting project from Supabase:', err);
      return { error: err.message };
    }
  };

  const deleteProjectFromLocalStorage = (id) => {
    try {
      const updatedProjects = projects.filter(p => p.id !== id);
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
      return { error: null };
    } catch (err) {
      console.error('Error deleting project from localStorage:', err);
      return { error: err.message };
    }
  };

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject
  };
};
