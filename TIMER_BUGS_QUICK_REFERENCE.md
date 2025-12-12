# Timer.jsx Critical Bugs - Quick Reference

## 🔴 CRITICAL - FIX IMMEDIATELY

### 1. Session Data Loss on Browser Close
**Lines:** 269-303, 749-908
**Impact:** Users lose ALL session data if browser closes
**Example:** User works 3 hours at $100/hr, closes browser → loses $300 of billable time

**Quick Fix:**
```javascript
useEffect(() => {
  const handleBeforeUnload = async (e) => {
    if (isInActiveSession && sessionStartTime) {
      const duration = calculateCurrentSessionDuration();
      if (duration >= 1) {
        // Use sendBeacon for async save during unload
        const sessionData = {
          mode: 'focus',
          duration: duration,
          projectId: selectedProject?.id || null,
          startedAt: sessionStartTime.toISOString(),
          endedAt: new Date().toISOString()
        };
        navigator.sendBeacon('/api/sessions', JSON.stringify(sessionData));
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isInActiveSession, sessionStartTime, selectedProject]);
```

---

### 2. Wrong Duration When Finishing Mid-Pomodoro
**Lines:** 821-908, Line 766
**Impact:** Under-billing clients, incorrect time tracking
**Example:** User works 23 of 25 minutes → saves 0 minutes instead of 23

**Root Cause:**
```javascript
// Line 766 - WRONG: Only uses completed pomodoros
totalDurationMinutes = Math.round(totalTimeWorked / 60);

// Line 532 - totalTimeWorked only updated when pomodoro COMPLETES
setTotalTimeWorked(prev => prev + DURATIONS[MODES.FOCUS]);
```

**Quick Fix:**
```javascript
// In handleFinishEarly (and handleResetTimer), replace line 766:
if (!settings.includeBreaksInTracking) {
  let currentPomodoroTime = 0;
  if (currentMode === MODES.FOCUS && timerOn) {
    // Add current incomplete pomodoro time
    const elapsed = DURATIONS[MODES.FOCUS] - timeRemaining;
    currentPomodoroTime = elapsed;
  }
  totalDurationMinutes = Math.round((totalTimeWorked + currentPomodoroTime) / 60);
}
```

---

### 3. Multiple Tabs Cause Double-Billing
**Lines:** 269-303, 749-819
**Impact:** Same session tracked in 2+ tabs → duplicate saves
**Example:** 60 minutes of work counted as 120 minutes

**Quick Fix:**
```javascript
// Add at top of component
useEffect(() => {
  const handleStorageChange = (e) => {
    // Sync session state across tabs
    if (e.key === 'sessionStartTime') {
      const saved = e.newValue;
      setSessionStartTime(saved ? new Date(saved) : null);
    }
    if (e.key === 'isInActiveSession') {
      setIsInActiveSession(e.newValue === 'true');
    }
    // ... sync other keys
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// OR use BroadcastChannel for better control:
const channel = new BroadcastChannel('pomodoro-timer');

// When starting session:
channel.postMessage({ type: 'SESSION_STARTED' });

// Listen for conflicts:
channel.onmessage = (e) => {
  if (e.data.type === 'SESSION_STARTED' && isInActiveSession) {
    alert('Session already running in another tab!');
    // Stop this tab's timer
  }
};
```

---

## 🟠 HIGH PRIORITY - FIX THIS WEEK

### 4. Dead Code in Pause Check
**Lines:** 493-495
**Fix:** Delete these lines (timer can't complete while paused)

### 5. Race Condition in Project Switching
**Lines:** 1090-1163
**Fix:** Add loading state to prevent rapid switches

### 6. Session Lost at Midnight
**Lines:** 312-346
**Fix:** Allow restore if session started within 24 hours (not just "today")

### 7. No Worker Error Handling
**Lines:** 388-416
**Fix:** Add try/catch and onerror handler

---

## Testing Checklist

- [ ] Start session, close browser, reopen → session saved
- [ ] Work 15 min, click "Finish & Save" → 15 min saved (not 0)
- [ ] Open app in 2 tabs → no duplicate tracking
- [ ] Start session at 11:50 PM, continue past midnight → session continues
- [ ] Switch projects rapidly → no race condition
- [ ] Delete worker file → error message shown

---

## Files to Review

1. `/home/user/pomodoro/src/components/Timer.jsx` (main file)
2. `/home/user/pomodoro/public/timer-worker.js` (worker)
3. `/home/user/pomodoro/src/hooks/usePomodoroSessions.js` (session save)
4. `/home/user/pomodoro/src/hooks/useProjects.js` (project updates)

---

## Impact Summary

| Bug | Data Loss | Billing Error | App Crash |
|-----|-----------|---------------|-----------|
| Browser close | ✅ YES | ✅ YES | ❌ No |
| Mid-pomodoro | ✅ YES | ✅ YES | ❌ No |
| Multi-tab | ❌ No | ✅ YES (double) | ❌ No |
| Midnight | ✅ YES | ⚠️ Maybe | ❌ No |
| Project race | ⚠️ Possible | ✅ YES | ❌ No |

---

**PRIORITY ORDER:**
1. Browser close save (highest financial impact)
2. Mid-pomodoro duration (common use case)
3. Multi-tab sync (data integrity)
4. Everything else

**ESTIMATED TIME:**
- Fix #1-3: 2-3 days
- Test thoroughly: 1 day
- Deploy & monitor: 1 day
