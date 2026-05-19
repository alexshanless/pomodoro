# Current Feature

## Status

In Progress

## Goals

Auto-engage `fullFocusMode` after the timer starts so the Timer page minimalises itself during a session, **plus** the 5 Critical a11y findings from the ui-reviewer.

**Critical a11y fixes (bundled):**
- C1: Settings modal (`Timer.jsx:1542-1667`) gets `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `useFocusTrap(isSettingsOpen)`.
- C2: Stats drawer (`Timer.jsx:1671-1702`) gets `role="dialog"`, `aria-label="Statistics"`, and `useFocusTrap(isDrawerOpen)`.
- C3: `handleTimerComplete` (`Timer.jsx:535-676`) calls `announce(...)` with `'assertive'` priority on focus↔break transitions.
- C4: FloatingTimer minimize + music buttons (`FloatingTimer.jsx:102, 112`) — replace `title` with `aria-label`.
- C5: FloatingTimer close button (`FloatingTimer.jsx:116`) — add `aria-label="Close timer widget"`.

**Auto-focus-mode:**

**Behaviour:**
- When `timerOn` becomes true and `isPaused` is false, start a 5-second timer that sets `fullFocusMode = true`.
- If the user pauses (`isPaused` becomes true) or stops the timer (`timerOn` becomes false) within that 5s window, cancel the timer — don't enter focus mode.
- If the user pauses or stops *after* focus mode is engaged, exit focus mode immediately (set `fullFocusMode = false`).
- The existing manual toggle button (`Timer.jsx:1324`) continues to work as an escape hatch / re-enter.
- The existing CSS for `.full-focus` already hides mode tabs, project picker, settings/stats triggers, streak badge, etc. — no new CSS needed.

**Implementation sketch:**
- New `useEffect` in `Timer.jsx` keyed on `[timerOn, isPaused]`:
  - If `timerOn && !isPaused && !fullFocusMode`: set a 5000ms `setTimeout` that calls `setFullFocusMode(true)`. Store the timeout id in a ref. Return cleanup that clears it.
  - If `!timerOn || isPaused`: call `setFullFocusMode(false)` (and the cleanup above handles cancellation of the pending one).
- Constant: `const AUTO_FOCUS_DELAY_MS = 5000` near the top of the component.

## Notes

- Branch name: `feat/timer-auto-focus-mode`
- Single small PR.
- Out of scope: configurable delay in settings, ESC-to-exit, fade animation tuning (the CSS transition should already exist for the manual toggle).
- Verify on the Timer page: Start → wait 5s → chrome fades out, only timer + controls remain. Pause within 5s → never enters focus mode. Pause after entering → exits immediately. Refresh mid-session → behaviour matches the persisted `timerOn` state on rehydrate.

## History (One liner)

- Commit Baseline Migrations for Core Tables — added `baseline_core_tables.sql` with `CREATE TABLE IF NOT EXISTS` + RLS policies for `projects`, `pomodoro_sessions`, `financial_transactions` (PR #223).
- Share-Link RPC Refactor — added `share_link_rpc.sql` with `get_shared_project_data` SECURITY DEFINER RPC (server-side token + expiry + email allowlist enforcement), tightened `access_type` to `read-only`; closes audit Critical #1, #2, High #4.
- Auth Hardening (Medium + Low) — added `auth_hardening_medium.sql` and `auth_hardening_low.sql`, aligned auth forms with `validatePassword`; closes audit Medium #1-3 and Low #4-5.
- Code-Scanner Quick Wins — dead-code cleanup in Timer/useProjects/FinancialOverview; fixed a Timer TDZ crash that only surfaced in dev mode.
- Dashboard Cleanup — Dashboard.jsx scanner fixes (W1-W10, S5) + extracted `src/utils/dateUtils.js` (parseLocalDate, formatRelativeDate, getDateRangeForFilter, isDateInRange) and `src/utils/financialUtils.js` (calcProjectBalance); ProjectDetail uses formatRelativeDate (PR #231).
