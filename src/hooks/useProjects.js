import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects from Supabase (projects are only for registered users)
  useEffect(() => {
    const loadProjectsFromSupabase = async () => {
      // Only load projects if user is logged in
      if (!user || !isSupabaseConfigured || !supabase) {
        setProjects([]);
        setLoading(false);
        return;
      }

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
          rate: p.hourly_rate !== undefined ? parseFloat(p.hourly_rate) || 0 : 0,
          pomodoros: p.pomodoros_count !== undefined ? p.pomodoros_count || 0 : 0,
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
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjectsFromSupabase();
  }, [user]);

  const addProject = async (projectData) => {
    // Projects are only for registered users
    if (!user || !isSupabaseConfigured || !supabase) {
      return { error: 'Must be logged in to create projects' };
    }
    return addProjectToSupabase(projectData);
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
        rate: data.hourly_rate !== undefined ? parseFloat(data.hourly_rate) || 0 : (parseFloat(projectData.rate) || 0),
        pomodoros: data.pomodoros_count !== undefined ? data.pomodoros_count || 0 : 0,
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

  const updateProject = async (id, updates) => {
    // Projects are only for registered users
    if (!user || !isSupabaseConfigured || !supabase) {
      return { error: 'Must be logged in to update projects' };
    }
    return updateProjectInSupabase(id, updates);
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
              // Only update new fields if they exist in response
              rate: data.hourly_rate !== undefined ? parseFloat(data.hourly_rate) || 0 : p.rate,
              pomodoros: data.pomodoros_count !== undefined ? data.pomodoros_count || 0 : p.pomodoros
            }
          : p
      ));

      return { error: null };
    } catch (err) {
      console.error('Error updating project in Supabase:', err);
      return { error: err.message };
    }
  };

  const deleteProject = async (id) => {
    // Projects are only for registered users
    if (!user || !isSupabaseConfigured || !supabase) {
      return { error: 'Must be logged in to delete projects' };
    }
    return deleteProjectFromSupabase(id);
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

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject
  };
};
