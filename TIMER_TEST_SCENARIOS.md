# Timer.jsx Test Scenarios

## Critical Bug Test Cases

### Test Case 1: Browser Close Session Recovery
**Tests:** BUG-001
**Priority:** CRITICAL

**Setup:**
1. Log in as authenticated user
2. Select project with hourly rate ($100/hr)
3. Start timer in focus mode

**Steps:**
1. Wait 30 minutes
2. Force close browser tab (or use DevTools > Application > Clear storage > Refresh)
3. Reopen application
4. Check for recovery prompt

**Expected Results:**
- ✅ Recovery prompt appears asking to restore session
- ✅ Accepting prompt saves ~30 minutes to project
- ✅ Project time tracked increases by ~30 minutes
- ✅ Session appears in recent sessions list
- ✅ No unsaved-session-* keys remain in localStorage

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

### Test Case 2: Mid-Pomodoro "Finish & Save"
**Tests:** BUG-002
**Priority:** CRITICAL

**Setup:**
1. Log in
2. Set settings: includeBreaksInTracking = false
3. Set focus duration = 25 minutes
4. Select project

**Steps:**
1. Start focus timer
2. Wait exactly 15 minutes
3. Click "Finish & Save"
4. Confirm save
5. Check saved session in recent sessions

**Expected Results:**
- ✅ Confirmation shows "15 minutes of focus time"
- ✅ Saved session duration = 15 minutes (not 0)
- ✅ Project time increases by 15 minutes
- ✅ If project has rate, earnings = (15/60) * rate

**Actual Results:**
- [ ] Pass
- [ ] Fail - Duration saved: ___ minutes

---

### Test Case 3: Multi-Tab Session Conflict
**Tests:** BUG-003
**Priority:** CRITICAL

**Setup:**
1. Log in
2. Open app in Tab A
3. Open app in Tab B (same browser)

**Steps:**
1. In Tab A: Start timer
2. In Tab B: Observe behavior
3. In Tab B: Try to start timer
4. In Tab A: Save session
5. In Tab B: Check state

**Expected Results:**
- ✅ Tab B shows alert when Tab A starts session
- ✅ Tab B prevents starting duplicate session
- ✅ When Tab A saves, Tab B updates to reflect session end
- ✅ Only ONE session saved to database

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

### Test Case 4: Cross-Midnight Session
**Tests:** BUG-006
**Priority:** HIGH

**Setup:**
1. Set system time to 11:50 PM
2. Log in
3. Select project

**Steps:**
1. Start timer at 11:50 PM
2. Let timer run
3. At 12:05 AM (next day), refresh page
4. Check timer state

**Expected Results:**
- ✅ Session continues after midnight
- ✅ Timer shows correct remaining time
- ✅ sessionStartTime preserved
- ✅ Total duration calculates correctly

**Alternative Test (without changing system time):**
1. Manually set localStorage sessionStartTime to yesterday's date
2. Manually set timerState date to yesterday
3. Set targetEndTime to now + 10 minutes
4. Refresh page
5. Verify timer restores

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

### Test Case 5: Rapid Project Switching
**Tests:** BUG-005
**Priority:** HIGH

**Setup:**
1. Log in
2. Create 3 projects: A, B, C
3. Start timer with Project A

**Steps:**
1. Work for 10 minutes
2. Rapidly switch: A → B (click)
3. Immediately switch: B → C (click before save completes)
4. Check database for saved sessions

**Expected Results:**
- ✅ Only ONE session saved (to Project A)
- ✅ Second switch blocked until first save completes
- ✅ Alert shown: "Please wait for current save to complete"
- ✅ Project selector reverts if switch blocked

**Actual Results:**
- [ ] Pass
- [ ] Fail - Sessions saved: ___ (should be 1)

---

## Edge Case Test Scenarios

### Test Case 6: 24+ Hour Session
**Tests:** BUG-013
**Priority:** MEDIUM

**Setup:**
1. Manually set sessionStartTime to 30 hours ago
2. Set isInActiveSession = true
3. Refresh page

**Steps:**
1. Click "Finish & Save"
2. Check calculated duration

**Expected Results:**
- ✅ Warning shown about unusually long session
- ✅ Option to cap at 24 hours
- ✅ Duration doesn't cause database error

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

### Test Case 7: Worker Failure Handling
**Tests:** BUG-008
**Priority:** HIGH

**Setup:**
1. Temporarily rename /public/timer-worker.js
2. Clear browser cache
3. Refresh page

**Steps:**
1. Try to start timer
2. Observe error handling

**Expected Results:**
- ✅ Error message shown to user
- ✅ App doesn't crash
- ✅ Helpful message: "Please refresh the page"
- ✅ Console shows worker error

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

### Test Case 8: Pause During Break (includeBreaks = false)
**Tests:** BUG-011
**Priority:** MEDIUM

**Setup:**
1. Set includeBreaksInTracking = false
2. Set continuousTracking = true
3. Start and complete one pomodoro

**Steps:**
1. Auto-start short break
2. Click Pause during break
3. Wait 2 minutes
4. Resume
5. Complete break, complete next pomodoro
6. Click "Finish & Save"
7. Check saved duration

**Expected Results:**
- ✅ Duration = only focus time (25 min)
- ✅ Break pause time doesn't affect calculation
- ✅ Clear indication to user that breaks aren't tracked

**Actual Results:**
- [ ] Pass
- [ ] Fail - Duration: ___ (expected: 25)

---

### Test Case 9: Settings Change During Active Session
**Tests:** BUG-016
**Priority:** MEDIUM

**Setup:**
1. Set continuousTracking = true
2. Start timer
3. Pause timer (session still active)

**Steps:**
1. Open settings
2. Change continuousTracking = false
3. Try to save settings

**Expected Results:**
- ✅ Warning shown: "This will end your current session"
- ✅ Option to cancel
- ✅ If confirmed, session saved and reset
- ✅ Settings applied

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

### Test Case 10: Corrupted localStorage Data
**Tests:** BUG-010
**Priority:** MEDIUM

**Setup:**
1. Open DevTools > Application > localStorage
2. Set sessionStartTime = "1900-01-01T00:00:00.000Z"
3. Set totalPausedTime = "-999999"
4. Set isInActiveSession = "true"
5. Refresh page

**Steps:**
1. Observe app behavior
2. Try to start timer
3. Try to save session

**Expected Results:**
- ✅ App loads without crashing
- ✅ Invalid data ignored/reset
- ✅ No negative durations calculated
- ✅ No extremely old dates accepted

**Actual Results:**
- [ ] Pass
- [ ] Fail - Reason: _______________

---

## Integration Test Scenarios

### Scenario A: Full Work Session with Breaks
**Tests:** Complete user workflow

**Steps:**
1. Log in
2. Create project "Client Work" with rate $150/hr
3. Set settings:
   - Focus: 25 min
   - Short break: 5 min
   - continuousTracking: true
   - includeBreaksInTracking: false
   - autoStartBreaks: true
   - autoStartPomodoros: true
4. Start timer
5. Let complete automatically through:
   - Focus 1 (25 min)
   - Break 1 (5 min)
   - Focus 2 (25 min)
   - Break 2 (5 min)
   - Focus 3 (25 min)
6. Click "Finish & Save"

**Expected Results:**
- ✅ Session duration = 75 minutes (3 × 25, breaks not counted)
- ✅ Project time increases by 75 minutes
- ✅ Earnings = $187.50 (75/60 × $150)
- ✅ 3 pomodoros counted in today's stats

---

### Scenario B: Full Work Session with Breaks Included
**Tests:** Alternative tracking mode

**Steps:**
Same as Scenario A, but:
- Set includeBreaksInTracking: true

**Expected Results:**
- ✅ Session duration = 85 minutes (75 focus + 10 breaks)
- ✅ Project time increases by 85 minutes
- ✅ Earnings = $212.50 (85/60 × $150)
- ✅ 3 pomodoros counted in today's stats

---

### Scenario C: Interrupted Session with Recovery
**Tests:** Real-world interruption handling

**Steps:**
1. Log in
2. Start 25-minute timer with project
3. Work for 12 minutes
4. Close browser (accidentally)
5. Reopen app after 5 minutes
6. Check recovery

**Expected Results:**
- ✅ Recovery prompt shows
- ✅ Recovers ~12 minutes of work
- ✅ User can continue with new session

---

## Performance Test Scenarios

### Test Case P1: Rapid State Updates
**Setup:**
1. Start timer
2. Open React DevTools

**Steps:**
1. Click pause/resume rapidly 10 times
2. Observe re-renders
3. Check for performance issues

**Expected Results:**
- ✅ No excessive re-renders
- ✅ No memory leaks
- ✅ Smooth UI performance

---

### Test Case P2: Long-Running Session
**Setup:**
1. Manually set sessionStartTime to 4 hours ago
2. Set isInActiveSession = true

**Steps:**
1. Let session run for 10 minutes
2. Check browser memory
3. Click "Finish & Save"
4. Verify save succeeds

**Expected Results:**
- ✅ Memory usage stable
- ✅ No memory leaks
- ✅ Save completes successfully
- ✅ Large duration handled correctly

---

## Browser Compatibility Tests

Test in each browser:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Features to verify:**
- ✅ Web Worker support
- ✅ BroadcastChannel API (fallback for unsupported)
- ✅ navigator.sendBeacon (fallback for unsupported)
- ✅ Audio API for completion sound
- ✅ Notifications API

---

## Regression Test Checklist

After applying fixes, verify these don't break:

- [ ] Timer countdown works normally
- [ ] Pause/resume works
- [ ] Manual mode switching (Focus/Break) works
- [ ] Settings save and apply
- [ ] Project selection works
- [ ] Session description autocomplete works
- [ ] Tags input works
- [ ] Stats drawer shows data
- [ ] Calendar view works
- [ ] Recent sessions display correctly
- [ ] Streaks calculate correctly
- [ ] Full focus mode works
- [ ] Music toggle works
- [ ] Notifications work
- [ ] Sound effects work
- [ ] Mobile layout works
- [ ] Keyboard navigation works

---

## Automated Test Template

```javascript
// Example Jest test for BUG-002

describe('Timer Session Tracking', () => {
  test('should save correct duration when finishing mid-pomodoro', async () => {
    const { getByText, getByLabelText } = render(<Timer />);

    // Login
    await login('test@example.com');

    // Set includeBreaksInTracking = false
    setSettings({ includeBreaksInTracking: false });

    // Start 25-minute timer
    fireEvent.click(getByLabelText('Start timer'));

    // Fast-forward 15 minutes
    jest.advanceTimersByTime(15 * 60 * 1000);

    // Click Finish & Save
    fireEvent.click(getByText('Finish & Save'));
    fireEvent.click(getByText('OK')); // Confirm dialog

    // Verify saved session
    const savedSession = await getSavedSession();
    expect(savedSession.duration).toBe(15); // Not 0!
  });
});
```

---

## Manual Testing Checklist

Before deploying fixes:

- [ ] All CRITICAL tests pass
- [ ] All HIGH priority tests pass
- [ ] At least 80% of MEDIUM tests pass
- [ ] No new bugs introduced
- [ ] Performance is acceptable
- [ ] Mobile works correctly
- [ ] Browser compatibility verified
- [ ] Error messages are user-friendly
- [ ] No console errors
- [ ] No console warnings (except expected)

---

## Test Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase (if testing locally)
# Follow: https://supabase.com/docs/guides/cli/local-development

# 3. Seed test data
npm run seed:test

# 4. Start dev server
npm run dev

# 5. Open in multiple browsers for cross-browser testing
```

---

## Bug Report Template

If a test fails:

```markdown
## Bug Report

**Test Case:** [Test case number/name]
**Priority:** [Critical/High/Medium/Low]
**Reproducible:** [Always/Sometimes/Rarely]

**Environment:**
- Browser: [Chrome 120.0.0]
- OS: [macOS 14.0]
- Device: [Desktop/Mobile]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Logs:**
[Attach if available]

**Additional Notes:**
[Any other relevant information]
```

---

## Success Criteria

✅ **All critical bugs fixed** when:
1. ✅ Browser close saves sessions (0% data loss)
2. ✅ Mid-pomodoro saves show correct duration
3. ✅ Multi-tab doesn't cause duplicate saves
4. ✅ Cross-midnight sessions work
5. ✅ All regression tests pass

**Ready for production** when:
- All CRITICAL tests: 100% pass
- All HIGH tests: 100% pass
- All MEDIUM tests: ≥80% pass
- All regression tests: 100% pass
- No P0/P1 bugs remaining
