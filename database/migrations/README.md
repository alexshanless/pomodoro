# Database Migrations

SQL migration files for the PomPay database schema.

## Quick Start (Fresh Database)

For a fresh database setup, run migrations in this order:

1. **`baseline_core_tables.sql`** - Core tables (projects, pomodoro_sessions, financial_transactions) with RLS — run this first
2. **`00_complete_base_schema.sql`** - All base features (settings, goals, streaks, tags, rates)
3. **`create_project_sharing.sql`** - Project sharing with clients (read-only links)
4. **`share_link_rpc.sql`** - `get_shared_project_data` RPC + tightens `access_type` to `read-only`
5. **`create_team_collaboration.sql`** - Team collaboration features (optional)

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
