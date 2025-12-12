# Timer.jsx Bug Fixes - Complete Code Examples

## BUG-001: Browser Close Session Save

### Location to Add
After line 303 (after session persistence useEffects)

### Complete Code
```javascript
// Save session on browser close/tab close
useEffect(() => {
  const handleBeforeUnload = (e) => {
    // Only save if there's an active session with meaningful duration
    if (isInActiveSession && sessionStartTime && user) {
      const endTime = new Date();
      const startTime = sessionStartTime;

      // Calculate duration based on settings
      let totalDurationMinutes;
      if (settings.includeBreaksInTracking) {
        let totalDurationMs = endTime.getTime() - startTime.getTime() - totalPausedTime;
        if (isPaused && sessionPauseStartTime) {
          totalDurationMs -= (Date.now() - sessionPauseStartTime);
        }
        totalDurationMinutes = Math.round(totalDurationMs / 1000 / 60);
      } else {
        // Include current incomplete pomodoro
        let currentPomodoroTime = 0;
        if (currentMode === MODES.FOCUS && timerOn) {
          const elapsed = DURATIONS[MODES.FOCUS] - timeRemaining;
          currentPomodoroTime = elapsed;
        }
        totalDurationMinutes = Math.round((totalTimeWorked + currentPomodoroTime) / 60);
      }

      // Only save if at least 1 minute
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

        // Use sendBeacon for reliable async save during page unload
        // This works even if the page is closing
        const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });

        // Try to save directly using saveSession's internal logic
        // Note: This is a fallback - ideally implement a dedicated beacon endpoint
        try {
          // Save to localStorage as backup
          const backupKey = `unsaved-session-${Date.now()}`;
          localStorage.setItem(backupKey, JSON.stringify(sessionData));

          // Try beacon API if available
          if (navigator.sendBeacon) {
            // You'll need to create this endpoint: POST /api/sessions/beacon
            navigator.sendBeacon('/api/sessions/beacon', blob);
          }
        } catch (err) {
          console.error('Failed to save session on unload:', err);
        }
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [
  isInActiveSession,
  sessionStartTime,
  user,
  settings,
  totalPausedTime,
  isPaused,
  sessionPauseStartTime,
  currentMode,
  timerOn,
  timeRemaining,
  totalTimeWorked,
  selectedProject,
  sessionDescription,
  sessionTags,
  DURATIONS
]);

// Also add recovery mechanism on mount
useEffect(() => {
  // Check for unsaved sessions on mount
  const recoverUnsavedSessions = async () => {
    const keys = Object.keys(localStorage);
    const unsavedKeys = keys.filter(k => k.startsWith('unsaved-session-'));

    for (const key of unsavedKeys) {
      try {
        const sessionData = JSON.parse(localStorage.getItem(key));

        // Ask user if they want to recover this session
        const sessionDate = new Date(sessionData.startedAt);
        const message = `Found unsaved session from ${sessionDate.toLocaleString()} (${sessionData.duration} minutes). Recover it?`;

        if (window.confirm(message)) {
          await saveSession(sessionData);

          // Update project if needed
          if (sessionData.projectId && updateProject) {
            const project = projects.find(p => p.id === sessionData.projectId);
            if (project) {
              await updateProject(project.id, {
                timeTracked: (project.timeTracked || 0) + sessionData.duration
              });
            }
          }
        }

        // Remove the backup
        localStorage.removeItem(key);
      } catch (err) {
        console.error('Failed to recover session:', err);
        localStorage.removeItem(key);
      }
    }
  };

  if (user) {
    recoverUnsavedSessions();
  }
}, [user, saveSession, updateProject, projects]);
```

---

## BUG-002: Mid-Pomodoro Duration Fix

### Location to Modify
Lines 756-767 (in handleResetTimer)
Lines 829-840 (in handleFinishEarly)
Lines 1108-1119 (in project switch handler)

### Complete Fixed Code

Replace the duration calculation in ALL three locations:

```javascript
// Calculate duration based on settings
let totalDurationMinutes;
if (settings.includeBreaksInTracking) {
  // Include breaks: use elapsed time minus pauses
  let totalDurationMs = endTime.getTime() - startTime.getTime() - totalPausedTime;
  if (isPaused && sessionPauseStartTime) {
    totalDurationMs -= (Date.now() - sessionPauseStartTime);
  }
  totalDurationMinutes = Math.round(totalDurationMs / 1000 / 60);
} else {
  // Focus time only: use totalTimeWorked PLUS current incomplete pomodoro
  let currentPomodoroTime = 0;

  // ⭐ FIX: Add current incomplete pomodoro time
  if (currentMode === MODES.FOCUS && (timerOn || isPaused)) {
    // Calculate how much time has elapsed in current pomodoro
    const pomodoroElapsed = DURATIONS[MODES.FOCUS] - timeRemaining;
    currentPomodoroTime = pomodoroElapsed;
  }

  totalDurationMinutes = Math.round((totalTimeWorked + currentPomodoroTime) / 60);
}
```

---

## BUG-003: Multi-Tab Synchronization

### Location to Add
After line 303 (with other session persistence useEffects)

### Option A: Storage Event Sync (Simple)

```javascript
// Sync session state across tabs using storage events
useEffect(() => {
  const handleStorageChange = (e) => {
    // Storage event fires when localStorage changes in ANOTHER tab
    // (doesn't fire in the same tab that made the change)

    switch (e.key) {
      case 'sessionStartTime':
        if (e.newValue) {
          setSessionStartTime(new Date(e.newValue));
        } else {
          setSessionStartTime(null);
        }
        break;

      case 'sessionPauseStartTime':
        if (e.newValue) {
          setSessionPauseStartTime(parseInt(e.newValue));
        } else {
          setSessionPauseStartTime(null);
        }
        break;

      case 'totalPausedTime':
        if (e.newValue) {
          setTotalPausedTime(parseInt(e.newValue));
        }
        break;

      case 'isInActiveSession':
        const newValue = e.newValue === 'true';
        const oldValue = e.oldValue === 'true';

        // If session started in another tab, warn this tab
        if (newValue && !oldValue && isInActiveSession) {
          alert('Session started in another tab. This tab\'s session will be stopped.');
          // Stop this tab's session
          handleResetTimer();
        }

        setIsInActiveSession(newValue);
        break;

      default:
        break;
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, [isInActiveSession]);
```

### Option B: BroadcastChannel API (Better)

```javascript
// Use BroadcastChannel for more reliable cross-tab communication
useEffect(() => {
  const channel = new BroadcastChannel('pomodoro-timer-sync');

  // Handle messages from other tabs
  channel.onmessage = (event) => {
    const { type, data } = event.data;

    switch (type) {
      case 'SESSION_STARTED':
        if (isInActiveSession) {
          // Another tab started a session while this tab has one
          const confirmed = window.confirm(
            'A session was started in another tab. Stop this tab\'s session?'
          );

          if (confirmed) {
            handleResetTimer();
          }
        }
        break;

      case 'SESSION_ENDED':
        // Another tab ended the session
        if (isInActiveSession) {
          alert('Session was ended in another tab.');
          // Reset this tab's session state
          setSessionStartTime(null);
          setIsInActiveSession(false);
          setTotalPausedTime(0);
          setSessionPauseStartTime(null);
        }
        break;

      case 'TIMER_STARTED':
        // Sync timer state
        if (timerOn !== data.timerOn) {
          setTimerOn(data.timerOn);
        }
        break;

      case 'TIMER_PAUSED':
        if (!isPaused) {
          setIsPaused(true);
        }
        break;

      default:
        break;
    }
  };

  return () => {
    channel.close();
  };
}, [isInActiveSession, timerOn, isPaused]);

// Modify handleStartTimer to broadcast
const handleStartTimer = () => {
  // ... existing code ...

  // Broadcast to other tabs
  const channel = new BroadcastChannel('pomodoro-timer-sync');
  channel.postMessage({ type: 'TIMER_STARTED', data: { timerOn: true } });
  channel.close();
};

// Modify handleResetTimer to broadcast
const handleResetTimer = async () => {
  // ... existing save logic ...

  // Broadcast session end
  const channel = new BroadcastChannel('pomodoro-timer-sync');
  channel.postMessage({ type: 'SESSION_ENDED' });
  channel.close();

  // ... rest of existing code ...
};
```

---

## BUG-004: Remove Dead Code

### Location to Delete
Lines 493-495

### Action
Delete these lines completely:
```javascript
// DELETE THIS (dead code):
if (isPaused && sessionPauseStartTime) {
  totalDurationMs -= (Date.now() - sessionPauseStartTime);
}
```

**Reason:** Timer can't complete while paused, so this code never executes.

---

## BUG-005: Project Switch Race Condition

### Location to Modify
Lines 1090-1163

### Add State Variable
After line 26:
```javascript
const [isSwitchingProject, setIsSwitchingProject] = useState(false);
```

### Modify onChange Handler
Replace lines 1090-1172:

```javascript
onChange={async (e) => {
  // Prevent concurrent project switches
  if (isSwitchingProject) {
    alert('Please wait for current save to complete.');
    e.target.value = selectedProject?.id || '';
    return;
  }

  const projectId = e.target.value;

  try {
    setIsSwitchingProject(true);

    // If there's an active session, save it first
    if (isInActiveSession && sessionStartTime) {
      const switchConfirmed = window.confirm(
        'You have an active session running. Switching projects will save and end your current session. Continue?'
      );

      if (!switchConfirmed) {
        // Reset select to current project
        e.target.value = selectedProject?.id || '';
        return;
      }

      // Save current session
      const endTime = new Date();

      // Calculate duration (with BUG-002 fix)
      let totalDurationMinutes;
      if (settings.includeBreaksInTracking) {
        let totalDurationMs = endTime.getTime() - sessionStartTime.getTime() - totalPausedTime;
        if (isPaused && sessionPauseStartTime) {
          totalDurationMs -= (Date.now() - sessionPauseStartTime);
        }
        totalDurationMinutes = Math.round(totalDurationMs / 1000 / 60);
      } else {
        let currentPomodoroTime = 0;
        if (currentMode === MODES.FOCUS && (timerOn || isPaused)) {
          const elapsed = DURATIONS[MODES.FOCUS] - timeRemaining;
          currentPomodoroTime = elapsed;
        }
        totalDurationMinutes = Math.round((totalTimeWorked + currentPomodoroTime) / 60);
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

        await saveSession(sessionData);

        if (selectedProject && updateProject) {
          await updateProject(selectedProject.id, {
            timeTracked: (selectedProject.timeTracked || 0) + totalDurationMinutes
          });
        }

        setSessionDescription('');
        setSessionTags([]);
      }

      // Reset session state
      setSessionStartTime(null);
      setIsInActiveSession(false);
      setTotalPausedTime(0);
      setSessionPauseStartTime(null);

      // Stop timer
      setTimerOn(false);
      setIsPaused(false);
      setTimeRemaining(DURATIONS[currentMode]);
      setTargetEndTime(null);
      setShowCompletionMessage(false);
      setTotalTimeWorked(0);
    }

    // Switch to new project
    const project = projects.find(p => p.id === projectId) || null;
    setSelectedProject(project);
    await saveSelectedProject(project?.id || null);

  } catch (error) {
    console.error('Failed to switch projects:', error);
    alert('Failed to save session. Please try again.');
    // Reset select to current project
    e.target.value = selectedProject?.id || '';
  } finally {
    setIsSwitchingProject(false);
  }
}}
```

---

## BUG-006: Cross-Midnight Session Fix

### Location to Modify
Lines 312-346 (loadTimerState function)

### Replace Date Check
Replace line 316-331:

```javascript
const loadTimerState = () => {
  const saved = localStorage.getItem('pomodoroTimerState');
  if (saved) {
    const state = JSON.parse(saved);

    // ⭐ FIX: Allow restore if session started within last 24 hours
    // (not just "today")
    const stateDate = new Date(state.date);
    const hoursSinceState = (Date.now() - stateDate.getTime()) / (1000 * 60 * 60);

    // Only restore if within 24 hours (prevents stale state)
    if (hoursSinceState >= 0 && hoursSinceState < 24) {
      // If timer was running, calculate elapsed time
      if (state.timerOn && !state.isPaused && state.targetEndTime) {
        const now = Date.now();
        const newTimeRemaining = Math.max(0, Math.ceil((state.targetEndTime - now) / 1000));
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

  // Default state
  return {
    currentMode: MODES.FOCUS,
    timeRemaining: DURATIONS[MODES.FOCUS],
    timerOn: false,
    isPaused: false,
    totalTimeWorked: 0,
    pomodorosCompleted: 0,
    showCompletionMessage: false,
    date: getLocalDateString(),
    targetEndTime: null,
    timerCompletedWhileAway: false
  };
};
```

---

## BUG-007: Worker Error Handling

### Location to Modify
Lines 388-416

### Replace Worker Initialization

```javascript
useEffect(() => {
  let worker = null;

  const initializeWorker = () => {
    try {
      // Create worker
      worker = new Worker('/timer-worker.js');

      // Handle messages from worker
      worker.onmessage = (e) => {
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

      // ⭐ FIX: Handle worker errors
      worker.onerror = (error) => {
        console.error('Timer worker error:', error);
        alert('Timer encountered an error. Please refresh the page.');

        // Optionally: Fall back to setInterval
        // startFallbackTimer();
      };

      timerWorkerRef.current = worker;

    } catch (error) {
      console.error('Failed to create timer worker:', error);
      alert('Failed to initialize timer. Please check your browser supports Web Workers.');

      // Optionally: Fall back to setInterval
      // startFallbackTimer();
    }
  };

  initializeWorker();

  // Cleanup on unmount
  return () => {
    if (timerWorkerRef.current) {
      timerWorkerRef.current.postMessage({ type: 'STOP' });
      timerWorkerRef.current.terminate();
    }
  };
}, []);
```

---

## Testing Commands

After implementing fixes, test with:

```bash
# Test 1: Browser close recovery
# 1. Start session
# 2. Open console and run: window.location.reload()
# 3. Check localStorage for unsaved-session-* keys
# 4. Reopen app and verify recovery prompt

# Test 2: Mid-pomodoro duration
# 1. Set includeBreaksInTracking = false
# 2. Start 25min timer, wait 10 min
# 3. Click "Finish & Save"
# 4. Check saved session duration = 10 min

# Test 3: Multi-tab sync
# 1. Open app in Tab A
# 2. Open app in Tab B
# 3. Start session in Tab A
# 4. Verify Tab B shows alert

# Test 4: Midnight session
# 1. Set system time to 11:55 PM
# 2. Start session
# 3. Set system time to 12:05 AM
# 4. Refresh page
# 5. Verify session continues

# Test 5: Project switch lock
# 1. Start session
# 2. Rapidly click different projects
# 3. Verify only one save occurs
```

---

## Summary of Changes

| Bug | Files Modified | Lines Added | Lines Removed |
|-----|----------------|-------------|---------------|
| BUG-001 | Timer.jsx | ~90 | 0 |
| BUG-002 | Timer.jsx | ~10 | ~5 |
| BUG-003 | Timer.jsx | ~40 | 0 |
| BUG-004 | Timer.jsx | 0 | 3 |
| BUG-005 | Timer.jsx | ~5 | ~3 |
| BUG-006 | Timer.jsx | ~8 | ~5 |
| BUG-007 | Timer.jsx | ~15 | ~5 |

**Total Estimated Changes:** ~168 lines added, ~21 lines removed
