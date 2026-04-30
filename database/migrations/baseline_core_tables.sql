-- baseline_core_tables.sql
-- Documents and recreates the three primary tables in PomPay:
--   projects, pomodoro_sessions, financial_transactions
--
-- These tables existed in production before source-control began.
-- This migration captures their full schema, RLS posture, and policies
-- so a fresh environment can reproduce the production state exactly.
--
-- Run order : FIRST (before 00_complete_base_schema.sql)
-- Safe to re-run: YES (fully idempotent)
-- Schema source: production information_schema + pg_policies query 2026-04-30


-- ============================================================
-- TABLE: projects
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  description        TEXT,
  color              TEXT,
  total_time_minutes INTEGER     DEFAULT 0,
  balance            NUMERIC     DEFAULT 0,
  is_archived        BOOLEAN     DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  project_number     INTEGER,
  hourly_rate        NUMERIC     DEFAULT 0.00,
  pomodoros_count    INTEGER     DEFAULT 0
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'projects_user_is_owner'
  ) THEN
    CREATE POLICY "projects_user_is_owner" ON projects
      FOR ALL
      USING  (user_id = (SELECT auth.uid() AS uid))
      WITH CHECK (user_id = (SELECT auth.uid() AS uid));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Users can view their own projects'
  ) THEN
    CREATE POLICY "Users can view their own projects" ON projects
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Users can insert their own projects'
  ) THEN
    CREATE POLICY "Users can insert their own projects" ON projects
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Users can update their own projects'
  ) THEN
    CREATE POLICY "Users can update their own projects" ON projects
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Users can delete their own projects'
  ) THEN
    CREATE POLICY "Users can delete their own projects" ON projects
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- TABLE: pomodoro_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id       UUID        REFERENCES projects(id) ON DELETE SET NULL,
  mode             TEXT        NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER     NOT NULL,
  was_successful   BOOLEAN     NOT NULL DEFAULT true,
  description      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  tags             TEXT[]      DEFAULT ARRAY[]::text[]
);

ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions'
      AND policyname = 'pomodoro_sessions_user_is_owner'
  ) THEN
    CREATE POLICY "pomodoro_sessions_user_is_owner" ON pomodoro_sessions
      FOR ALL
      USING  (user_id = (SELECT auth.uid() AS uid))
      WITH CHECK (user_id = (SELECT auth.uid() AS uid));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions'
      AND policyname = 'Users can view their own sessions'
  ) THEN
    CREATE POLICY "Users can view their own sessions" ON pomodoro_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions'
      AND policyname = 'Users can insert their own sessions'
  ) THEN
    CREATE POLICY "Users can insert their own sessions" ON pomodoro_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions'
      AND policyname = 'Users can update their own sessions'
  ) THEN
    CREATE POLICY "Users can update their own sessions" ON pomodoro_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pomodoro_sessions'
      AND policyname = 'Users can delete their own sessions'
  ) THEN
    CREATE POLICY "Users can delete their own sessions" ON pomodoro_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- TABLE: financial_transactions
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
  amount      NUMERIC     NOT NULL,
  currency    TEXT        NOT NULL DEFAULT 'USD',
  type        TEXT        NOT NULL,
  category    TEXT,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_transactions'
      AND policyname = 'financial_transactions_user_is_owner'
  ) THEN
    CREATE POLICY "financial_transactions_user_is_owner" ON financial_transactions
      FOR ALL
      USING  (user_id = (SELECT auth.uid() AS uid))
      WITH CHECK (user_id = (SELECT auth.uid() AS uid));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_transactions'
      AND policyname = 'Users can view their own transactions'
  ) THEN
    CREATE POLICY "Users can view their own transactions" ON financial_transactions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_transactions'
      AND policyname = 'Users can insert their own transactions'
  ) THEN
    CREATE POLICY "Users can insert their own transactions" ON financial_transactions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_transactions'
      AND policyname = 'Users can update their own transactions'
  ) THEN
    CREATE POLICY "Users can update their own transactions" ON financial_transactions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_transactions'
      AND policyname = 'Users can delete their own transactions'
  ) THEN
    CREATE POLICY "Users can delete their own transactions" ON financial_transactions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
