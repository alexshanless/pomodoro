# Database Migrations

SQL migration files for the PomPay database schema.

## Quick Start (Fresh Database)

For a fresh database setup, run migrations in this order:

1. **`baseline_core_tables.sql`** - Core tables (projects, pomodoro_sessions, financial_transactions) with RLS — run this first
2. **`00_complete_base_schema.sql`** - All base features (settings, goals, streaks, tags, rates)
3. **`create_project_sharing.sql`** - Project sharing with clients (read-only links)
4. **`share_link_rpc.sql`** - `get_shared_project_data` RPC + tightens `access_type` to `read-only`
5. **`create_team_collaboration.sql`** - Team collaboration tables (dormant; locked down by `audit_security_hardening.sql`). Labeled optional, but `auth_hardening_medium.sql` creates a policy on `team_invitations` without checking that the table exists, so skipping this file makes step 6 fail
6. **`auth_hardening_medium.sql`** - Closes Medium-severity audit findings: drops redundant anon INSERT on `project_share_views`, adds DELETE policies on `user_settings`/`user_goals`/`user_streaks`/`team_invitations`
7. **`auth_hardening_low.sql`** - Closes Low-severity audit finding #5: revokes redundant anon SELECT grants on `project_shares` and `project_share_views` (defense-in-depth)
8. **`add_recurring_transactions.sql`** - Adds `is_recurring` / `recurring_type` / `parent_transaction_id` to `financial_transactions` plus a unique occurrence index — required for the recurring-transactions feature (the UI flag was previously dropped on save)
9. **`add_push_notifications.sql`** - Adds `push_subscriptions` and `timer_notifications` (with owner-only RLS) for Web Push timer notifications; see `docs/push-notifications-setup.md` for the edge function + cron wiring
10. **`create_tasks.sql`** - Adds the `tasks` table (owner-only RLS) and a nullable `task_id` column on `pomodoro_sessions` — required for the Tasks feature
11. **`audit_security_hardening.sql`** - Closes the 2026-11-14 audit findings: share links can no longer be re-pointed at another user's project, the share RPC only returns the share owner's data and throttles view recording, cross-owner `project_id` references are rejected, the dormant team tables are locked down, and free-text columns get length limits
12. **`audit_perf_indexes.sql`** - Adds indexes on the core tables, drops the duplicate per-operation RLS policies, and prunes `cron.job_run_details` daily

## Running Migrations

### Supabase Dashboard
1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to SQL Editor
3. Copy migration file contents
4. Run

### Supabase CLI
With Supabase CLI 3.x, `supabase db query --remote -f <file>` runs a SQL file against the linked project
(`supabase link --project-ref <ref>` once first). Without `--remote` it targets the
local database.

```bash
supabase db query --remote -f database/migrations/baseline_core_tables.sql
supabase db query --remote -f database/migrations/00_complete_base_schema.sql
supabase db query --remote -f database/migrations/create_project_sharing.sql
supabase db query --remote -f database/migrations/share_link_rpc.sql
supabase db query --remote -f database/migrations/create_team_collaboration.sql
supabase db query --remote -f database/migrations/auth_hardening_medium.sql
supabase db query --remote -f database/migrations/auth_hardening_low.sql
supabase db query --remote -f database/migrations/add_recurring_transactions.sql
supabase db query --remote -f database/migrations/add_push_notifications.sql
supabase db query --remote -f database/migrations/create_tasks.sql
supabase db query --remote -f database/migrations/audit_security_hardening.sql
supabase db query --remote -f database/migrations/audit_perf_indexes.sql
```

## Migration Files

### `baseline_core_tables.sql`
Core tables that were created in production before source-control began:
- `projects` — project list with hourly rate, color, time tracking
- `pomodoro_sessions` — individual focus/break session records
- `financial_transactions` — income and expense entries per project
- RLS enabled on all three; all 5 policies per table replicated from production
- Idempotent: safe to run on existing databases

**Status:** ✅ Production ready (documents existing production schema as of 2026-04-30)

### `00_complete_base_schema.sql`
Consolidated base schema including:
- User settings and preferences
- Goals and streaks tracking
- Project hourly rates and pomodoro counts
- Session tags system

**Status:** ✅ Production ready

### `create_tasks.sql`
Task/todo integration — plan work in tasks, track it in pomodoros:

- `tasks` — per-user task list (`title`, optional `project_id`, `estimated_pomodoros`,
  `completed_pomodoros`, `status` open/done, `completed_at`); owner-only RLS on all
  four operations; `updated_at` maintained by trigger
- `pomodoro_sessions.task_id` — nullable FK linking a saved session to the task it
  advanced (`on delete set null` keeps session history when a task is deleted)
- Idempotent: safe to re-run

**Status:** ✅ Ready — required for the Tasks panel on the Timer page

### `create_project_sharing.sql`
Project sharing system for client collaboration:
- Share projects via secure token links
- Read-only public access (no login required)
- View tracking and analytics
- Expiration dates and email restrictions

**Status:** ✅ Production ready
**Documentation:** See `COLLABORATION_FEATURES.md`

### `share_link_rpc.sql`
Hardens the project sharing flow by replacing direct anon SELECTs with a single
SECURITY DEFINER RPC:

- `get_shared_project_data(p_token, p_user_agent)` validates the token (active +
  not expired) and the email allowlist server-side, returns a curated project +
  sessions projection (no `user_id`), and records a view row
- Sentinel exceptions: `INVALID_OR_EXPIRED`, `AUTH_REQUIRED`, `EMAIL_MISMATCH`
- Tightens `project_shares.access_type` CHECK constraint to `'read-only'` and
  coerces any legacy `'comment'` / `'edit'` rows
- Idempotent: safe to re-run

**Status:** ✅ Production ready (closes audit Critical #1, #2 and High #4)

### `create_team_collaboration.sql`
Team collaboration infrastructure:
- Team management with roles
- Collaborative pomodoro sessions
- Invitation system
- Future: Real-time collaboration

**Status:** Dormant and locked down. No UI uses these tables, `audit_security_hardening.sql`
revokes all client access to them, and their RLS policies are known to be wrong. Fix the
policies before re-granting access.
**Documentation:** See `COLLABORATION_FEATURES.md`

### `auth_hardening_medium.sql`
Closes the three Medium-severity findings from the 2026-05-01 auth audit:

- **M1** — Drops the `Anonymous users can insert share views` policy on
  `project_share_views` and revokes the anon INSERT grant. View recording
  now happens exclusively inside `get_shared_project_data` (SECURITY
  DEFINER), so the anon path is redundant *and* allowed any anon caller to
  inflate `view_count` for any discoverable `share_id` via the
  `increment_view_count_on_insert` trigger.
- **M2** — Adds `Users can delete their own ...` policies on `user_settings`,
  `user_goals`, `user_streaks` so users can clean up their own rows
  (consistent with the DELETE coverage already present on `projects`,
  `pomodoro_sessions`, `financial_transactions`).
- **M3** — Adds `Owners and admins can delete invitations` on
  `team_invitations` (mirrors the existing INSERT policy; previously the
  only revocation path was `UPDATE … status = 'expired'`).
- Idempotent: safe to re-run.

**Status:** ✅ Production ready (closes audit Medium #1, #2, #3)

### `auth_hardening_low.sql`
Defense-in-depth follow-up to `auth_hardening_medium.sql`. Revokes the now-redundant
anon `SELECT` grants on `project_shares` and `project_share_views`:

- After `share_link_rpc.sql`, the public share view consumes
  `get_shared_project_data` (SECURITY DEFINER) instead of querying
  `project_shares` directly. The anon grants are dead surface area.
- RLS already blocks anon reads on both tables, so this revoke is purely
  defensive — it removes the table-level grant so a future RLS
  misconfiguration cannot accidentally expose them.
- Idempotent: REVOKE on a missing grant is a no-op.

**Status:** ✅ Production ready (closes audit Low #5)

### `add_push_notifications.sql`
Web Push timer notifications so a completed Pomodoro can notify the user even
when the app tab is closed:

- `push_subscriptions` — one row per browser `PushSubscription` per user
  (`endpoint` UNIQUE, full `subscription` JSONB); owner-only RLS
- `timer_notifications` — one row per running timer (`fire_at`, `title`, `body`,
  `tag`, nullable `sent_at`); owner-only RLS; partial index on `(fire_at)` where
  `sent_at IS NULL` for the cron poller
- Delivery is handled by the `send-timer-notifications` edge function (service
  role key, bypasses RLS). A `pg_cron` job checks every minute and calls it via
  `pg_net` only when a row is due; the unguarded every-minute call bloated
  `net._http_response` and pinned the database
- Idempotent: safe to re-run

**Setup:** See `docs/push-notifications-setup.md` for VAPID keys, edge-function
deploy, secrets, and the cron schedule SQL.

**Status:** ✅ Production ready

### `audit_security_hardening.sql`
Closes the findings from the 2026-11-14 security audit:

- `project_shares` UPDATE policy gains a `WITH CHECK` on project ownership, so a
  share cannot be re-pointed at another user's project
- `get_shared_project_data` only returns the project and sessions owned by the
  share's creator, and records at most one view per minute per link
- A trigger on `pomodoro_sessions`, `financial_transactions` and `tasks` rejects a
  `project_id` that belongs to another user
- All grants on the team tables are revoked from `anon` / `authenticated` until the
  team feature ships (its RLS policies must be fixed before re-granting)
- `NOT VALID` length checks on free-text columns, and a cap of 10 unsent
  `timer_notifications` per user
- Idempotent: safe to re-run

**Status:** ✅ Ready — run before `audit_perf_indexes.sql`

### `audit_perf_indexes.sql`
Reduces database load:

- Indexes on `pomodoro_sessions`, `projects` and `financial_transactions` for the
  per-user and per-project queries the app runs on every load
- Drops the four older per-operation RLS policies on each core table where the
  `<table>_user_is_owner` policy already covers them
- Deletes `cron.job_run_details` rows older than 7 days and schedules a daily prune
  (skipped when `pg_cron` is not installed)
- Idempotent: safe to re-run

**Status:** ✅ Ready
