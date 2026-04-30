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

### B) Projects

- Unlimited projects per user
- Custom color and sequential project numbering (#1, #2, …)
- Per-project hourly rate
- Calendar view of historical sessions
- Per-project analytics: hours, sessions, earnings, trends

### C) Financial Tracking

- Income and expense entries linked to a project
- Per-project balance = earnings − expenses
- Recurring transactions (subscriptions, retainers)
- Financial overview dashboard with charts
- Export per project or globally to CSV / PDF

### D) Authentication

- Supabase Auth (email + password)
- Multi-device sync once signed in
- Row Level Security (RLS) so each user sees only their own data

### E) Sharing & Collaboration

- Generate read-only share links for a project
- Optional expiration dates
- Optional email allowlist
- Per-link view analytics (count, last viewed)
- Public `SharedProjectView` page (no auth required)
- Team-collaboration infrastructure scaffolded for future multi-user sessions

### F) Other

- Goals & streaks tracking
- Tags for sessions/projects
- Session timeout warning + idle handling
- Offline notification banner
- Account settings, full settings, user settings views
- Profile pictures
- Error boundary + fallback UI

## Data Model

Tables live in Supabase Postgres. Migrations are SQL files in `database/migrations/` and applied via the Supabase SQL editor. **Never** modify schema directly in the dashboard — always commit a migration.

Existing migrations:

- `00_complete_base_schema.sql` — base schema
- `create_project_sharing.sql` — project share links
- `create_team_collaboration.sql` — team infrastructure

Approximate entities (consult migrations for source of truth):

**users** (managed by Supabase Auth — `auth.users`, extended with profile/settings tables)

- id (uuid)
- email
- created_at

**user_settings**

- user_id (fk → auth.users)
- session timeout, theme, sound prefs, default work/break durations, etc.

**projects**

- id, user_id
- name, color, project_number (sequential per user)
- hourly_rate
- created_at, updated_at

**pomodoro_sessions**

- id, user_id, project_id
- started_at, ended_at, duration (seconds)
- type (work | break)
- earnings (computed from project rate at time of session)

**financial_transactions**

- id, user_id, project_id
- type (income | expense)
- amount, currency
- description, date
- recurring (bool), recurrence_interval

**goals_streaks**

- id, user_id
- daily/weekly goals, current streak, longest streak

**project_shares**

- id, project_id, user_id
- token (public link)
- expires_at, allowed_emails[]
- view_count, last_viewed_at

**tags / session_tags** (many-to-many)

All user-owned tables enforce RLS so `user_id = auth.uid()`.

## Tech Stack

- **Framework:** React 18 + Create React App (`react-scripts` 5)
- **Language:** JavaScript / JSX — no TypeScript
- **Routing:** React Router v6 (`react-router-dom`)
- **Styling:** styled-components (primary) + per-component `.css` where needed
- **State:** Custom hooks + React Context (`AuthContext`, `OfflineContext`) + `localStorage` for offline persistence
- **Backend:** Supabase (Postgres + Auth + RLS); client in `src/lib/supabaseClient.js`
- **Background work:** Web Workers (timer continues when tab is hidden)
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
- When the user is signed in and online, custom hooks sync to Supabase
- Offline mutations are queued (`useOfflineQueue.js`) and replayed on reconnect
- `useOnlineStatus.js` drives the offline banner and queue replay

## Status

- All major features implemented and functional
- In QA/refinement phase: bug fixing, edge cases, performance, UX polish
- Next milestone: PWA implementation (installable, full offline)
