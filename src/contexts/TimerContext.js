import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useDialog } from './DialogContext';
import { usePomodoroSessions } from '../hooks/usePomodoroSessions';
import { useProjects } from '../hooks/useProjects';
import { useGoalsStreaks } from '../hooks/useGoalsStreaks';
import { useUserSettings } from '../hooks/useUserSettings';
import { validateDescription, validateTag } from '../utils/validation';
import { announce } from '../utils/accessibility';
import {
  ensurePushSubscription,
  scheduleCompletionPush,
  cancelCompletionPush
} from '../utils/pushNotifications';

// localStorage key constants (shared contract with App.js music check)
export const STORAGE_KEYS = {
  TIMER_STATE: 'pomodoroTimerState',
  SESSION_START_TIME: 'sessionStartTime',
  SESSION_PAUSE_START_TIME: 'sessionPauseStartTime',
  TOTAL_PAUSED_TIME: 'totalPausedTime',
  IS_IN_ACTIVE_SESSION: 'isInActiveSession',
  POMODORO_SETTINGS: 'pomodoroSettings',
  NOTIFICATION_SETTINGS: 'notificationSettings'
};

export const MODES = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
};

const SESSION_TICK_MS = 1000;
const MIDNIGHT_CHECK_MS = 60000;

// Helper: local date in YYYY-MM-DD format
export const getLocalDateString = (date) => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TimerContext = createContext(null);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { showToast, confirm } = useDialog();
  const { saveSession, sessions: pomodoroSessions } = usePomodoroSessions();
  const { projects, updateProject, loading: projectsLoading } = useProjects();
  const { updateStreak } = useGoalsStreaks();
  const { selectedProjectId: savedProjectId, saveSelectedProject } = useUserSettings();

  // ---- Settings ----
  const loadSettings = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.POMODORO_SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.continuousTracking === undefined) parsed.continuousTracking = true;
      if (parsed.includeBreaksInTracking === undefined) parsed.includeBreaksInTracking = false;
      return parsed;
    }
    return {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      longBreakInterval: 4,
      completionSound: true,
      continuousTracking: true,
      includeBreaksInTracking: false
    };
  };

  const [settings, setSettings] = useState(loadSettings());

  const DURATIONS = {
    [MODES.FOCUS]: settings.focusDuration * 60,
    [MODES.SHORT_BREAK]: settings.shortBreakDuration * 60,
    [MODES.LONG_BREAK]: settings.longBreakDuration * 60
  };

  // ---- Session restore gating ----
  const shouldRestoreSession = () => {
    const savedTimerState = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (!savedTimerState) return false;
    try {
      const state = JSON.parse(savedTimerState);
      return state.date === getLocalDateString();
    } catch {
      return false;
    }
  };
  const canRestoreSession = shouldRestoreSession();

  const [sessionStartTime, setSessionStartTime] = useState(() => {
    if (!canRestoreSession) return null;
    const saved = localStorage.getItem(STORAGE_KEYS.SESSION_START_TIME);
    return saved ? new Date(saved) : null;
  });
  const [sessionPauseStartTime, setSessionPauseStartTime] = useState(() => {
    if (!canRestoreSession) return null;
    const saved = localStorage.getItem(STORAGE_KEYS.SESSION_PAUSE_START_TIME);
    return saved ? parseInt(saved) : null;
  });
  const [totalPausedTime, setTotalPausedTime] = useState(() => {
    if (!canRestoreSession) return 0;
    const saved = localStorage.getItem(STORAGE_KEYS.TOTAL_PAUSED_TIME);
    return saved ? parseInt(saved) : 0;
  });
  const [isInActiveSession, setIsInActiveSession] = useState(() => {
    if (!canRestoreSession) return false;
    return localStorage.getItem(STORAGE_KEYS.IS_IN_ACTIVE_SESSION) === 'true';
  });

  // Live re-render tick for in-progress session duration/earnings
  const [, setSessionTick] = useState(0);

  const [selectedProject, setSelectedProject] = useState(null);
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionTags, setSessionTags] = useState([]);

  // ---- Timer engine state ----
  const loadTimerState = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (saved) {
      const state = JSON.parse(saved);
      if (state.date === getLocalDateString()) {
        if (state.timerOn && !state.isPaused && state.targetEndTime) {
          const newTimeRemaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
          return {
            ...state,
            timeRemaining: newTimeRemaining,
            timerOn: newTimeRemaining > 0,
            isPaused: false,
            timerCompletedWhileAway: newTimeRemaining === 0
          };
        }
        return state;
      }
    }
    return {
      currentMode: MODES.FOCUS,
      timeRemaining: DURATIONS[MODES.FOCUS],
      timerOn: false,
      isPaused: false,
      totalTimeWorked: 0,
      totalBreakTime: 0,
      pomodorosCompleted: 0,
      showCompletionMessage: false,
      date: getLocalDateString(),
      targetEndTime: null,
      timerCompletedWhileAway: false
    };
  };

  const initialState = loadTimerState();

  const [currentMode, setCurrentMode] = useState(initialState.currentMode);
  const [timeRemaining, setTimeRemaining] = useState(initialState.timeRemaining);
  const [timerOn, setTimerOn] = useState(initialState.timerOn);
  const [isPaused, setIsPaused] = useState(initialState.isPaused);
  const [totalTimeWorked, setTotalTimeWorked] = useState(initialState.totalTimeWorked);
  const [totalBreakTime, setTotalBreakTime] = useState(initialState.totalBreakTime || 0);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(initialState.pomodorosCompleted);
  const [showCompletionMessage, setShowCompletionMessage] = useState(initialState.showCompletionMessage);
  const [targetEndTime, setTargetEndTime] = useState(initialState.targetEndTime);

  const timerWorkerRef = useRef(null);
  const handleTimerCompleteRef = useRef(null);
  const audioContextRef = useRef(null);

  const completionPercentage = (timeRemaining / DURATIONS[currentMode]) * 100;

  // ---- Streaks: recompute whenever sessions change (runs on any route) ----
  useEffect(() => {
    if (Object.keys(pomodoroSessions).length > 0) {
      updateStreak(pomodoroSessions);
    }
  }, [pomodoroSessions, updateStreak]);

  // Clear stale session data on mount if not restoring today's session
  useEffect(() => {
    if (!canRestoreSession) {
      localStorage.removeItem(STORAGE_KEYS.SESSION_START_TIME);
      localStorage.removeItem(STORAGE_KEYS.SESSION_PAUSE_START_TIME);
      localStorage.removeItem(STORAGE_KEYS.TOTAL_PAUSED_TIME);
      localStorage.removeItem(STORAGE_KEYS.IS_IN_ACTIVE_SESSION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selected project with loaded projects (Supabase-only)
  useEffect(() => {
    if (projectsLoading) return;

    if (!savedProjectId) {
      if (selectedProject !== null) setSelectedProject(null);
      return;
    }

    if (projects.length === 0) {
      if (selectedProject !== null) {
        setSelectedProject(null);
        saveSelectedProject(null);
      }
      return;
    }

    const matchingProject = projects.find(p => p.id === savedProjectId);
    if (matchingProject) {
      if (selectedProject?.id !== matchingProject.id || selectedProject?.timeTracked !== matchingProject.timeTracked) {
        setSelectedProject(matchingProject);
      }
    } else {
      setSelectedProject(null);
      saveSelectedProject(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, savedProjectId, projectsLoading]);

  // Persist session state
  useEffect(() => {
    if (sessionStartTime) {
      localStorage.setItem(STORAGE_KEYS.SESSION_START_TIME, sessionStartTime.toISOString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_START_TIME);
    }
  }, [sessionStartTime]);

  useEffect(() => {
    if (sessionPauseStartTime) {
      localStorage.setItem(STORAGE_KEYS.SESSION_PAUSE_START_TIME, sessionPauseStartTime.toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_PAUSE_START_TIME);
    }
  }, [sessionPauseStartTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOTAL_PAUSED_TIME, totalPausedTime.toString());
  }, [totalPausedTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_IN_ACTIVE_SESSION, isInActiveSession.toString());
  }, [isInActiveSession]);

  // Start session tracking if user logs in while timer is already running
  useEffect(() => {
    if (user && timerOn && !isInActiveSession) {
      setSessionStartTime(new Date());
      setIsInActiveSession(true);
      setTotalPausedTime(0);
    }
  }, [user, timerOn, isInActiveSession]);

  // Persist timer state (shared contract read by the App.js music check)
  useEffect(() => {
    const state = {
      currentMode,
      timeRemaining,
      timerOn,
      isPaused,
      totalTimeWorked,
      totalBreakTime,
      pomodorosCompleted,
      showCompletionMessage,
      date: getLocalDateString(),
      targetEndTime: (timerOn && !isPaused) ? targetEndTime : null
    };
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
  }, [currentMode, timeRemaining, totalTimeWorked, totalBreakTime, pomodorosCompleted, showCompletionMessage, timerOn, isPaused, targetEndTime]);

  // ---- Completion sound: single reusable AudioContext ----
  const playCompletionSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const playTone = (frequency, startOffset) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        const startAt = audioContext.currentTime + startOffset;
        gainNode.gain.setValueAtTime(0.3, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + 0.15);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.15);
      };

      playTone(523.25, 0);    // C5
      playTone(659.25, 0.15); // E5
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  };

  // ---- Worker lifecycle ----
  useEffect(() => {
    timerWorkerRef.current = new Worker(`${process.env.PUBLIC_URL}/timer-worker.js`);

    timerWorkerRef.current.onmessage = (e) => {
      const { type, timeRemaining: workerTimeRemaining } = e.data;
      if (type === 'TICK') {
        setTimeRemaining(workerTimeRemaining);
      } else if (type === 'COMPLETE') {
        setTimerOn(false);
        setIsPaused(false);
        if (handleTimerCompleteRef.current) {
          handleTimerCompleteRef.current();
        }
      }
    };

    return () => {
      if (timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ type: 'STOP' });
        timerWorkerRef.current.terminate();
      }
    };
  }, []);

  // Control the worker based on timer state
  useEffect(() => {
    if (!timerWorkerRef.current) return;
    if (timerOn && !isPaused) {
      const endTime = targetEndTime || (Date.now() + timeRemaining * 1000);
      setTargetEndTime(endTime);
      timerWorkerRef.current.postMessage({ type: 'START', endTime });
    } else {
      timerWorkerRef.current.postMessage({ type: 'STOP' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerOn, isPaused]);

  // Reconcile with worker when the tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timerOn && !isPaused && targetEndTime && timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ type: 'CHECK' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerOn, isPaused, targetEndTime]);

  const autoStartTimer = (duration, mode) => {
    const endTime = Date.now() + duration * 1000;
    setTargetEndTime(endTime);
    setTimerOn(true);
    setIsPaused(false);
    setShowCompletionMessage(false);
    if (timerWorkerRef.current) {
      timerWorkerRef.current.postMessage({ type: 'START', endTime });
    }
    ensurePushSubscription(user);
    scheduleCompletionPush(user, endTime, mode);
  };

  const stopTimerWithSessionPause = () => {
    setShowCompletionMessage(true);
    if (user && settings.continuousTracking && !sessionPauseStartTime) {
      setSessionPauseStartTime(Date.now());
    }
  };

  const handleTimerComplete = () => {
    cancelCompletionPush(user);
    setTargetEndTime(null);

    if (settings.completionSound) {
      playCompletionSound();
    }

    const notificationSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS) || '{}');
    if ('Notification' in window && Notification.permission === 'granted') {
      const showTimerNotification = (title, body, tag) => {
        if (navigator.serviceWorker) {
          navigator.serviceWorker.ready.then(reg =>
            reg.showNotification(title, { body, icon: '/logo192.png', tag })
          );
        } else {
          new Notification(title, { body, icon: '/logo192.png', tag }); // eslint-disable-line no-new
        }
      };
      if (currentMode === MODES.FOCUS && notificationSettings.pomodoroComplete) {
        showTimerNotification(
          'Pomodoro Complete! 🎉',
          'Great work! Time for a break. (Your session continues running)',
          'pomodoro-complete'
        );
      } else if (currentMode !== MODES.FOCUS && notificationSettings.breakComplete) {
        showTimerNotification(
          'Break Complete! ✨',
          'Time to get back to work! (Your session is still running)',
          'break-complete'
        );
      }
    }

    if (currentMode === MODES.FOCUS) {
      if (user && sessionStartTime) {
        const endTime = new Date();
        const startTime = sessionStartTime;

        // Compute saved duration from actual elapsed timestamps (consistent with
        // getCurrentSessionDuration / live earnings) for both continuous and regular mode.
        let elapsedMs = endTime.getTime() - startTime.getTime() - totalPausedTime;
        if (sessionPauseStartTime) {
          elapsedMs -= (endTime.getTime() - sessionPauseStartTime);
        }
        const pomoDurationMinutes = Math.round(elapsedMs / 1000 / 60);

        if (pomoDurationMinutes >= 1) {
          const descValidation = validateDescription(sessionDescription, 500);
          const sanitizedDescription = descValidation.isValid ? descValidation.sanitized : '';

          const sanitizedTags = sessionTags.filter(tag => {
            const tagValidation = validateTag(tag);
            return tagValidation.isValid;
          }).map(tag => validateTag(tag).sanitized);

          const sessionData = {
            mode: 'focus',
            duration: pomoDurationMinutes,
            projectId: selectedProject?.id || null,
            projectName: selectedProject?.name || null,
            description: sanitizedDescription,
            wasSuccessful: true,
            startedAt: startTime.toISOString(),
            endedAt: endTime.toISOString(),
            tags: sanitizedTags
          };

          saveSession(sessionData).then(result => {
            // Queued saves apply the timeTracked delta on sync replay instead.
            if (result?.queued || !selectedProject || !updateProject) return;
            return updateProject(selectedProject.id, {
              timeTracked: (selectedProject.timeTracked || 0) + pomoDurationMinutes
            });
          }).catch(error => {
            console.error('Failed to save session:', error);
          });
        }

        if (!settings.continuousTracking) {
          setSessionStartTime(null);
          setIsInActiveSession(false);
          setTotalPausedTime(0);
          setSessionPauseStartTime(null);
          setSessionDescription('');
          setSessionTags([]);
        } else {
          setSessionStartTime(new Date());
          setTotalPausedTime(0);
          setSessionPauseStartTime(null);
          setTotalBreakTime(0);
        }
      }

      setTotalTimeWorked(prev => prev + DURATIONS[MODES.FOCUS]);
      const newPomodorosCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newPomodorosCount);

      const nextMode = newPomodorosCount > 0 && newPomodorosCount % settings.longBreakInterval === 0
        ? MODES.LONG_BREAK
        : MODES.SHORT_BREAK;

      setCurrentMode(nextMode);
      const nextDuration = DURATIONS[nextMode];
      setTimeRemaining(nextDuration);
      announce(
        nextMode === MODES.LONG_BREAK
          ? 'Focus session complete. Starting long break.'
          : 'Focus session complete. Starting short break.',
        'assertive'
      );

      if (settings.autoStartBreaks) {
        autoStartTimer(nextDuration, nextMode);
      } else {
        stopTimerWithSessionPause();
      }
      return;
    }

    // Break completed
    setTotalBreakTime(prev => prev + DURATIONS[currentMode]);

    if (user && settings.continuousTracking) {
      setSessionStartTime(new Date());
      setTotalPausedTime(0);
      setSessionPauseStartTime(null);
    }

    setCurrentMode(MODES.FOCUS);
    const focusDuration = DURATIONS[MODES.FOCUS];
    setTimeRemaining(focusDuration);
    announce('Break complete. Starting focus session.', 'assertive');

    if (settings.autoStartPomodoros) {
      autoStartTimer(focusDuration, MODES.FOCUS);
    } else {
      stopTimerWithSessionPause();
    }
  };

  useEffect(() => {
    handleTimerCompleteRef.current = handleTimerComplete;
  });

  // Complete-while-away replay: defer until auth resolved and projects hydrated so the
  // saved session is attributed to the right user/project instead of racing hydration.
  const pendingAwayCompletionRef = useRef(initialState.timerCompletedWhileAway === true);
  useEffect(() => {
    if (!pendingAwayCompletionRef.current) return;
    if (authLoading || projectsLoading) return;
    // A persisted sessionStartTime implies a signed-in session; wait for auth to resolve it.
    if (sessionStartTime && !user) return;
    // Wait until the persisted project id has been rehydrated into selectedProject.
    if (savedProjectId && projects.length > 0) {
      const match = projects.find(p => p.id === savedProjectId);
      if (match && selectedProject?.id !== match.id) return;
    }
    pendingAwayCompletionRef.current = false;
    if (handleTimerCompleteRef.current) {
      handleTimerCompleteRef.current();
    }
  }, [authLoading, projectsLoading, user, projects, savedProjectId, selectedProject, sessionStartTime]);

  // ---- Live session duration / earnings ----
  const getCurrentSessionDuration = () => {
    if (!sessionStartTime) return 0;
    let totalMinutes = 0;

    if (settings.continuousTracking) {
      const completedFocusMinutes = Math.floor(totalTimeWorked / 60);
      const completedBreakMinutes = settings.includeBreaksInTracking ? Math.floor(totalBreakTime / 60) : 0;
      totalMinutes = completedFocusMinutes + completedBreakMinutes;

      const now = Date.now();
      let currentElapsed = now - sessionStartTime.getTime() - totalPausedTime;
      if (sessionPauseStartTime) {
        currentElapsed -= (now - sessionPauseStartTime);
      }
      if (currentMode === MODES.FOCUS || settings.includeBreaksInTracking) {
        totalMinutes += Math.floor(currentElapsed / 1000 / 60);
      }
    } else {
      const now = Date.now();
      let elapsed = now - sessionStartTime.getTime() - totalPausedTime;
      if (sessionPauseStartTime) {
        elapsed -= (now - sessionPauseStartTime);
      }
      totalMinutes = Math.floor(elapsed / 1000 / 60);
    }

    return Math.max(0, totalMinutes);
  };

  const formatSessionDuration = () => {
    const minutes = getCurrentSessionDuration();
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateCurrentEarnings = () => {
    if (!selectedProject?.rate) return '0.00';
    const minutes = getCurrentSessionDuration();
    return ((minutes / 60) * selectedProject.rate).toFixed(2);
  };

  // Re-render every second while a session is active so live figures update
  useEffect(() => {
    if (isInActiveSession && sessionStartTime) {
      const interval = setInterval(() => {
        setSessionTick(prev => prev + 1);
      }, SESSION_TICK_MS);
      return () => clearInterval(interval);
    }
  }, [isInActiveSession, sessionStartTime]);

  // Midnight transition: auto-save paused sessions when the date changes
  useEffect(() => {
    if (!user || !isInActiveSession || !sessionStartTime) return;

    const checkInterval = setInterval(() => {
      const sessionDate = getLocalDateString(sessionStartTime);
      const currentDate = getLocalDateString();

      if (sessionDate !== currentDate && (isPaused || !timerOn)) {
        const endOfPreviousDay = new Date(sessionStartTime);
        endOfPreviousDay.setDate(endOfPreviousDay.getDate() + 1);
        endOfPreviousDay.setHours(0, 0, 0, 0);
        const endTime = endOfPreviousDay;
        const startTime = sessionStartTime;

        let workDurationMs = endTime.getTime() - startTime.getTime() - totalPausedTime;
        if (sessionPauseStartTime) {
          const pauseBeforeMidnight = Math.max(0, endTime.getTime() - sessionPauseStartTime);
          workDurationMs -= pauseBeforeMidnight;
        }

        let totalDurationMinutes;
        if (settings.includeBreaksInTracking) {
          totalDurationMinutes = Math.round(workDurationMs / 1000 / 60);
        } else {
          const breakMs = totalBreakTime * 1000;
          totalDurationMinutes = Math.max(0, Math.round((workDurationMs - breakMs) / 1000 / 60));
        }

        if (totalDurationMinutes >= 1) {
          const sessionData = {
            mode: 'focus',
            duration: totalDurationMinutes,
            projectId: selectedProject?.id || null,
            projectName: selectedProject?.name || null,
            description: sessionDescription || '',
            wasSuccessful: true,
            startedAt: startTime.toISOString(),
            endedAt: endTime.toISOString(),
            tags: sessionTags
          };

          saveSession(sessionData).then(result => {
            if (result?.queued || !selectedProject || !updateProject) return;
            return updateProject(selectedProject.id, {
              timeTracked: (selectedProject.timeTracked || 0) + totalDurationMinutes
            });
          }).catch(error => {
            console.error('[Midnight Transition] Failed to save previous day session:', error);
          });
        }

        setSessionStartTime(new Date());
        setTotalPausedTime(0);
        setTotalBreakTime(0);
        if (sessionPauseStartTime) {
          setSessionPauseStartTime(Date.now());
        }
      }
    }, MIDNIGHT_CHECK_MS);

    return () => clearInterval(checkInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInActiveSession, sessionStartTime, isPaused, timerOn, totalPausedTime, sessionPauseStartTime, settings.includeBreaksInTracking, totalBreakTime, selectedProject, sessionDescription, sessionTags]);

  // ---- Controls ----
  const handleStartTimer = () => {
    setShowCompletionMessage(false);

    // Ask for notification permission on first start so completion alerts work on any route.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const endTime = Date.now() + timeRemaining * 1000;
    setTargetEndTime(endTime);
    setTimerOn(true);
    setIsPaused(false);
    ensurePushSubscription(user);
    scheduleCompletionPush(user, endTime, currentMode);

    if (user && !isInActiveSession) {
      setSessionStartTime(new Date());
      setIsInActiveSession(true);
      setTotalPausedTime(0);
    } else if (user && sessionPauseStartTime) {
      const pauseDuration = Date.now() - sessionPauseStartTime;
      setTotalPausedTime(prev => prev + pauseDuration);
      setSessionPauseStartTime(null);
    }
  };

  const handlePauseTimer = () => {
    cancelCompletionPush(user);
    setIsPaused(true);
    if (user) {
      setSessionPauseStartTime(Date.now());
    }
  };

  const handleResumeTimer = () => {
    if (sessionPauseStartTime) {
      const pauseDuration = Date.now() - sessionPauseStartTime;
      setTotalPausedTime(prev => prev + pauseDuration);
      setSessionPauseStartTime(null);
    }
    const endTime = Date.now() + timeRemaining * 1000;
    setTargetEndTime(endTime);
    setIsPaused(false);
    ensurePushSubscription(user);
    scheduleCompletionPush(user, endTime, currentMode);
  };

  const handleResetTimer = async () => {
    cancelCompletionPush(user);
    if ((timerOn || isPaused) && isInActiveSession && sessionStartTime) {
      const endTime = new Date();
      const startTime = sessionStartTime;

      let unsavedElapsedMs = endTime.getTime() - startTime.getTime() - totalPausedTime;
      if (isPaused && sessionPauseStartTime) {
        unsavedElapsedMs -= (Date.now() - sessionPauseStartTime);
      }

      let totalDurationMinutes;
      if (settings.includeBreaksInTracking) {
        totalDurationMinutes = Math.round(unsavedElapsedMs / 1000 / 60);
      } else {
        const breakMs = totalBreakTime * 1000;
        let currentBreakMs = 0;
        if (currentMode !== MODES.FOCUS && timerOn) {
          currentBreakMs = (DURATIONS[currentMode] - timeRemaining) * 1000;
        }
        totalDurationMinutes = Math.max(0, Math.round((unsavedElapsedMs - breakMs - currentBreakMs) / 1000 / 60));
      }

      if (totalDurationMinutes >= 1) {
        const sessionData = {
          mode: 'focus',
          duration: totalDurationMinutes,
          projectId: selectedProject?.id || null,
          projectName: selectedProject?.name || null,
          description: sessionDescription || '',
          wasSuccessful: true,
          startedAt: startTime.toISOString(),
          endedAt: endTime.toISOString(),
          tags: sessionTags
        };

        try {
          const saveResult = await saveSession(sessionData);
          if (!saveResult?.queued && selectedProject && updateProject) {
            const result = await updateProject(selectedProject.id, {
              timeTracked: (selectedProject.timeTracked || 0) + totalDurationMinutes
            });
            if (result.error) {
              console.error('Failed to update project stats:', result.error);
            }
          }
          setSessionDescription('');
          setSessionTags([]);
        } catch (error) {
          console.error('Failed to save session:', error);
        }
      }

      setSessionStartTime(null);
      setIsInActiveSession(false);
      setTotalPausedTime(0);
      setSessionPauseStartTime(null);
    }

    setTimerOn(false);
    setIsPaused(false);
    setTimeRemaining(DURATIONS[currentMode]);
    setTargetEndTime(null);
    setShowCompletionMessage(false);
    setTotalTimeWorked(0);
    setTotalBreakTime(0);
    setPomodorosCompleted(0);
  };

  const handleFinishEarly = async () => {
    if (!timerOn && !isPaused) return;
    if (!isInActiveSession || !sessionStartTime) return;
    cancelCompletionPush(user);

    const endTime = new Date();
    const startTime = sessionStartTime;

    let unsavedElapsedMs = endTime.getTime() - startTime.getTime() - totalPausedTime;
    if (isPaused && sessionPauseStartTime) {
      unsavedElapsedMs -= (Date.now() - sessionPauseStartTime);
    }

    let totalDurationMinutes;
    if (settings.includeBreaksInTracking) {
      totalDurationMinutes = Math.round(unsavedElapsedMs / 1000 / 60);
    } else {
      const breakMs = totalBreakTime * 1000;
      let currentBreakMs = 0;
      if (currentMode !== MODES.FOCUS && timerOn) {
        currentBreakMs = (DURATIONS[currentMode] - timeRemaining) * 1000;
      }
      totalDurationMinutes = Math.max(0, Math.round((unsavedElapsedMs - breakMs - currentBreakMs) / 1000 / 60));
    }

    const totalAccumulatedFocusMinutes = Math.round(totalTimeWorked / 60);
    const totalElapsedMinutes = Math.round(unsavedElapsedMs / 1000 / 60);

    const hasCompletedPomodoros = pomodorosCompleted > 0;
    const isEndingSession = settings.continuousTracking && hasCompletedPomodoros;

    if (totalDurationMinutes < 1 && !isEndingSession) {
      showToast('No unsaved work to save (less than 1 minute since last auto-save).', { type: 'info' });
      return;
    }

    let confirmMessage = '';
    if (totalDurationMinutes >= 1) {
      const pomodoroCount = hasCompletedPomodoros ? `\nCompleted pomodoros (already saved): ${pomodorosCompleted}` : '';
      const totalSaved = hasCompletedPomodoros ? `\nTotal already saved: ${totalAccumulatedFocusMinutes} min` : '';
      confirmMessage =
        `Save unsaved work and end session?\n` +
        `${pomodoroCount}${totalSaved}\n\n` +
        `Unsaved time since last auto-save: ${totalElapsedMinutes} min\n` +
        `Setting "Include breaks in tracking": ${settings.includeBreaksInTracking ? 'ON' : 'OFF'}\n\n` +
        `Will save: ${totalDurationMinutes} minutes`;
    } else {
      confirmMessage =
        `End this session?\n\n` +
        `Completed pomodoros (already saved): ${pomodorosCompleted}\n` +
        `Total already saved: ${totalAccumulatedFocusMinutes} min\n\n` +
        `No additional unsaved work to save.`;
    }

    const confirmed = await confirm(confirmMessage, {
      title: 'Finish & Save Session',
      confirmLabel: 'Save & End',
    });
    if (!confirmed) return;

    try {
      const descValidation = validateDescription(sessionDescription, 500);
      if (!descValidation.isValid) {
        showToast(`Description error: ${descValidation.errors[0]}`, { type: 'error' });
        return;
      }

      for (const tag of sessionTags) {
        const tagValidation = validateTag(tag);
        if (!tagValidation.isValid) {
          showToast(`Tag "${tag}" error: ${tagValidation.errors[0]}`, { type: 'error' });
          return;
        }
      }

      if (totalDurationMinutes >= 1) {
        const sessionData = {
          mode: 'focus',
          duration: totalDurationMinutes,
          projectId: selectedProject?.id || null,
          projectName: selectedProject?.name || null,
          description: descValidation.sanitized,
          wasSuccessful: true,
          startedAt: startTime.toISOString(),
          endedAt: endTime.toISOString(),
          tags: sessionTags.map(tag => validateTag(tag).sanitized)
        };

        const saveResult = await saveSession(sessionData);

        if (!saveResult?.queued && selectedProject && updateProject) {
          try {
            await updateProject(selectedProject.id, {
              timeTracked: (selectedProject.timeTracked || 0) + totalDurationMinutes
            });
          } catch (projectError) {
            console.error('Failed to update project stats:', projectError);
          }
        }
      }

      setSessionDescription('');
      setSessionTags([]);

      setSessionStartTime(null);
      setIsInActiveSession(false);
      setTotalPausedTime(0);
      setSessionPauseStartTime(null);

      setTimerOn(false);
      setIsPaused(false);
      setTimeRemaining(DURATIONS[currentMode]);
      setTargetEndTime(null);
      setShowCompletionMessage(false);
      setTotalTimeWorked(0);
      setTotalBreakTime(0);
      setPomodorosCompleted(0);

      const timeType = settings.includeBreaksInTracking ? 'total time' : 'focus time';
      showToast(`Session saved! ${totalDurationMinutes} minute${totalDurationMinutes !== 1 ? 's' : ''} of ${timeType} recorded.`, { type: 'success' });
    } catch (error) {
      console.error('Failed to save session:', error);
      showToast('Failed to save session. Please try again.', { type: 'error' });
    }
  };

  const switchMode = (newMode) => {
    cancelCompletionPush(user);
    setTimerOn(false);
    setCurrentMode(newMode);
    setTimeRemaining(DURATIONS[newMode]);
    setTargetEndTime(null);
    setShowCompletionMessage(false);
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.POMODORO_SETTINGS, JSON.stringify(newSettings));
    if (!timerOn) {
      const newDurations = {
        [MODES.FOCUS]: newSettings.focusDuration * 60,
        [MODES.SHORT_BREAK]: newSettings.shortBreakDuration * 60,
        [MODES.LONG_BREAK]: newSettings.longBreakDuration * 60
      };
      setTimeRemaining(newDurations[currentMode]);
    }
  };

  const adjustSetting = (key, delta, min, max) => {
    const next = Math.max(min, Math.min(max, settings[key] + delta));
    saveSettings({ ...settings, [key]: next });
  };

  const handleProjectChange = async (e) => {
    const projectId = e.target.value;

    if (isInActiveSession && sessionStartTime) {
      const switchConfirmed = await confirm(
        'You have an active session running. Switching projects will save and end your current session. Continue?',
        { title: 'Switch project?', confirmLabel: 'Switch & save' }
      );
      if (!switchConfirmed) return;

      const endTime = new Date();
      let totalDurationMinutes;
      if (settings.includeBreaksInTracking) {
        let totalDurationMs = endTime.getTime() - sessionStartTime.getTime() - totalPausedTime;
        if (isPaused && sessionPauseStartTime) {
          totalDurationMs -= (Date.now() - sessionPauseStartTime);
        }
        totalDurationMinutes = Math.round(totalDurationMs / 1000 / 60);
      } else {
        totalDurationMinutes = Math.round(totalTimeWorked / 60);
      }

      if (totalDurationMinutes >= 1) {
        const sessionData = {
          mode: 'focus',
          duration: totalDurationMinutes,
          projectId: selectedProject?.id || null,
          projectName: selectedProject?.name || null,
          description: sessionDescription || '',
          wasSuccessful: true,
          startedAt: sessionStartTime.toISOString(),
          endedAt: endTime.toISOString(),
          tags: sessionTags
        };

        try {
          const saveResult = await saveSession(sessionData);
          if (!saveResult?.queued && selectedProject && updateProject) {
            await updateProject(selectedProject.id, {
              timeTracked: (selectedProject.timeTracked || 0) + totalDurationMinutes
            });
          }
          setSessionDescription('');
          setSessionTags([]);
        } catch (error) {
          console.error('Failed to save session before project switch:', error);
        }
      }

      cancelCompletionPush(user);
      setSessionStartTime(null);
      setIsInActiveSession(false);
      setTotalPausedTime(0);
      setSessionPauseStartTime(null);
      setTimerOn(false);
      setIsPaused(false);
      setTimeRemaining(DURATIONS[currentMode]);
      setTargetEndTime(null);
      setShowCompletionMessage(false);
      setTotalTimeWorked(0);
    }

    const project = projects.find(p => p.id === projectId) || null;
    setSelectedProject(project);
    await saveSelectedProject(project?.id || null);
  };

  const displayTimeRemaining = useCallback(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timeRemaining]);

  const value = {
    MODES,
    // engine state
    currentMode,
    timeRemaining,
    timerOn,
    isPaused,
    totalTimeWorked,
    totalBreakTime,
    pomodorosCompleted,
    showCompletionMessage,
    completionPercentage,
    // session state
    sessionStartTime,
    isInActiveSession,
    selectedProject,
    sessionDescription,
    setSessionDescription,
    sessionTags,
    setSessionTags,
    // data
    projects,
    projectsLoading,
    pomodoroSessions,
    // settings
    settings,
    saveSettings,
    adjustSetting,
    // derived / display
    displayTimeRemaining,
    getCurrentSessionDuration,
    formatSessionDuration,
    calculateCurrentEarnings,
    // controls
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    handleFinishEarly,
    switchMode,
    handleProjectChange,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export default TimerContext;
