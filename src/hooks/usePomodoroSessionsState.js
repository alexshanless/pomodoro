import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { useProjects } from './useProjects';
import { enqueueSync, getPendingSync, removeSynced, isPendingSyncId } from '../utils/syncQueue';

// Insert a session into the grouped-by-date state shape.
const addSessionToDay = (prev, sessionDate, session) => {
  const prevDay = prev[sessionDate] || { completed: 0, totalMinutes: 0, sessions: [] };
  const isFocus = session.mode === 'focus';
  return {
    ...prev,
    [sessionDate]: {
      completed: isFocus ? prevDay.completed + 1 : prevDay.completed,
      totalMinutes: isFocus ? prevDay.totalMinutes + session.duration : prevDay.totalMinutes,
      sessions: [session, ...prevDay.sessions]
    }
  };
};

// State implementation; consumers use the context-backed re-export below.
export const usePomodoroSessionsState = () => {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { projects, updateProject } = useProjects();
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const isDrainingRef = useRef(false);

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

        // Include queued-but-unsynced saves so they stay visible while offline.
        let merged = groupedSessions;
        getPendingSync('session.save')
          .filter(item => item.payload.row.user_id === user.id)
          .forEach(item => {
            const { row, sessionDate } = item.payload;
            merged = addSessionToDay(merged, sessionDate, {
              id: item.id,
              timestamp: row.started_at,
              duration: row.duration_minutes,
              projectId: row.project_id,
              description: row.description || '',
              mode: row.mode,
              wasSuccessful: row.was_successful,
              tags: row.tags || []
            });
          });

        setSessions(merged);
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

  // Replay queued session saves once signed in and back online. Applies the
  // project timeTracked delta here too — the original attempt skipped it
  // (callers skip updateProject when saveSession reports queued: true).
  useEffect(() => {
    if (!user || !isOnline || !isSupabaseConfigured || !supabase) return;
    if (isDrainingRef.current) return;
    const pending = getPendingSync('session.save')
      .filter(item => item.payload.row.user_id === user.id);
    if (pending.length === 0) return;
    isDrainingRef.current = true;

    (async () => {
      try {
        for (const item of pending) {
          const { row, sessionDate } = item.payload;
          const { data, error } = await supabase
            .from('pomodoro_sessions')
            .insert([row])
            .select()
            .single();
          if (error) throw error;
          removeSynced([item.id]);

          const realSession = {
            id: data.id,
            timestamp: data.started_at,
            duration: data.duration_minutes,
            projectId: data.project_id,
            description: data.description || '',
            mode: data.mode,
            wasSuccessful: data.was_successful,
            tags: data.tags || []
          };

          setSessions(prev => {
            const day = prev[sessionDate];
            const idx = day ? day.sessions.findIndex(s => s.id === item.id) : -1;
            if (idx === -1) return addSessionToDay(prev, sessionDate, realSession);
            const updated = [...day.sessions];
            updated[idx] = realSession;
            return { ...prev, [sessionDate]: { ...day, sessions: updated } };
          });

          if (row.project_id && row.mode === 'focus') {
            const project = projects.find(p => p.id === row.project_id);
            if (project) {
              await updateProject(project.id, {
                timeTracked: (project.timeTracked || 0) + row.duration_minutes
              });
            }
          }
        }
      } catch (error) {
        console.error('Session sync replay failed; will retry on next reconnect:', error);
      } finally {
        isDrainingRef.current = false;
      }
    })();
  }, [user, isOnline, projects, updateProject]);

  // Save a completed session
  const saveSession = async (sessionData) => {
    const {
      mode,
      duration,
      projectId = null,
      taskId = null,
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
              task_id: taskId,
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
        setSessions(prev => addSessionToDay(prev, sessionDate, {
          id: data.id,
          timestamp: data.started_at,
          duration: data.duration_minutes,
          projectId: data.project_id,
          description: data.description || '',
          mode: data.mode,
          wasSuccessful: data.was_successful,
          tags: data.tags || []
        }));

        return { data, error: null };
      } catch (error) {
        console.error('Error saving session to Supabase, queueing for sync:', error);

        // Persist the write so it survives reload and replays on reconnect.
        const row = {
          user_id: user.id,
          project_id: projectId,
          task_id: taskId,
          mode,
          started_at: startedAt || new Date(Date.now() - duration * 60 * 1000).toISOString(),
          ended_at: endedAt || new Date().toISOString(),
          duration_minutes: duration,
          was_successful: wasSuccessful,
          description,
          tags
        };
        const queuedItem = enqueueSync('session.save', { row, sessionDate });

        // Optimistic entry so the session is visible before the sync lands.
        setSessions(prev => addSessionToDay(prev, sessionDate, {
          id: queuedItem.id,
          timestamp: row.started_at,
          duration,
          projectId,
          description,
          mode,
          wasSuccessful,
          tags
        }));

        return { data: null, error: null, queued: true };
      }
    } else {
      // Save to localStorage only
      saveToLocalStorage(sessionData, sessionDate);
      return { data: null, error: null };
    }
  };

  const saveToLocalStorage = (sessionData, today) => {
    const { mode, duration, projectId, taskId, projectName, description, startedAt, tags = [] } = sessionData;

    const localSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (!localSessions[today]) {
      localSessions[today] = {
        completed: 0,
        totalMinutes: 0,
        sessions: []
      };
    }

    const newSession = {
      timestamp: startedAt || new Date().toISOString(),
      duration: duration,
      projectId: projectId || null,
      taskId: taskId || null,
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

  // Recompute a day's counters from its sessions (focus only).
  const recalcDay = (day) => {
    const focus = day.sessions.filter((s) => s.mode === 'focus');
    return {
      ...day,
      completed: focus.length,
      totalMinutes: focus.reduce((sum, s) => sum + s.duration, 0)
    };
  };

  // Move/replace a session across the grouped-by-date shape. Removes the
  // original (matched by id, falling back to timestamp) from oldDate and
  // inserts the updated session under newDate.
  const applySessionUpdate = (grouped, oldDate, newDate, matcher, updated) => {
    const next = { ...grouped };
    const oldDay = next[oldDate];
    if (oldDay) {
      const kept = oldDay.sessions.filter((s) => !matcher(s));
      if (kept.length === 0 && oldDate !== newDate) {
        delete next[oldDate];
      } else {
        next[oldDate] = recalcDay({ ...oldDay, sessions: kept });
      }
    }
    const targetDay = next[newDate] || { completed: 0, totalMinutes: 0, sessions: [] };
    const sessions = [updated, ...targetDay.sessions].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    next[newDate] = recalcDay({ ...targetDay, sessions });
    return next;
  };

  // Edit a session's fields (duration, description, project, start, tags).
  // Callers own the project timeTracked adjustments, mirroring how Timer
  // call sites apply deltas after saveSession.
  const updateSession = async (sessionId, sessionDate, sessionTimestamp, updates) => {
    if (isPendingSyncId(sessionId)) {
      return { error: 'This session is still syncing — try again in a moment.' };
    }

    const startedAt = updates.startedAt || sessionTimestamp;
    const newDate = getLocalDateString(new Date(startedAt));
    const matcher = (s) => (sessionId && s.id ? s.id === sessionId : s.timestamp === sessionTimestamp);

    const updatedFields = {
      timestamp: startedAt,
      duration: updates.duration,
      projectId: updates.projectId ?? null,
      description: updates.description || '',
      tags: updates.tags || []
    };

    if (user && isSupabaseConfigured && supabase && sessionId) {
      try {
        const { data, error } = await supabase
          .from('pomodoro_sessions')
          .update({
            project_id: updates.projectId ?? null,
            duration_minutes: updates.duration,
            description: updates.description || '',
            started_at: startedAt,
            ended_at: new Date(new Date(startedAt).getTime() + updates.duration * 60000).toISOString(),
            tags: updates.tags || []
          })
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;

        setSessions((prev) => applySessionUpdate(prev, sessionDate, newDate, matcher, {
          id: data.id,
          timestamp: data.started_at,
          duration: data.duration_minutes,
          projectId: data.project_id,
          description: data.description || '',
          mode: data.mode,
          wasSuccessful: data.was_successful,
          tags: data.tags || []
        }));
        return { error: null };
      } catch (err) {
        console.error('Error updating session in Supabase:', err);
        return { error: err.message };
      }
    }

    // localStorage path (guests / offline fallback)
    try {
      const stored = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
      const day = stored[sessionDate];
      const existing = day?.sessions?.find(matcher);
      if (!existing) {
        return { error: 'Session not found' };
      }
      const updated = { ...existing, ...updatedFields };
      const next = applySessionUpdate(stored, sessionDate, newDate, matcher, updated);
      localStorage.setItem('pomodoroSessions', JSON.stringify(next));
      setSessions((prev) => applySessionUpdate(prev, sessionDate, newDate, matcher, updated));
      return { error: null };
    } catch (err) {
      console.error('Error updating session in localStorage:', err);
      return { error: err.message };
    }
  };

  // Delete a session by id (Supabase) and/or timestamp (localStorage fallback)
  const deleteSession = async (sessionId, sessionDate, sessionTimestamp) => {
    // Queued-but-unsynced session: cancel the pending sync instead.
    if (isPendingSyncId(sessionId)) {
      removeSynced([sessionId]);
    } else if (user && isSupabaseConfigured && supabase && sessionId) {
      try {
        const { error } = await supabase
          .from('pomodoro_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (err) {
        console.error('Error deleting session from Supabase:', err);
      }
    }

    const shouldRemove = (s) => {
      if (sessionId && s.id) return s.id === sessionId;
      return s.timestamp === sessionTimestamp;
    };

    const stored = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
    if (stored[sessionDate]?.sessions) {
      stored[sessionDate].sessions = stored[sessionDate].sessions.filter((s) => !shouldRemove(s));
      if (stored[sessionDate].sessions.length === 0) {
        delete stored[sessionDate];
      } else {
        const focusSessions = stored[sessionDate].sessions.filter((s) => s.mode === 'focus');
        stored[sessionDate].completed = focusSessions.length;
        stored[sessionDate].totalMinutes = focusSessions.reduce((sum, s) => sum + s.duration, 0);
      }
      localStorage.setItem('pomodoroSessions', JSON.stringify(stored));
    }

    setSessions((prev) => {
      if (!prev[sessionDate]) return prev;
      const kept = prev[sessionDate].sessions.filter((s) => !shouldRemove(s));
      if (kept.length === 0) {
        const next = { ...prev };
        delete next[sessionDate];
        return next;
      }
      const focusSessions = kept.filter((s) => s.mode === 'focus');
      return {
        ...prev,
        [sessionDate]: {
          ...prev[sessionDate],
          sessions: kept,
          completed: focusSessions.length,
          totalMinutes: focusSessions.reduce((sum, s) => sum + s.duration, 0),
        },
      };
    });
  };

  return {
    sessions,
    loading,
    saveSession,
    updateSession,
    deleteSession,
    getSessionsForDateRange,
    getTotalStats
  };
};
