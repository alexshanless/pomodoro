# Current Feature: Commit Baseline Migrations for Core Tables

## Status

In Progress

## Goals

- Add a new SQL migration under `database/migrations/` that contains explicit `CREATE TABLE IF NOT EXISTS` statements for `projects`, `pomodoro_sessions`, and `financial_transactions` matching the schema currently running in production
- Enable Row Level Security on each of the three tables
- Add per-action RLS policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) that filter by `auth.uid() = user_id`, with `WITH CHECK` on `INSERT`/`UPDATE`
- Ensure foreign keys reference `auth.users(id) ON DELETE CASCADE` so account deletion cascades correctly
- Make the migration idempotent (safe to re-run on environments where the tables already exist) — use `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and skip-if-policy-exists guards
- Update `database/migrations/README.md` to document the new migration in the run order
- Verify the migration applies cleanly on a fresh local Supabase instance and on the existing dev project

## Notes

- **Why this is critical (Critical finding #3 in the audit):** The app reads/writes these three tables, but no `CREATE TABLE` exists in source control — only `ALTER TABLE` blocks in `00_complete_base_schema.sql:119-154`. Their RLS posture is unverifiable from this repo. A fresh environment cannot reproduce production schema.
- **Source of truth for the schema:** Pull current column definitions from the live Supabase project's SQL editor (`pg_dump` of just these tables, or query `information_schema.columns`). Don't guess from how the hooks use them.
- **Source of truth for existing policies:** Query `pg_policies` for these three tables in the live project and replicate them in the migration. Compare against the policies the audit recommends and reconcile any gaps before committing.
- **Audit reference:** [docs/audit-results/AUTH_SECURITY_REVIEW.md](docs/audit-results/AUTH_SECURITY_REVIEW.md) — finding "projects, pomodoro_sessions, and financial_transactions tables have no RLS in source control" (Critical).
- **Out of scope:** The share-link RPC refactor (audit findings #1, #2, #4) — separate feature, lands after this one so it builds on a documented schema.
- **Per project convention:** Never use `db push` or edit schema in the Supabase dashboard. New SQL file in `database/migrations/`, applied via the SQL editor in dev → prod order.

## History (One liner)
