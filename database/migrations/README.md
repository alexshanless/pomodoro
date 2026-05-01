# Database Migrations

SQL migration files for the PomPay database schema.

## Quick Start (Fresh Database)

For a fresh database setup, run migrations in this order:

1. **`baseline_core_tables.sql`** - Core tables (projects, pomodoro_sessions, financial_transactions) with RLS — run this first
2. **`00_complete_base_schema.sql`** - All base features (settings, goals, streaks, tags, rates)
3. **`create_project_sharing.sql`** - Project sharing with clients (read-only links)
4. **`share_link_rpc.sql`** - `get_shared_project_data` RPC + tightens `access_type` to `read-only`
5. **`create_team_collaboration.sql`** - Team collaboration features (optional)
6. **`auth_hardening_medium.sql`** - Closes Medium-severity audit findings: drops redundant anon INSERT on `project_share_views`, adds DELETE policies on `user_settings`/`user_goals`/`user_streaks`/`team_invitations`
7. **`auth_hardening_low.sql`** - Closes Low-severity audit finding #5: revokes redundant anon SELECT grants on `project_shares` and `project_share_views` (defense-in-depth)

## Running Migrations

### Supabase Dashboard
1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to SQL Editor
3. Copy migration file contents
4. Run

### Supabase CLI
```bash
supabase db execute -f database/migrations/baseline_core_tables.sql
supabase db execute -f database/migrations/00_complete_base_schema.sql
supabase db execute -f database/migrations/create_project_sharing.sql
supabase db execute -f database/migrations/share_link_rpc.sql
supabase db execute -f database/migrations/create_team_collaboration.sql
supabase db execute -f database/migrations/auth_hardening_medium.sql
supabase db execute -f database/migrations/auth_hardening_low.sql
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

**Status:** ✅ Ready for future features
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
