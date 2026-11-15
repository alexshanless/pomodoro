# PomPay Project Specification

## Problem (Core Idea)

Freelancers and consultants split their day between two tools: a focus timer (Pomodoro, time-blocking apps) and a separate system for billable hours (spreadsheets, invoicing apps, memory). This causes double entry, missed time, inaccurate invoices, and constant context switching.

PomPay merges the two: when the Pomodoro timer runs against a project, earnings accrue automatically based on that project's hourly rate. One tool, focus + financial truth.

## Users

- **Freelance Developer** — Tracks focus sessions and billable hours per client; needs accurate, exportable session history.
- **Consultant** — Bills hourly across multiple clients; needs per-project financial summaries and PDF/CSV export for invoices.
- **Solopreneur / Indie Hacker** — Tracks project-level income vs. expenses (subscriptions, contractors) to see real margins.
- **Agency Contractor** — Shares read-only project dashboards with clients for transparent reporting.

## Features

### A) Pomodoro Timer

- Customizable work/break durations (default 25 / 5)
- Background timer using **Web Workers** — keeps running when the tab is minimized or backgrounded
- **Floating timer widget** persists across all pages
- Auto-start options for chained sessions
- Lo-fi music integration
- Selectable active project — the running timer accrues time + earnings against that project
- Installable PWA with an offline shell, plus closed-tab completion notifications via Web Push
- Electron desktop widget (`desktop/`) that loads the `/widget` route

### B) Projects

- Unlimited projects per user
- Custom color and sequential project numbering (#1, #2, …)
- Per-project hourly rate
- Calendar view of historical sessions
- Per-project analytics: hours, sessions, earnings, trends
- Tasks per project with estimated vs actual pomodoros; sessions link to a task via `pomodoro_sessions.task_id`

### C) Financial Tracking

- Income and expense entries linked to a project
- Per-project balance = earnings − expenses
- Recurring transactions (subscriptions, retainers)
- Financial overview dashboard with charts
- Export per project or globally to CSV / PDF

### D) Authentication

- Supabase Auth (email + password, and Google OAuth)
- Guest mode: the whole app works signed out with localStorage; guest data can be imported after sign-up
- Multi-device sync once signed in; data providers reload when the app regains focus, at most once a minute (`src/hooks/useFocusRefresh.js`)
- Row Level Security (RLS) so each user sees only their own data

### E) Sharing & Collaboration

- Generate read-only share links for a project
- Optional expiration dates
- Optional email restriction (one address; the viewer must sign in with it)
- Per-link view analytics (count, last viewed); a view is recorded at most once per minute per link, so the count is not raw page loads
- Public `SharedProjectView` page (no auth required); validation and data access go through the `get_shared_project_data` RPC
- Team-collaboration tables exist but are dormant: no UI, all client access revoked, and the RLS policies must be fixed before the feature ships

### F) Other

- Goals & streaks tracking
- Tags on sessions
- Offline notification banner
- Account settings, full settings, user settings views
- Profile pictures
- Error boundary + fallback UI

## Data Model

Tables live in Supabase Postgres. Migrations are SQL files in `database/migrations/` and applied via the Supabase SQL editor. **Never** modify schema directly in the dashboard — always commit a migration.

See `database/migrations/README.md` for the full list of migrations and their run order.

Approximate entities (consult migrations for source of truth):

**users** (managed by Supabase Auth — `auth.users`, extended with profile/settings tables)

- id (uuid)
- email
- created_at

**user_settings**

- user_id (fk → auth.users)
- selected_project_id
- Not read by the app today: timer settings and the selected project live in localStorage

**projects**

- id, user_id
- name, description, color, project_number (sequential per user)
- hourly_rate
- total_time_minutes, pomodoros_count, balance, is_archived
- created_at, updated_at

**pomodoro_sessions**

- id, user_id, project_id, task_id
- started_at, ended_at, duration_minutes
- mode (`focus` | `shortBreak` | `longBreak`), was_successful
- description, tags (text[])
- No stored earnings: earnings are computed from the project's current hourly_rate

**financial_transactions**

- id, user_id, project_id
- type (income | expense)
- amount, currency, category
- description, occurred_at
- is_recurring, recurring_type (weekly | monthly | yearly), parent_transaction_id

**user_goals** / **user_streaks**

- user_id (one row each per user)
- daily_goal, weekly_goal / current_streak, longest_streak, last_activity_date

**tasks**

- id, user_id, project_id
- title, estimated_pomodoros, completed_pomodoros
- status (open | done), completed_at

**project_shares** / **project_share_views**

- id, project_id, shared_by_user_id
- share_token (public link), label, access_type (always `read-only`)
- expires_at, is_active, shared_with_email (single optional address)
- view_count, last_accessed_at; one `project_share_views` row per recorded view

**push_subscriptions** / **timer_notifications**

- Web Push subscriptions per browser, and one pending notification per running timer (`fire_at`, `sent_at`)

**teams, team_members, team_sessions, team_session_participants, team_invitations**

- Dormant; no client grants (see `audit_security_hardening.sql`)

Tags are a `text[]` column on `pomodoro_sessions`; there is no tags table.

All user-owned tables enforce RLS so `user_id = auth.uid()` (`project_shares` uses `shared_by_user_id`).

## Tech Stack

- **Framework:** React 18 + Create React App (`react-scripts` 5)
- **Language:** JavaScript / JSX — no TypeScript
- **Routing:** React Router v6 (`react-router-dom`)
- **Styling:** styled-components (primary) + per-component `.css` where needed
- **State:** Custom hooks + React Context (`AuthContext`, `OfflineContext`, `TimerContext`, and data providers such as `ProjectsContext`) + `localStorage` for offline persistence
- **Backend:** Supabase (Postgres + Auth + RLS); client in `src/lib/supabaseClient.js`
- **Background work:** Web Workers (timer continues when tab is hidden)
- **PWA:** Workbox service worker (`src/service-worker.js`); Web Push sent by the `send-timer-notifications` edge function, called by a guarded `pg_cron` job
- **Charts:** Recharts, `react-circular-progressbar`
- **Date pickers:** `react-datepicker`, `react-calendar`
- **Icons:** `react-icons`
- **Export:** `jspdf` + `jspdf-autotable` (PDF), CSV via custom utils
- **Testing:** `@testing-library/react`, `@testing-library/jest-dom` (Jest via react-scripts)
- **Deployment:** Netlify (`netlify.toml`)

> ⚠️ **Database migrations:** Never use destructive Supabase dashboard edits. Add a new SQL file under `database/migrations/`, document it in the migrations README, and apply it via the Supabase SQL editor in dev → prod order.

## Monetization

Currently free / open source (MIT). Pricing model is **not yet implemented**. Future plans (TBD):

- Free tier with core timer + limited projects
- Paid tier for unlimited projects, advanced analytics, team collaboration, exports

## UI / UX

**General**

- Modern, clean, minimal interface
- Smooth transitions, hover states
- Toast notifications and loading skeletons
- Real-time updates as the timer ticks
- Dark-mode-compatible palette

**Layout**

- Top/side navigation (`Navigation.jsx`)
- Floating timer widget (`FloatingTimer.jsx`) persistent across routes
- Full focus mode for distraction-free Pomodoro sessions
- Drawers for stats and quick actions (`StatsDrawer.jsx`)

**Responsive**

- Desktop-first but fully mobile-usable
- Sidebar collapses / becomes drawer on small screens

**Micro-interactions**

- Smooth timer animations (`react-circular-progressbar`)
- Toast notifications for save/error events
- Loading states for async Supabase calls
- Offline banner when network is unavailable

## Offline & Sync Strategy

- App works offline using `localStorage` for projects, sessions, and transactions
- When the user is signed in and online, the data providers sync to Supabase
- Failed signed-in session saves and transaction adds are queued in `localStorage` by `src/utils/syncQueue.js` and replayed by the owning provider (`usePomodoroSessionsState.js`, `useFinancialTransactionsState.js`) on reconnect
- `useOnlineStatus.js`, shared through `OfflineContext`, drives the offline banner and queue replay
- Data providers reload when the app regains focus, at most once a minute (`src/hooks/useFocusRefresh.js`); skipped while offline

## Status

- All major features implemented and functional
- In QA/refinement phase: bug fixing, edge cases, performance, UX polish
- PWA shipped: phase 1 (installable + offline shell) and phase 2 (closed-tab push notifications)
