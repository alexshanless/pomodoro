# Current Feature: None

## Status

Not Started

## Goals

_No active feature. Use `/feature load` to begin the next one._

## Notes

## History (One liner)

- Financial Redesign — rebuilt `FinancialOverview` from Claude Design handoff (`Pomodoro Financial.html`): scoped `FinancialRedesign.css` / `.pompay-financial`, page head with range tabs (persisted `pompay-fin-range`) + Add menu + export, 3-up overview tiles with deltas/sparklines, ported SVG cash-flow chart (range-bucketed income/spending bars + cyan net line + hover tooltip), in-range transactions list with `ActionsMenu` CRUD, spending-by-category bars, themed Add/Edit/Export modals; tile totals summed from the same chart bins so figures and chart always agree. Also restyled the global nav (`Navigation.jsx`) to the pompay look via scoped `NavRedesign.css` (`.pp-nav` / `.pp-nav-menu`) — translucent navy blur bar, Fredoka links with gradient active underline, gradient avatar, ink Sign-in pill, themed mobile drawer (`feat/financial-redesign`).
- Projects Redesign — rebuilt Projects from Claude Design handoff (`Pomodoro Projects.html`): scoped `ProjectsRedesign.css` / `.pompay-projects`, page head with stats subline + grid/list view toggle (persisted to `projectsViewMode`), list table + 3-up accent-stripe cards, dashed add-card empty state, themed Add/Edit modal, `ActionsMenu` CRUD, `calcProjectBalance` for balances (PR #237).

- Commit Baseline Migrations for Core Tables — added `baseline_core_tables.sql` with `CREATE TABLE IF NOT EXISTS` + RLS policies for `projects`, `pomodoro_sessions`, `financial_transactions` (PR #223).
- Share-Link RPC Refactor — added `share_link_rpc.sql` with `get_shared_project_data` SECURITY DEFINER RPC (server-side token + expiry + email allowlist enforcement), tightened `access_type` to `read-only`; closes audit Critical #1, #2, High #4.
- Auth Hardening (Medium + Low) — added `auth_hardening_medium.sql` and `auth_hardening_low.sql`, aligned auth forms with `validatePassword`; closes audit Medium #1-3 and Low #4-5.
- Code-Scanner Quick Wins — dead-code cleanup in Timer/useProjects/FinancialOverview; fixed a Timer TDZ crash that only surfaced in dev mode.
- Dashboard Cleanup — Dashboard.jsx scanner fixes (W1-W10, S5) + extracted `src/utils/dateUtils.js` and `src/utils/financialUtils.js`; ProjectDetail uses formatRelativeDate (PR #231).
- Timer Auto Focus-Mode + Critical A11y — auto-engage `fullFocusMode` 5s after Start; added focus traps to settings modal and stats drawer; screen-reader announcements on timer transitions; aria-labels on FloatingTimer buttons (PR #232).
- Timer Polish — moved session-progress panel into Stats drawer; closed UI-review Warnings W6-W13/W15 + Suggestions S17-S20; added DialogContext + DialogHost for toasts and confirms replacing all alert()/window.confirm() calls; migrated focus visibility to native `:focus-visible`; fixed mobile mode-tab functional bug; bumped FloatingTimer tap targets to 44x44.
- Timer Minimalist Redesign — rebuilt the Timer screen from the Claude Design handoff to a two-state (setup/running) layout: vertical right-edge toolbar, gradient-ring overlay readout, cohesive button hierarchy, stepper/switch settings drawer, zen mode. All Supabase/session wiring preserved (`feat/timer-redesign`). Overlay system (spec 05) added: spec'd settings drawer + blurred scrim and a stats popover, mutually exclusive with Esc/outside-click dismiss. Styling converted from a scoped CSS file to styled-components (`Timer.styles.js`); Fredoka loaded via `index.html`. Mobile (≤560px) ported from `Pomodoro Mobile.html`: toolbar → centered top pill, ring scales to `min(76vw,330px)` with overflow clipped, settings drawer → bottom sheet with grab handle, stats popover spans the top, meta stacks, controls wrap.
- Dashboard Redesign — rebuilt Dashboard from Claude Design handoff (`Pomodoro Dashboard.html`): pompay tokens via scoped `DashboardRedesign.css`, hero summary with range tabs/sparklines/deltas, projects table (mobile cards), goals/streaks, per-session recent pomodoros, financial activity, inline tag stats; mobile range dropdown and equal-height grid panels. Polish pass widened the content cap 1200→1600px, fixed delta chevrons to point down on negative trends, made Goals a narrower side column, added a tablet breakpoint stepping the 3-up stats to 2 columns before collapse, and widened the summary sparklines (`feat/dashboard-redesign`).
