-- add_push_notifications.sql
-- Web Push timer notifications: lets a Pomodoro completion notify the user
-- even when the app tab is closed.
--
-- Two tables:
--   push_subscriptions   — one row per browser PushSubscription per user
--   timer_notifications  — one row per running timer, fired by an edge function
--
-- The edge function `send-timer-notifications` (invoked every minute by pg_cron)
-- reads due `timer_notifications` rows with the service role key and delivers a
-- Web Push to the matching `push_subscriptions`.
--
-- Run order : any time after baseline_core_tables.sql
-- Safe to re-run: YES (fully idempotent)


-- ============================================================
-- TABLE: push_subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT        NOT NULL UNIQUE,
  subscription JSONB       NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
      AND policyname = 'Users can view their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
      AND policyname = 'Users can insert their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can insert their own push subscriptions" ON push_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
      AND policyname = 'Users can update their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can update their own push subscriptions" ON push_subscriptions
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
      AND policyname = 'Users can delete their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- TABLE: timer_notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS timer_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fire_at    TIMESTAMPTZ NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  tag        TEXT        NOT NULL DEFAULT 'pomodoro-complete',
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial index: the edge function polls for unsent, due rows every minute.
CREATE INDEX IF NOT EXISTS timer_notifications_fire_at_unsent_idx
  ON timer_notifications (fire_at)
  WHERE sent_at IS NULL;

ALTER TABLE timer_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timer_notifications'
      AND policyname = 'Users can view their own timer notifications'
  ) THEN
    CREATE POLICY "Users can view their own timer notifications" ON timer_notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timer_notifications'
      AND policyname = 'Users can insert their own timer notifications'
  ) THEN
    CREATE POLICY "Users can insert their own timer notifications" ON timer_notifications
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timer_notifications'
      AND policyname = 'Users can update their own timer notifications'
  ) THEN
    CREATE POLICY "Users can update their own timer notifications" ON timer_notifications
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timer_notifications'
      AND policyname = 'Users can delete their own timer notifications'
  ) THEN
    CREATE POLICY "Users can delete their own timer notifications" ON timer_notifications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- NOTES
-- ============================================================
-- The edge function connects with the service role key, which bypasses RLS,
-- so it can read every user's due rows and their subscriptions. RLS above
-- exists to isolate the *client* paths (subscribe / schedule / cancel) — each
-- user only ever sees and mutates their own rows.
--
-- Scheduling the edge function (pg_cron + pg_net) is done separately from the
-- SQL editor; see docs/push-notifications-setup.md.
