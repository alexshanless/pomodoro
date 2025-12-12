# Timer.jsx Comprehensive Bug Analysis Report

**Component:** `/home/user/pomodoro/src/components/Timer.jsx`
**Lines:** 1451
**Analysis Date:** 2025-12-11
**Analyst:** Code Review Bot

---

## Executive Summary

This analysis identified **23 issues** across 7 severity levels:
- 🔴 **CRITICAL** (3): Data loss, incorrect billing, session corruption
- 🟠 **HIGH** (5): Race conditions, state inconsistencies
- 🟡 **MEDIUM** (8): Edge cases, potential errors
- 🟢 **LOW** (5): Dead code, optimization opportunities
- ℹ️ **INFO** (2): Code quality improvements

**Estimated Risk:** HIGH - Multiple data loss scenarios and billing accuracy issues detected.

---

## 🔴 CRITICAL BUGS (Priority 1)

### BUG-001: Session Data Loss on Browser/Tab Close (CRITICAL)
**Severity:** 🔴 CRITICAL
**Location:** Lines 269-303, 749-908
**Impact:** User loses all session tracking data if browser closes unexpectedly

**Description:**
When a user has an active session and closes the browser tab/window, the session state persists in localStorage but is NEVER saved to Supabase. The session data (time tracked, project time, earnings) is permanently lost.

**Scenario:**
```javascript
// User workflow:
1. User starts timer with project billing at $100/hour
2. User works for 2.5 hours
3. User closes browser tab (accidentally or intentionally)
4. Session state remains in localStorage but never saves to Supabase
5. User loses $250 worth of billable time tracking
```

**Current Code:**
```javascript
// Lines 269-275: Only persists to localStorage
useEffect(() => {
  if (sessionStartTime) {
    localStorage.setItem('sessionStartTime', sessionStartTime.toISOString());
  } else {
    localStorage.removeItem('sessionStartTime');
  }
}, [sessionStartTime]);
```

**Missing:**
- No `beforeunload` event handler to save session
- No periodic auto-save mechanism
- No recovery mechanism on next load

**Recommended Fix:**
Add `beforeunload` handler to save active sessions:
```javascript
useEffect(() => {
  const handleBeforeUnload = async (e) => {
    if (isInActiveSession && sessionStartTime) {
      // Save session synchronously
      const sessionData = {
        // ... calculate duration
      };
      // Use sendBeacon for async save during unload
      navigator.sendBeacon('/api/save-session', JSON.stringify(sessionData));
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isInActiveSession, sessionStartTime]);
```

---

### BUG-002: Incorrect Duration Calculation with Mid-Pomodoro "Finish & Save"
**Severity:** 🔴 CRITICAL
**Location:** Lines 821-908 (handleFinishEarly), Line 766
**Impact:** Under-billing clients, incorrect time tracking

**Description:**
When `includeBreaksInTracking` is `false` and user clicks "Finish & Save" mid-pomodoro, only `totalTimeWorked` is counted. However, `totalTimeWorked` is ONLY incremented when a full pomodoro completes (Line 532), meaning the current incomplete pomodoro time is lost.

**Proof:**
```javascript
// Line 766 - Uses totalTimeWorked when breaks not included
totalDurationMinutes = Math.round(totalTimeWorked / 60);

// Line 532 - totalTimeWorked only incremented on completion
setTotalTimeWorked(prev => prev + DURATIONS[MODES.FOCUS]);
```

**Example:**
```
1. User starts 25-minute pomodoro
2. User works for 23 minutes
3. User clicks "Finish & Save"
4. Expected: 23 minutes saved
5. Actual: 0 minutes saved (totalTimeWorked is still 0)
```

**Recommended Fix:**
```javascript
// In handleFinishEarly (and handleResetTimer):
if (!settings.includeBreaksInTracking) {
  // Calculate current pomodoro time if in FOCUS mode
  let currentPomodoroTime = 0;
  if (currentMode === MODES.FOCUS && timerOn) {
    const elapsed = DURATIONS[MODES.FOCUS] - timeRemaining;
    currentPomodoroTime = elapsed;
  }
  totalDurationMinutes = Math.round((totalTimeWorked + currentPomodoroTime) / 60);
}
```

---

### BUG-003: Multiple Tab Session Conflicts & Duplicate Saves
**Severity:** 🔴 CRITICAL
**Location:** Lines 269-303, 749-819
**Impact:** Double billing, data corruption, conflicting session states

**Description:**
No synchronization mechanism between multiple browser tabs. If user opens the app in two tabs:
1. Both tabs read same localStorage state
2. Both tabs can have "active" sessions simultaneously
3. Both tabs can save sessions independently
4. This leads to duplicate time tracking and double billing

**Scenario:**
```
Tab A: User starts session for Project X at 2:00 PM
Tab B: User opens app, loads same session state
Tab A: User works until 3:00 PM, saves session (60 mins)
Tab B: User closes tab, also saves session (60 mins)
Result: 120 minutes tracked instead of 60
```

**Missing:**
- No `storage` event listener to sync localStorage changes across tabs
- No tab lock mechanism (e.g., using BroadcastChannel API)
- No server-side session validation

**Recommended Fix:**
```javascript
// Add storage event listener
useEffect(() => {
  const handleStorageChange = (e) => {
    if (e.key === 'sessionStartTime') {
      // Another tab modified session - reload state
      const saved = localStorage.getItem('sessionStartTime');
      setSessionStartTime(saved ? new Date(saved) : null);
    }
    // Handle other keys...
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// Or use BroadcastChannel for active tab coordination
const channel = new BroadcastChannel('pomodoro-sync');
channel.postMessage({ type: 'SESSION_STARTED', timestamp: Date.now() });
```

---

## 🟠 HIGH SEVERITY BUGS (Priority 2)

### BUG-004: Dead Code in Timer Completion Logic
**Severity:** 🟠 HIGH (Misleading)
**Location:** Lines 493-495
**Impact:** Code maintenance confusion, false logic path

**Description:**
Dead code checks if timer is paused when it completes, which is impossible since paused timers don't run.

```javascript
// Lines 493-495
if (isPaused && sessionPauseStartTime) {
  totalDurationMs -= (Date.now() - sessionPauseStartTime);
}
```

**Analysis:**
- Web Worker only sends COMPLETE when timer reaches 0 (Lines 30-36 in timer-worker.js)
- Worker is STOPPED when timer is paused (Lines 422-436)
- Therefore, `isPaused` can NEVER be true in `handleTimerComplete`

**Recommended Fix:**
Remove dead code to avoid confusion.

---

### BUG-005: Race Condition in Rapid Project Switching
**Severity:** 🟠 HIGH
**Location:** Lines 1090-1163
**Impact:** Lost sessions, incorrect project attribution

**Description:**
The project change handler is async but has no locking mechanism. User can rapidly switch projects before the first save completes.

**Scenario:**
```javascript
Time 0ms:   User switches Project A → B (save starts)
Time 100ms: User switches Project B → C (save starts)
Time 200ms: First save completes (session saved to Project B)
Time 300ms: Second save completes (session saved to Project C)
// Result: Time tracked to wrong project
```

**Current Code:**
```javascript
onChange={async (e) => {
  // No lock check here
  const projectId = e.target.value;
  // ... async save operations
}}
```

**Recommended Fix:**
```javascript
const [isSwitchingProject, setIsSwitchingProject] = useState(false);

onChange={async (e) => {
  if (isSwitchingProject) {
    alert('Please wait for current save to complete');
    return;
  }

  setIsSwitchingProject(true);
  try {
    // ... save logic
  } finally {
    setIsSwitchingProject(false);
  }
}}
```

---

### BUG-006: Session Continues Across Date Boundaries
**Severity:** 🟠 HIGH
**Location:** Lines 312-346 (loadTimerState), Line 316
**Impact:** Sessions attributed to wrong day

**Description:**
If a session starts at 11:30 PM and user continues past midnight, the session will not restore because the date check fails.

```javascript
// Line 316-318
if (state.date === today) {
  // Only restore if from today
}
```

**Scenario:**
```
11:30 PM: User starts session (date = "2025-12-11")
12:01 AM: Page refreshes
Load check: state.date ("2025-12-11") !== today ("2025-12-12")
Result: Session state lost, timer resets
```

**Recommended Fix:**
```javascript
// Allow session restoration if started within last 24 hours
const stateDate = new Date(state.date);
const hoursSinceState = (Date.now() - stateDate.getTime()) / (1000 * 60 * 60);

if (hoursSinceState < 24) {
  // Restore session
}
```

---

### BUG-007: Redundant Worker Restart (Performance)
**Severity:** 🟠 HIGH (Performance)
**Location:** Lines 554-559, 586-591
**Impact:** Unnecessary code execution, potential timing issues

**Description:**
Code explicitly restarts worker with comment "since timerOn was already true, useEffect won't trigger", but this is incorrect. `timerOn` is set to `false` in line 399 before completion, so the useEffect WILL trigger.

```javascript
// Lines 553-559
// Explicitly restart worker (since timerOn was already true, useEffect won't trigger)
if (timerWorkerRef.current) {
  timerWorkerRef.current.postMessage({
    type: 'START',
    endTime: endTime
  });
}
```

**Analysis:**
- Line 399: `setTimerOn(false)` when timer completes
- Line 549: `setTimerOn(true)` when auto-starting break
- useEffect (Lines 419-437) depends on `timerOn`, so it WILL trigger
- Explicit restart is redundant

**Impact:**
- Worker receives two START messages
- Could cause timing drift or double-tick issues

**Recommended Fix:**
Remove explicit worker restarts (lines 554-559 and 586-591).

---

### BUG-008: No Error Handling for Web Worker Failures
**Severity:** 🟠 HIGH
**Location:** Lines 388-416
**Impact:** Silent timer failure, no user notification

**Description:**
Web Worker initialization has no error handling. If worker file fails to load or worker crashes, timer silently fails with no user feedback.

**Current Code:**
```javascript
useEffect(() => {
  timerWorkerRef.current = new Worker('/timer-worker.js');
  // No try/catch
  // No onerror handler
}, []);
```

**Missing:**
- Try/catch around worker creation
- `worker.onerror` handler
- Fallback to setInterval if worker fails

**Recommended Fix:**
```javascript
useEffect(() => {
  try {
    timerWorkerRef.current = new Worker('/timer-worker.js');

    timerWorkerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      alert('Timer failed to start. Please refresh the page.');
    };

    // ... rest of code
  } catch (error) {
    console.error('Failed to create worker:', error);
    // Fallback to setInterval
    useFallbackTimer();
  }
}, []);
```

---

## 🟡 MEDIUM SEVERITY ISSUES (Priority 3)

### BUG-009: Inconsistent Error Handling for Session Saves
**Severity:** 🟡 MEDIUM
**Location:** Lines 511-513, 783-802, 868-907, 1134-1147
**Impact:** Inconsistent UX, some errors silent

**Description:**
Four different places save sessions with different error handling approaches:

| Location | Function | Error Handling | User Notification |
|----------|----------|----------------|-------------------|
| Lines 511-513 | Timer complete (no continuous) | `.catch()` with log | ❌ None |
| Lines 783-802 | handleResetTimer | try/catch with log | ❌ None |
| Lines 868-907 | handleFinishEarly | try/catch | ✅ Alert shown |
| Lines 1134-1147 | Project switch | try/catch with log | ❌ None |

**Recommended Fix:**
Standardize error handling:
```javascript
const saveSessionWithErrorHandling = async (sessionData) => {
  try {
    await saveSession(sessionData);
    return { success: true };
  } catch (error) {
    console.error('Failed to save session:', error);

    // Show user-friendly error
    const retry = window.confirm(
      'Failed to save session. Would you like to retry?'
    );

    if (retry) {
      return await saveSessionWithErrorHandling(sessionData);
    }

    return { success: false, error };
  }
};
```

---

### BUG-010: No Validation for Manipulated localStorage Data
**Severity:** 🟡 MEDIUM
**Location:** Lines 33-48, 312-346
**Impact:** App crashes, invalid state, billing errors

**Description:**
User can manipulate localStorage to create invalid states. For example:
- Set `sessionStartTime` to year 1900
- Set `totalPausedTime` to negative number
- Set `sessionStartTime` to future date

**Example Attack:**
```javascript
// User opens console and runs:
localStorage.setItem('sessionStartTime', '1900-01-01T00:00:00.000Z');
localStorage.setItem('totalPausedTime', '-999999999');
// Result: Session duration = millions of minutes
```

**Recommended Fix:**
```javascript
const [sessionStartTime, setSessionStartTime] = useState(() => {
  const saved = localStorage.getItem('sessionStartTime');
  if (saved) {
    const date = new Date(saved);
    const hoursSinceStart = (Date.now() - date.getTime()) / (1000 * 60 * 60);

    // Validate: must be within last 24 hours and not in future
    if (hoursSinceStart > 0 && hoursSinceStart < 24) {
      return date;
    }
  }
  return null;
});

const [totalPausedTime, setTotalPausedTime] = useState(() => {
  const saved = localStorage.getItem('totalPausedTime');
  if (saved) {
    const value = parseInt(saved);
    // Validate: must be non-negative and reasonable
    if (value >= 0 && value < 24 * 60 * 60 * 1000) {
      return value;
    }
  }
  return 0;
});
```

---

### BUG-011: Pause Time Tracking During Breaks (Ambiguity)
**Severity:** 🟡 MEDIUM
**Location:** Lines 728-732, 566-568, 597-599
**Impact:** Confusing behavior when pausing during breaks

**Description:**
When continuous tracking is enabled and user pauses during a break:
1. Timer pauses (correct)
2. Session pause tracking starts (questionable)

If `includeBreaksInTracking` is `false`, break time shouldn't count anyway, so pausing during a break is meaningless.

**Current Behavior:**
```javascript
// User on break with includeBreaksInTracking = false
User clicks pause during break
→ sessionPauseStartTime is set
→ Pause time is accumulated
→ Break time wasn't being counted anyway
→ Result: No effect on final duration (confusing to user)
```

**Recommended Fix:**
Only track pause time during FOCUS mode when breaks aren't included:
```javascript
const handlePauseTimer = () => {
  setIsPaused(true);

  // Only track pause time if in focus mode OR if breaks are included
  if (user && (currentMode === MODES.FOCUS || settings.includeBreaksInTracking)) {
    setSessionPauseStartTime(Date.now());
  }
};
```

---

### BUG-012: Timer State Restoration with Stale targetEndTime
**Severity:** 🟡 MEDIUM
**Location:** Lines 312-346, 419-437
**Impact:** Incorrect time calculations after page refresh

**Description:**
When page refreshes during active timer:
1. `targetEndTime` is loaded from localStorage (Line 373)
2. New `timeRemaining` is calculated (Line 322)
3. Timer resumes with old `targetEndTime` OR calculates new one (Line 424)

**Potential Issue:**
```javascript
// Line 424
const endTime = targetEndTime || (Date.now() + timeRemaining * 1000);

// If targetEndTime exists but timeRemaining was recalculated,
// there's a mismatch between the two values
```

**Scenario:**
```
Before refresh: targetEndTime = 1000000, timeRemaining = 100
After refresh:  timeRemaining recalculated to 95 (5 seconds elapsed)
Resume timer:   Uses targetEndTime = 1000000 (should be 95 seconds from now)
Result:         Timer shows wrong time
```

**Recommended Fix:**
Always use `targetEndTime` as source of truth:
```javascript
if (timerOn && !isPaused) {
  // Always use targetEndTime if available
  if (targetEndTime) {
    timerWorkerRef.current.postMessage({
      type: 'START',
      endTime: targetEndTime
    });
  } else {
    // Calculate new end time
    const endTime = Date.now() + timeRemaining * 1000;
    setTargetEndTime(endTime);
    timerWorkerRef.current.postMessage({
      type: 'START',
      endTime: endTime
    });
  }
}
```

---

### BUG-013: No Maximum Duration Cap
**Severity:** 🟡 MEDIUM
**Location:** Lines 756-767
**Impact:** Database errors, display issues

**Description:**
No validation on calculated session duration. If session runs for days (e.g., user leaves app open), duration could be enormous.

**Issues:**
1. Database may have column size limits
2. UI may not handle large numbers well
3. Billing calculations could overflow

**Recommended Fix:**
```javascript
// Add maximum duration cap (e.g., 24 hours)
const MAX_SESSION_DURATION = 24 * 60; // 24 hours in minutes

if (totalDurationMinutes > MAX_SESSION_DURATION) {
  const confirmed = window.confirm(
    `This session is ${totalDurationMinutes} minutes (${Math.round(totalDurationMinutes/60)} hours). ` +
    `This seems unusually long. Do you want to cap it at 24 hours?`
  );

  if (confirmed) {
    totalDurationMinutes = MAX_SESSION_DURATION;
  }
}
```

---

### BUG-014: Use-Before-Define Warning with timerOn
**Severity:** 🟡 MEDIUM
**Location:** Line 287, Line 352
**Impact:** Code smell, potential hoisting issues

**Description:**
`timerOn` is used in useEffect dependency array (Line 287) before it's declared (Line 352).

```javascript
// Line 287
}, [user, timerOn, isInActiveSession]);

// Line 352 (65 lines later)
const [timerOn, setTimerOn] = useState(initialState.timerOn);
```

**Current:** Warning is disabled with eslint comment (Line 286)

**Recommended Fix:**
Reorder declarations or move useEffect below state declarations.

---

### BUG-015: Potential Race in handleTimerCompleteRef Updates
**Severity:** 🟡 MEDIUM
**Location:** Lines 605-608, 402-404
**Impact:** Stale closure, incorrect state values

**Description:**
`handleTimerCompleteRef` is updated on every render (no dependency array), which could cause race conditions.

```javascript
// Lines 606-608
useEffect(() => {
  handleTimerCompleteRef.current = handleTimerComplete;
});
```

**Issue:**
If `handleTimerComplete` is called while the ref is being updated, it might access stale state values.

**Recommended Fix:**
Use `useCallback` with proper dependencies:
```javascript
const handleTimerComplete = useCallback(() => {
  // ... function body
}, [currentMode, settings, user, sessionStartTime, /* all dependencies */]);

useEffect(() => {
  handleTimerCompleteRef.current = handleTimerComplete;
}, [handleTimerComplete]);
```

---

### BUG-016: Settings Change While Timer Running
**Severity:** 🟡 MEDIUM
**Location:** Lines 918-930
**Impact:** Confusing UX, potential state mismatch

**Description:**
Settings can be changed while timer is stopped, but if user changes `continuousTracking` or `includeBreaksInTracking` while a session is active (but timer is paused), behavior is undefined.

**Scenario:**
```
1. User starts session with continuousTracking = true
2. User pauses timer
3. User changes continuousTracking = false in settings
4. User resumes timer
5. What happens? Code doesn't handle this transition.
```

**Recommended Fix:**
Warn user or prevent changing tracking mode during active session:
```javascript
const saveSettings = (newSettings) => {
  // Check if tracking mode is changing during active session
  if (isInActiveSession &&
      settings.continuousTracking !== newSettings.continuousTracking) {
    const confirmed = window.confirm(
      'Changing tracking mode will end your current session. Continue?'
    );
    if (!confirmed) return;

    // Save and reset session
    handleResetTimer();
  }

  setSettings(newSettings);
  localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
};
```

---

## 🟢 LOW SEVERITY ISSUES (Priority 4)

### BUG-017: Unnecessary Force Update Mechanism
**Severity:** 🟢 LOW
**Location:** Lines 50, 683, 666
**Impact:** Code complexity, potential performance

**Description:**
Uses `forceUpdate` state to trigger re-renders for session duration display, but this is an anti-pattern in React.

```javascript
// Line 50
const [forceUpdate, setForceUpdate] = useState(0);

// Lines 680-688
useEffect(() => {
  if (isInActiveSession && sessionStartTime) {
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }
}, [isInActiveSession, sessionStartTime]);
```

**Better Approach:**
Use a custom hook or just rely on natural re-renders when duration is accessed.

---

### BUG-018: Magic Numbers for Long Break Interval
**Severity:** 🟢 LOW
**Location:** Lines 537-540
**Impact:** Code readability

**Description:**
Long break interval calculation could be clearer:

```javascript
// Line 537
const nextMode = newPomodorosCount > 0 && newPomodorosCount % settings.longBreakInterval === 0
```

**Better:**
```javascript
const isLongBreakTime = (
  newPomodorosCount > 0 &&
  newPomodorosCount % settings.longBreakInterval === 0
);
const nextMode = isLongBreakTime ? MODES.LONG_BREAK : MODES.SHORT_BREAK;
```

---

### BUG-019: Unused CSS ID Variable
**Severity:** 🟢 LOW
**Location:** Line 359
**Impact:** Code cleanliness

```javascript
const idCSS = 'hello';
```

This seems arbitrary. Should be more descriptive or use constant.

---

### BUG-020: Missing Cleanup for Completion Sound
**Severity:** 🟢 LOW
**Location:** Lines 130-165
**Impact:** Minor memory leak

**Description:**
AudioContext is created but never closed.

**Recommended Fix:**
```javascript
const playCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // ... play sound

    // Close context after sound completes
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (err) {
    console.log('Audio playback failed:', err);
  }
};
```

---

### BUG-021: No Debouncing on Settings Input
**Severity:** 🟢 LOW
**Location:** Lines 1298-1333
**Impact:** Performance (excessive localStorage writes)

**Description:**
Every keystroke in settings inputs triggers `saveSettings()`, which writes to localStorage immediately.

**Recommended Fix:**
Use debouncing:
```javascript
import { debounce } from 'lodash';

const debouncedSave = useMemo(
  () => debounce((settings) => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }, 500),
  []
);
```

---

## ℹ️ INFORMATIONAL (Code Quality)

### INFO-001: Large Component Should Be Split
**Severity:** ℹ️ INFO
**Location:** Entire file (1451 lines)
**Impact:** Maintainability

**Recommendation:**
Split into smaller components:
- `TimerControls.jsx` (start/pause/reset buttons)
- `TimerDisplay.jsx` (circular progress bar)
- `SessionProgress.jsx` (session tracking panel)
- `TimerSettings.jsx` (settings modal)
- `useTimerState.js` (custom hook for timer logic)
- `useSessionTracking.js` (custom hook for session tracking)

---

### INFO-002: Missing PropTypes or TypeScript
**Severity:** ℹ️ INFO
**Location:** Entire file
**Impact:** Type safety

**Recommendation:**
Convert to TypeScript or add PropTypes for better type safety and developer experience.

---

## Logic Flow Diagrams

### Session Lifecycle Flow

```
┌─────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                     │
└─────────────────────────────────────────────────────────┘

Start Timer (Line 690)
      │
      ├─ User logged in? ───No──> No session tracking
      │        │
      │       Yes
      │        │
      ├─ isInActiveSession? ──No──> Create new session
      │        │                     - setSessionStartTime(now)
      │       Yes                    - setIsInActiveSession(true)
      │        │                     - setTotalPausedTime(0)
      │        │
      ├─ sessionPauseStartTime? ──Yes──> Resume from pause
      │        │                          - Accumulate pause time
      │        │                          - Clear pause start
      │       No
      │        │
      └────> Timer runs
               │
               ├─ User clicks Pause (Line 728)
               │    │
               │    └─> setSessionPauseStartTime(now)
               │        Timer paused state
               │
               ├─ Timer completes (Line 457)
               │    │
               │    ├─ continuousTracking = true?
               │    │    │
               │    │   Yes ──> Session continues
               │    │            (sessionStartTime preserved)
               │    │    │
               │    │   No ──> Save session & reset
               │    │           - Calculate duration
               │    │           - Save to Supabase
               │    │           - Reset session state
               │    │
               │    └─> Auto-start next mode (if enabled)
               │
               ├─ User clicks "Finish & Save" (Line 821)
               │    │
               │    └─> Calculate duration
               │         Save to Supabase
               │         Reset session state
               │         Reset timer
               │
               ├─ User clicks "Stop" (Line 749)
               │    │
               │    └─> If isInActiveSession:
               │           - Calculate duration
               │           - Save to Supabase
               │           - Reset session state
               │         Reset timer
               │
               └─ User switches project (Line 1090)
                    │
                    └─> If isInActiveSession:
                          - Confirm with user
                          - Save current session
                          - Reset session state
                        Switch project
```

### Duration Calculation Logic

```
┌─────────────────────────────────────────────────────────┐
│               DURATION CALCULATION FLOW                  │
└─────────────────────────────────────────────────────────┘

Calculate Duration (Lines 756-767, 829-840, etc.)
      │
      ├─ includeBreaksInTracking?
      │        │
      │       Yes ──> Total Time Mode
      │        │      │
      │        │      ├─ totalDurationMs = endTime - startTime
      │        │      ├─ Subtract: totalPausedTime
      │        │      ├─ If currently paused:
      │        │      │    Subtract: (now - sessionPauseStartTime)
      │        │      └─> totalDurationMinutes = round(ms / 1000 / 60)
      │        │
      │       No ──> Focus Time Only Mode
      │              │
      │              ├─ ⚠️ BUG-002: Only uses totalTimeWorked
      │              │    (Doesn't include current incomplete pomodoro)
      │              └─> totalDurationMinutes = round(totalTimeWorked / 60)
      │
      └─> Return totalDurationMinutes
```

### State Persistence Flow

```
┌─────────────────────────────────────────────────────────┐
│                  STATE PERSISTENCE                       │
└─────────────────────────────────────────────────────────┘

Component Mount
      │
      ├─> Load from localStorage (Lines 33-48)
      │    │
      │    ├─ sessionStartTime
      │    ├─ sessionPauseStartTime
      │    ├─ totalPausedTime
      │    └─ isInActiveSession
      │
State Changes
      │
      ├─> useEffect hooks save to localStorage (Lines 269-303)
      │    │
      │    ⚠️ ISSUE: No synchronization between tabs
      │    ⚠️ ISSUE: Multiple writes could race
      │
Session Save
      │
      ├─> Try Supabase save (if user logged in)
      │    │
      │    ├─ Success ──> Update local state
      │    │              Clear localStorage session keys
      │    │
      │    └─ Failure ──> Log error
      │                   ⚠️ BUG-001: Data lost
      │                   ⚠️ BUG-009: Inconsistent error handling
      │
Component Unmount
      │
      └─> Worker terminated (Line 412)
          ⚠️ BUG-001: No beforeunload save
```

---

## Priority Fix Recommendations

### IMMEDIATE (Do First)

1. **BUG-001**: Implement `beforeunload` session save
2. **BUG-002**: Fix mid-pomodoro duration calculation
3. **BUG-003**: Add multi-tab synchronization

### SHORT TERM (Do This Week)

4. **BUG-004**: Remove dead code
5. **BUG-005**: Add project switch locking
6. **BUG-006**: Fix cross-midnight sessions
7. **BUG-008**: Add worker error handling
8. **BUG-009**: Standardize error handling

### MEDIUM TERM (Do This Month)

9. **BUG-010**: Add localStorage validation
10. **BUG-011**: Clarify pause behavior during breaks
11. **BUG-012**: Fix timer state restoration
12. **BUG-013**: Add duration caps
13. **BUG-014**: Fix code organization
14. **BUG-015**: Use useCallback properly
15. **BUG-016**: Handle settings changes during session

### BACKLOG (Technical Debt)

16. **BUG-017-021**: Code quality improvements
17. **INFO-001**: Component refactoring
18. **INFO-002**: TypeScript migration

---

## Test Scenarios to Verify Fixes

### Critical Test Cases

1. **Browser Close Recovery**
   ```
   - Start session with project billing
   - Work for 30 minutes
   - Close browser tab (force kill)
   - Reopen app
   - VERIFY: Session data saved or recoverable
   ```

2. **Mid-Pomodoro Finish**
   ```
   - Set includeBreaksInTracking = false
   - Start 25-minute pomodoro
   - Wait 15 minutes
   - Click "Finish & Save"
   - VERIFY: 15 minutes saved (not 0)
   ```

3. **Multi-Tab Conflict**
   ```
   - Open app in Tab A
   - Start session
   - Open app in Tab B
   - Try to start session in Tab B
   - VERIFY: Warning shown or state synced
   ```

4. **Cross-Midnight Session**
   ```
   - Start session at 11:45 PM
   - Continue past midnight
   - Refresh page at 12:15 AM
   - VERIFY: Session continues, time accurate
   ```

5. **Rapid Project Switch**
   ```
   - Start session with Project A
   - Quickly switch A → B → C
   - VERIFY: No duplicate saves, correct attribution
   ```

---

## Code Quality Metrics

- **Complexity:** High (1451 lines, multiple responsibilities)
- **Test Coverage:** Unknown (no tests in file)
- **Error Handling:** Inconsistent (4 different patterns)
- **Type Safety:** None (JavaScript, no PropTypes)
- **Documentation:** Moderate (some comments, no JSDoc)

---

## Conclusion

The Timer.jsx component has **3 critical bugs** that can cause data loss and billing errors. The most severe issue is the lack of session persistence on browser close (BUG-001), which could result in significant lost billable hours for users.

**Recommended Immediate Actions:**
1. Add `beforeunload` event handler
2. Fix duration calculation for mid-pomodoro saves
3. Implement multi-tab synchronization or locking

**Long-term Recommendations:**
1. Refactor into smaller, focused components
2. Add comprehensive error handling and retry logic
3. Implement TypeScript for type safety
4. Add unit and integration tests
5. Consider periodic auto-save mechanism

**Risk Assessment:**
Without fixes, users face:
- Lost billable time (financial impact)
- Incorrect project time attribution (accuracy impact)
- Poor user experience (frustration, lost trust)

**Estimated Fix Time:**
- Critical bugs: 2-3 days
- High severity: 3-4 days
- Medium severity: 1 week
- Low severity + refactoring: 2-3 weeks

---

**Report Generated:** 2025-12-11
**Component Version:** Current (claude/implement-strategy-feature-4)
**Total Issues:** 23 (3 Critical, 5 High, 8 Medium, 5 Low, 2 Info)
