# Current Feature: Projects Page Redesign

## Status

In Progress

## Goals

Rebuild the **Projects** page (`src/components/Projects.jsx`) to match the Claude Design handoff `Pomodoro Projects.html`, reusing the PomPay design system already established by the Dashboard redesign. Preserve all existing data wiring and CRUD.

### From the design (`Pomodoro Projects.html`)
- **Page head:** Fredoka `h1` "Projects" + a stats subline (`N active · {hours}h {mins}m tracked · {balance}`), a grid/list **view-toggle segment** (pill group), and an ink **New Project** primary button — all on one row.
- **List view (default):** bordered `panel` table — columns ID · Project Name (color dot) · Created Date · Time Tracked (mini progress bar + duration pill) · Balance (right, pos/zero/neg color) · View button. Visually the same table already styled for the Dashboard (`pd-ptable`).
- **Grid view:** 3-up cards, each with a left **accent stripe** in the project color, top row (color dot + name + `NN` id pill), Time-tracked row with a relative bar, Balance row, and a footer (created date + "Open →"). Plus a dashed **"New Project" add-card** as the last cell.
- **View toggle persisted** to `localStorage` (design key `pompay-projects-view`; app already uses `projectsViewMode` — keep the app key).
- Tokens identical to Dashboard: navy `#131a2a`, surface `#1b2336`, track `#232c42`, c1/c2/c3 cyan/violet/magenta, pos green; Fredoka + Inter.

### Success criteria
- Projects page renders the two views faithfully (list + grid) with real project data.
- Grid/list toggle works and persists.
- All current functionality preserved: open project (→ `/projects/:id`), New Project modal (add), edit, delete, empty state.
- `npm run build` passes.

## Notes

- **Scoped styles:** add `src/styles/ProjectsRedesign.css` scoped under `.pompay-projects` / `pp-*` (mirror the `DashboardRedesign.css` / `.pompay-dash` approach). Do **not** touch the 11k-line `App.css`.
- **Balance source:** the design's "Balance" = earnings − expenses. Current list uses earnings-only. Reuse `calcProjectBalance` from `src/utils/financialUtils.js` (already used by the Dashboard) for consistency — requires the `useFinancialTransactions` hook here.
- **Time bar width:** relative to the max `timeTracked` across projects (same `timePct` pattern as the Dashboard projects table).
- **Header subline aggregate:** N active = project count; total tracked = sum of `timeTracked`; balance = sum of `calcProjectBalance`.
- **App nav:** the prototype's top `.nav` is app-level chrome — the app already has `Navigation.jsx`; do not port the prototype nav.
- **Resolved scope decisions:**
  1. **Edit/delete** — keep a subtle, theme-styled `ActionsMenu` (⋮) on each grid card + a row action in the list view. Preserve all CRUD.
  2. **Add/Edit modal** — lightly restyle to the new tokens (navy surface, Fredoka, pill inputs) while keeping current form logic/validation.
  3. **Empty state** — use the design's dashed "New Project" add-card as the zero-projects affordance (drop the `EmptyState` component on this page).

## History (One liner)

- Commit Baseline Migrations for Core Tables — added `baseline_core_tables.sql` with `CREATE TABLE IF NOT EXISTS` + RLS policies for `projects`, `pomodoro_sessions`, `financial_transactions` (PR #223).
- Share-Link RPC Refactor — added `share_link_rpc.sql` with `get_shared_project_data` SECURITY DEFINER RPC (server-side token + expiry + email allowlist enforcement), tightened `access_type` to `read-only`; closes audit Critical #1, #2, High #4.
- Auth Hardening (Medium + Low) — added `auth_hardening_medium.sql` and `auth_hardening_low.sql`, aligned auth forms with `validatePassword`; closes audit Medium #1-3 and Low #4-5.
- Code-Scanner Quick Wins — dead-code cleanup in Timer/useProjects/FinancialOverview; fixed a Timer TDZ crash that only surfaced in dev mode.
- Dashboard Cleanup — Dashboard.jsx scanner fixes (W1-W10, S5) + extracted `src/utils/dateUtils.js` and `src/utils/financialUtils.js`; ProjectDetail uses formatRelativeDate (PR #231).
- Timer Auto Focus-Mode + Critical A11y — auto-engage `fullFocusMode` 5s after Start; added focus traps to settings modal and stats drawer; screen-reader announcements on timer transitions; aria-labels on FloatingTimer buttons (PR #232).
- Timer Polish — moved session-progress panel into Stats drawer; closed UI-review Warnings W6-W13/W15 + Suggestions S17-S20; added DialogContext + DialogHost for toasts and confirms replacing all alert()/window.confirm() calls; migrated focus visibility to native `:focus-visible`; fixed mobile mode-tab functional bug; bumped FloatingTimer tap targets to 44x44.
- Timer Minimalist Redesign — rebuilt the Timer screen from the Claude Design handoff to a two-state (setup/running) layout: vertical right-edge toolbar, gradient-ring overlay readout, cohesive button hierarchy, stepper/switch settings drawer, zen mode. All Supabase/session wiring preserved (`feat/timer-redesign`). Overlay system (spec 05) added: spec'd settings drawer + blurred scrim and a stats popover, mutually exclusive with Esc/outside-click dismiss. Styling converted from a scoped CSS file to styled-components (`Timer.styles.js`); Fredoka loaded via `index.html`. Mobile (≤560px) ported from `Pomodoro Mobile.html`: toolbar → centered top pill, ring scales to `min(76vw,330px)` with overflow clipped, settings drawer → bottom sheet with grab handle, stats popover spans the top, meta stacks, controls wrap.
- Dashboard Redesign — rebuilt Dashboard from Claude Design handoff (`Pomodoro Dashboard.html`): pompay tokens via scoped `DashboardRedesign.css`, hero summary with range tabs/sparklines/deltas, projects table (mobile cards), goals/streaks, per-session recent pomodoros, financial activity, inline tag stats; mobile range dropdown and equal-height grid panels. Polish pass widened the content cap 1200→1600px, fixed delta chevrons to point down on negative trends, made Goals a narrower side column, added a tablet breakpoint stepping the 3-up stats to 2 columns before collapse, and widened the summary sparklines (`feat/dashboard-redesign`).
