import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const usePomodoroSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);

  // Helper function to get local date in YYYY-MM-DD format
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load sessions from Supabase
  useEffect(() => {
    const loadSessionsFromSupabase = async () => {
      if (!user || !isSupabaseConfigured || !supabase) {
        loadSessionsFromLocalStorage();
        return;
      }

      try {
        setLoading(true);

        // Load last 30 days of sessions
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('pomodoro_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('started_at', thirtyDaysAgo.toISOString())
          .order('started_at', { ascending: false });

        if (error) throw error;

        // Group sessions by date
        const groupedSessions = {};
        (data || []).forEach(session => {
          const date = getLocalDateString(new Date(session.started_at));

          if (!groupedSessions[date]) {
            groupedSessions[date] = {
              completed: 0,
              totalMinutes: 0,
              sessions: []
            };
          }

          // Only count focus sessions towards completed count
          if (session.mode === 'focus') {
            groupedSessions[date].completed += 1;
            groupedSessions[date].totalMinutes += session.duration_minutes;
          }

          groupedSessions[date].sessions.push({
            id: session.id,
            timestamp: session.started_at,
            duration: session.duration_minutes,
            projectId: session.project_id,
            description: session.description || '',
            mode: session.mode,
            wasSuccessful: session.was_successful,
            tags: session.tags || []
          });
        });

        setSessions(groupedSessions);
      } catch (error) {
        console.error('Error loading sessions from Supabase:', error);
        loadSessionsFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    const loadSessionsFromLocalStorage = () => {
      try {
        const stored = localStorage.getItem('pomodoroSessions');
        if (stored) {
          setSessions(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading sessions from localStorage:', error);
        setSessions({});
      } finally {
        setLoading(false);
      }
    };

    loadSessionsFromSupabase();
  }, [user]);

  // Save a completed session
  const saveSession = async (sessionData) => {
    const {
      mode,
      duration,
      projectId = null,
      description = '',
      wasSuccessful = true,
      startedAt,
      endedAt,
      tags = []
    } = sessionData;

    // Get the local date from the session's start time, not current time
    // This ensures sessions are grouped correctly even if saved on a different day
    const sessionStartTime = startedAt ? new Date(startedAt) : new Date(Date.now() - duration * 60 * 1000);
    const sessionDate = getLocalDateString(sessionStartTime);

    // Save to Supabase if user is authenticated
    if (user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('pomodoro_sessions')
          .insert([
            {
              user_id: user.id,
              project_id: projectId,
              mode: mode,
              started_at: startedAt || new Date(Date.now() - duration * 60 * 1000).toISOString(),
              ended_at: endedAt || new Date().toISOString(),
              duration_minutes: duration,
              was_successful: wasSuccessful,
              description: description,
              tags: tags
            }
          ])
          .select()
          .single();

        if (error) throw error;

        // Update local state with new session using the session's actual date
        setSessions(prev => {
          const prevDay = prev[sessionDate] || { completed: 0, totalMinutes: 0, sessions: [] };
          const newSession = {
            id: data.id,
            timestamp: data.started_at,
            duration: data.duration_minutes,
            projectId: data.project_id,
            description: data.description || '',
            mode: data.mode,
            wasSuccessful: data.was_successful,
            tags: data.tags || []
          };

          return {
            ...prev,
            [sessionDate]: {
              completed: mode === 'focus' ? prevDay.completed + 1 : prevDay.completed,
              totalMinutes: mode === 'focus' ? prevDay.totalMinutes + duration : prevDay.totalMinutes,
              sessions: [newSession, ...prevDay.sessions]
            }
          };
        });

        return { data, error: null };
      } catch (error) {
        console.error('Error saving session to Supabase:', error);
        // Fall back to localStorage
        saveToLocalStorage(sessionData, sessionDate);
        return { data: null, error };
      }
    } else {
      // Save to localStorage only
      saveToLocalStorage(sessionData, sessionDate);
      return { data: null, error: null };
    }
  };

  const saveToLocalStorage = (sessionData, today) => {
    const { mode, duration, projectId, projectName, description, tags = [] } = sessionData;

    const localSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (!localSessions[today]) {
      localSessions[today] = {
        completed: 0,
        totalMinutes: 0,
        sessions: []
      };
    }

    const newSession = {
      timestamp: new Date().toISOString(),
      duration: duration,
      projectId: projectId || null,
      projectName: projectName || null,
      description: description || '',
      mode: mode,
      tags: tags || []
    };

    // Only count focus sessions
    if (mode === 'focus') {
      localSessions[today].completed += 1;
      localSessions[today].totalMinutes += duration;
    }

    localSessions[today].sessions.unshift(newSession);
    localStorage.setItem('pomodoroSessions', JSON.stringify(localSessions));

    // Update local state
    setSessions(localSessions);
  };

  // Get sessions for a specific date range
  const getSessionsForDateRange = (startDate, endDate) => {
    const filtered = {};
    const start = new Date(startDate);
    const end = new Date(endDate);

    Object.keys(sessions).forEach(dateStr => {
      const date = new Date(dateStr);
      if (date >= start && date <= end) {
        filtered[dateStr] = sessions[dateStr];
      }
    });

    return filtered;
  };

  // Get total stats
  const getTotalStats = () => {
    let totalCompleted = 0;
    let totalMinutes = 0;

    Object.values(sessions).forEach(day => {
      totalCompleted += day.completed || 0;
      totalMinutes += day.totalMinutes || 0;
    });

    return { totalCompleted, totalMinutes };
  };

  return {
    sessions,
    loading,
    saveSession,
    getSessionsForDateRange,
    getTotalStats
  };
};
