# Current Feature

## Status

Complete

## Goals

Dashboard cleanup PR — close real code-scanner and refactor-scanner findings for `src/components/Dashboard.jsx` in a single branch/PR.

**Code-scanner fixes (Dashboard.jsx):**
- W1: Remove bare `localStorage.setItem('settingsActiveTab', ...)` from inline onClick (L377); route through a small helper.
- W2: Call `getDailyProgress(pomodoroData)` / `getWeeklyProgress(pomodoroData)` once per render and reuse the result (L411-422, L436-447).
- W3: Replace `eslint-disable react-hooks/exhaustive-deps` with proper `useCallback` for `loadDashboardData` (L33, L41).
- W4: Replace derived `useState` + `useEffect` for `projects` / `recentSessions` / `recentTransactions` / `todayStats` with `useMemo` (L21-29, L85-153).
- W6 (narrowed): Add `aria-pressed={timeFilter === '...'}` to the five time-filter buttons (L227-256). Skip aria-label changes on Export button — it has visible text.
- W7: Use `sessionDay.date` as key instead of array index (L476).
- W9 (narrowed): Move *static* inline styles into CSS / styled-components (L221, 277, 309, 462, 558, 564, 565). Keep dynamic inline styles (L389 streak color, L422/L447 progress-bar width+background).
- W10: Make export modal accessible — `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `trapFocus` from `utils/accessibility.js` (L553-572).
- S5: Use `parseLocalDate` in `formatProjectDate` (L184) so created-date display is timezone-safe.

**Refactor-scanner extractions (cross-file dedup):**
- Create `src/utils/dateUtils.js`:
  - `parseLocalDate` (replaces copies in Dashboard.jsx:45, ProjectDetail.jsx:177)
  - `formatRelativeDate(date, { includeYear })` (replaces Today/Yesterday formatters in Dashboard, ProjectDetail, RecentSessions)
  - `getDateRangeForFilter(filter)` (replaces copies in Dashboard, FinancialOverview, InvoiceAnalytics)
- Create `src/utils/formatUtils.js`:
  - `formatMinutes(minutes)` (replaces 6 copies: Dashboard, Projects, ProjectDetail, SharedProjectView, Timer, CalendarView)
  - `formatShortDate(dateString)` (replaces 4 copies: Dashboard, Projects, ShareProjectModal, SharedProjectView)
  - `formatBalance(amount)` (replaces accounting-style ternary in Dashboard:347, Projects:295)
- Create `src/utils/financialUtils.js`:
  - `calcProjectBalance(projectId, incomes, spendings)` (replaces filter+reduce in Dashboard:139 and exportUtils:279)

## Notes

- Single branch / single PR covering both scanner reports.
- Branch: `chore/dashboard-cleanup`.
- Dropped as false positives / not worth the churn: W5 (harmless `balance` shadow), W8 (unguarded `timeEstimate` comparison — intended default), S2 (`projectById` lookup map — only 5 transactions), S3 (magic numbers like `slice(0,5)` read clearly).
- Out of scope: S1 (split Dashboard into `useDashboardStats` hook) and S4 (replace export modal with inline confirm).
- Must keep `npm run build` green; verify dashboard renders, time filters work, export modal opens/closes/traps focus, recent sessions/transactions display correctly.
- No TypeScript, Tailwind, or new state libraries (per coding standards).

## History (One liner)

- Commit Baseline Migrations for Core Tables — added `baseline_core_tables.sql` with `CREATE TABLE IF NOT EXISTS` + RLS policies for `projects`, `pomodoro_sessions`, `financial_transactions` (PR #223).
- Share-Link RPC Refactor — added `share_link_rpc.sql` with `get_shared_project_data` SECURITY DEFINER RPC (server-side token + expiry + email allowlist enforcement), tightened `access_type` to `read-only`; closes audit Critical #1, #2, High #4.
- Auth Hardening (Medium + Low) — added `auth_hardening_medium.sql` and `auth_hardening_low.sql`, aligned auth forms with `validatePassword`; closes audit Medium #1-3 and Low #4-5.
- Code-Scanner Quick Wins — dead-code cleanup in Timer/useProjects/FinancialOverview; fixed a Timer TDZ crash that only surfaced in dev mode.
- Dashboard Cleanup — Dashboard.jsx scanner fixes (W1-W10, S5) + extracted `src/utils/dateUtils.js` (parseLocalDate, formatRelativeDate, getDateRangeForFilter, isDateInRange) and `src/utils/financialUtils.js` (calcProjectBalance); ProjectDetail uses formatRelativeDate.
