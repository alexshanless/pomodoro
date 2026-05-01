import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing project sharing
 * Handles creating, updating, and revoking share links
 */
export function useProjectShares(projectId = null) {
  const { user } = useAuth();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch shares for a specific project
  const fetchShares = useCallback(async () => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_shares')
        .select('*')
        .eq('project_id', projectId)
        .eq('shared_by_user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setShares(data || []);
    } catch (err) {
      console.error('Error fetching project shares:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  // Load shares on mount and when dependencies change
  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Create a new share link
  const createShare = async (shareData) => {
    if (!user || !projectId) {
      throw new Error('User must be authenticated and project must be specified');
    }

    try {
      setError(null);

      // Generate a unique share token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) throw tokenError;

      const shareToken = tokenData;

      // Create the share record
      const { data, error: insertError } = await supabase
        .from('project_shares')
        .insert({
          project_id: projectId,
          shared_by_user_id: user.id,
          share_token: shareToken,
          access_type: shareData.accessType || 'read-only',
          shared_with_email: shareData.email || null,
          label: shareData.label || null,
          expires_at: shareData.expiresAt || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setShares(prev => [data, ...prev]);

      return data;
    } catch (err) {
      console.error('Error creating share:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update an existing share
  const updateShare = async (shareId, updates) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('project_shares')
        .update(updates)
        .eq('id', shareId)
        .eq('shared_by_user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setShares(prev =>
        prev.map(share => (share.id === shareId ? data : share))
      );

      return data;
    } catch (err) {
      console.error('Error updating share:', err);
      setError(err.message);
      throw err;
    }
  };

  // Revoke/delete a share
  const revokeShare = async (shareId) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('project_shares')
        .delete()
        .eq('id', shareId)
        .eq('shared_by_user_id', user.id);

      if (deleteError) throw deleteError;

      // Update local state
      setShares(prev => prev.filter(share => share.id !== shareId));
    } catch (err) {
      console.error('Error revoking share:', err);
      setError(err.message);
      throw err;
    }
  };

  // Toggle share active status
  const toggleShareStatus = async (shareId, isActive) => {
    return updateShare(shareId, { is_active: isActive });
  };

  // Get share analytics (views)
  const getShareAnalytics = async (shareId) => {
    try {
      const { data, error: analyticsError } = await supabase
        .from('project_share_views')
        .select('*')
        .eq('share_id', shareId)
        .order('viewed_at', { ascending: false });

      if (analyticsError) throw analyticsError;

      return data || [];
    } catch (err) {
      console.error('Error fetching share analytics:', err);
      throw err;
    }
  };

  // Generate shareable URL
  const getShareUrl = (shareToken) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${shareToken}`;
  };

  return {
    shares,
    loading,
    error,
    createShare,
    updateShare,
    revokeShare,
    toggleShareStatus,
    getShareAnalytics,
    getShareUrl,
    refresh: fetchShares,
  };
}

/**
 * Hook for accessing shared project data (public/anonymous access)
 * Used on the public shared project view page.
 *
 * All validation (active flag, expiration, email allowlist) happens server-side
 * inside the `get_shared_project_data` RPC. The hook only translates the RPC's
 * sentinel exceptions into UI-friendly states.
 */
export function useSharedProject(shareToken) {
  const [project, setProject] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);

  useEffect(() => {
    const fetchSharedProject = async () => {
      if (!shareToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setErrorCode(null);

        const { data, error: rpcError } = await supabase.rpc(
          'get_shared_project_data',
          {
            p_token: shareToken,
            p_user_agent: navigator.userAgent,
          }
        );

        if (rpcError) {
          const msg = rpcError.message || '';
          if (msg.includes('AUTH_REQUIRED')) {
            setErrorCode('AUTH_REQUIRED');
            throw new Error('This share link is restricted. Please sign in to view it.');
          }
          if (msg.includes('EMAIL_MISMATCH')) {
            setErrorCode('EMAIL_MISMATCH');
            throw new Error('This share link is restricted to a different email address.');
          }
          if (msg.includes('INVALID_OR_EXPIRED')) {
            setErrorCode('INVALID_OR_EXPIRED');
            throw new Error('Share link not found or has expired.');
          }
          throw rpcError;
        }

        if (!data || !data.project) {
          setErrorCode('INVALID_OR_EXPIRED');
          throw new Error('Share link not found or has expired.');
        }

        setProject(data.project);
        setSessions(data.sessions || []);
        setShareInfo(data.share_info || null);
      } catch (err) {
        console.error('Error fetching shared project:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedProject();
  }, [shareToken]);

  return {
    project,
    sessions,
    shareInfo,
    loading,
    error,
    errorCode,
  };
}

/**
 * Hook for managing teams
 */
export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!inner(*)
        `)
        .or(`owner_id.eq.${user.id},team_members.user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = async (teamData) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setError(null);

      const { data, error: insertError } = await supabase
        .from('teams')
        .insert({
          owner_id: user.id,
          name: teamData.name,
          description: teamData.description || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add creator as owner in team_members
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
          invitation_status: 'accepted',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      setTeams(prev => [data, ...prev]);

      return data;
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateTeam = async (teamId, updates) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (updateError) throw updateError;

      setTeams(prev =>
        prev.map(team => (team.id === teamId ? data : team))
      );

      return data;
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteTeam = async (teamId) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('owner_id', user.id);

      if (deleteError) throw deleteError;

      setTeams(prev => prev.filter(team => team.id !== teamId));
    } catch (err) {
      console.error('Error deleting team:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    refresh: fetchTeams,
  };
}
