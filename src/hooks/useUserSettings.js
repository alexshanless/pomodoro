import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useUserSettings = () => {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || !isSupabaseConfigured || !supabase) {
        // Fall back to localStorage (use new key format: just the ID)
        const saved = localStorage.getItem('selectedProjectId');
        if (saved) {
          setSelectedProjectId(saved);
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('user_settings')
          .select('selected_project_id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // Settings don't exist yet, that's ok
          if (error.code === 'PGRST116') {
            console.log('[DEBUG] No user settings found, will create on first save');
          } else {
            throw error;
          }
        } else if (data) {
          setSelectedProjectId(data.selected_project_id);
          console.log('[DEBUG] Loaded selected project from Supabase:', data.selected_project_id);
        }
      } catch (err) {
        console.error('Error loading user settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Save selected project ID to Supabase
  const saveSelectedProject = async (projectId) => {
    console.log('[DEBUG] Saving selected project to Supabase:', projectId);

    // Always save to localStorage as backup
    if (projectId) {
      // Note: We're only saving the ID here, the full project will be loaded from projects array
      localStorage.setItem('selectedProjectId', projectId);
    } else {
      localStorage.removeItem('selectedProjectId');
    }

    if (!user || !isSupabaseConfigured || !supabase) {
      console.log('[DEBUG] Supabase not available, using localStorage only');
      setSelectedProjectId(projectId);
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            selected_project_id: projectId
          },
          {
            onConflict: 'user_id'
          }
        );

      if (error) throw error;

      setSelectedProjectId(projectId);
      console.log('[DEBUG] Successfully saved to Supabase');
      return { error: null };
    } catch (err) {
      console.error('Error saving selected project:', err);
      return { error: err.message };
    }
  };

  return {
    selectedProjectId,
    loading,
    saveSelectedProject
  };
};
