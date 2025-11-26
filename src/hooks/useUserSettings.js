import { useState, useEffect } from 'react';

export const useUserSettings = () => {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load selected project ID from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedProjectId');
    if (saved) {
      console.log('[DEBUG] Loaded selectedProjectId from localStorage:', saved);
      setSelectedProjectId(saved);
    }
    setLoading(false);
  }, []);

  // Save selected project ID to localStorage
  const saveSelectedProject = async (projectId) => {
    console.log('[DEBUG] Saving selectedProjectId to localStorage:', projectId);

    if (projectId) {
      localStorage.setItem('selectedProjectId', projectId);
      setSelectedProjectId(projectId);
    } else {
      localStorage.removeItem('selectedProjectId');
      setSelectedProjectId(null);
    }

    return { error: null };
  };

  return {
    selectedProjectId,
    loading,
    saveSelectedProject
  };
};
