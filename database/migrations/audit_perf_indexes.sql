-- audit_perf_indexes.sql
-- Performance fixes from the audit:
--   A. Composite/foreign-key indexes for the hot read paths
--      (sessions, projects, financial_transactions).
--   B. Drops the older per-operation RLS policies that duplicate the single
--      "<table>_user_is_owner" FOR ALL policy (which uses (SELECT auth.uid()))
--      so Postgres no longer evaluates two policies per row.
--   C. Prunes pg_cron run history (the notification job runs every minute and
--      pg_cron never deletes cron.job_run_details rows) and schedules a daily
--      prune job. Skipped automatically when pg_cron is not installed.
--
-- Run order : after audit_security_hardening.sql
-- Safe to re-run: YES (fully idempotent)


-- ============================================================
-- A. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS pomodoro_sessions_user_started_idx
  ON pomodoro_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS pomodoro_sessions_project_started_idx
  ON pomodoro_sessions (project_id, started_at DESC);

CREATE INDEX IF NOT EXISTS projects_user_id_idx
  ON projects (user_id);

CREATE INDEX IF NOT EXISTS financial_transactions_user_occurred_idx
  ON financial_transactions (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS financial_transactions_project_id_idx
  ON financial_transactions (project_id);


-- ============================================================
-- B. DUPLICATE RLS POLICIES
-- Only drop the older per-operation policies when the
-- "<table>_user_is_owner" policy exists, so access is never left uncovered.
-- ============================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'projects_user_is_owner'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own projects"   ON projects;
    DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
    DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
    DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
  ELSE
    RAISE NOTICE 'projects_user_is_owner not found; leaving older projects policies in place';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions'
      AND policyname = 'pomodoro_sessions_user_is_owner'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own sessions"   ON pomodoro_sessions;
    DROP POLICY IF EXISTS "Users can insert their own sessions" ON pomodoro_sessions;
    DROP POLICY IF EXISTS "Users can update their own sessions" ON pomodoro_sessions;
    DROP POLICY IF EXISTS "Users can delete their own sessions" ON pomodoro_sessions;
  ELSE
    RAISE NOTICE 'pomodoro_sessions_user_is_owner not found; leaving older pomodoro_sessions policies in place';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_transactions'
      AND policyname = 'financial_transactions_user_is_owner'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own transactions"   ON financial_transactions;
    DROP POLICY IF EXISTS "Users can insert their own transactions" ON financial_transactions;
    DROP POLICY IF EXISTS "Users can update their own transactions" ON financial_transactions;
    DROP POLICY IF EXISTS "Users can delete their own transactions" ON financial_transactions;
  ELSE
    RAISE NOTICE 'financial_transactions_user_is_owner not found; leaving older financial_transactions policies in place';
  END IF;
END $$;


-- ============================================================
-- C. PG_CRON HISTORY PRUNING
-- Every statement touching the cron schema runs through EXECUTE so this file
-- still parses and runs where pg_cron is absent.
-- ============================================================

DO $$
DECLARE
  existing_job RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE $q$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days' $q$;

    FOR existing_job IN
      EXECUTE $q$ SELECT jobid FROM cron.job WHERE jobname = 'prune-cron-history' $q$
    LOOP
      EXECUTE format('SELECT cron.unschedule(%s)', existing_job.jobid);
    END LOOP;

    EXECUTE $q$
      SELECT cron.schedule(
        'prune-cron-history',
        '17 3 * * *',
        'delete from cron.job_run_details where end_time < now() - interval ''7 days'''
      )
    $q$;
  ELSE
    RAISE NOTICE 'pg_cron is not installed; skipping cron history pruning';
  END IF;
END $$;


-- ============================================================
-- VERIFICATION (read-only; uncomment to run)
-- ============================================================

-- SELECT indexname, tablename, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'pomodoro_sessions_user_started_idx',
--     'pomodoro_sessions_project_started_idx',
--     'projects_user_id_idx',
--     'financial_transactions_user_occurred_idx',
--     'financial_transactions_project_id_idx'
--   );
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('projects', 'pomodoro_sessions', 'financial_transactions')
-- ORDER BY tablename, policyname;
--
-- SELECT jobid, jobname, schedule, command FROM cron.job;
