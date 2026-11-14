-- audit_security_hardening.sql
-- Security fixes from the audit, ahead of opening signup:
--
--   1. project_shares UPDATE policy gains a WITH CHECK. Without it, a signed-in
--      user could repoint their own share row at ANOTHER user's project_id and
--      then read that project through the SECURITY DEFINER share RPC.
--   2. get_shared_project_data now ties the project and its sessions to the
--      share's owner (defense in depth for #1), and throttles view recording
--      to one row per link per minute.
--   3. Cross-owner project guard: pomodoro_sessions, financial_transactions and
--      tasks can no longer reference a project owned by a different user.
--   4. Dormant team tables: all anon/authenticated grants revoked until the
--      feature ships with corrected policies.
--   5. Length limits (NOT VALID CHECK constraints) on user-supplied text so
--      open signup cannot be used to store unbounded payloads.
--   6. Cap of 10 unsent timer_notifications per user.
--
-- Run order : AFTER baseline_core_tables.sql, 00_complete_base_schema.sql,
--             create_project_sharing.sql, share_link_rpc.sql,
--             auth_hardening_medium.sql, auth_hardening_low.sql,
--             add_push_notifications.sql, add_recurring_transactions.sql,
--             create_tasks.sql and (optional) create_team_collaboration.sql
-- Safe to re-run: YES (fully idempotent)


-- ============================================================
-- 1. project_shares — UPDATE policy with WITH CHECK
-- ============================================================
-- Same USING as before; the WITH CHECK mirrors the INSERT policy
-- "Users can create shares for own projects" so the post-update row must
-- still belong to the caller AND point at a project the caller owns.

DROP POLICY IF EXISTS "Users can update own project shares" ON project_shares;

CREATE POLICY "Users can update own project shares"
  ON project_shares FOR UPDATE
  USING (auth.uid() = shared_by_user_id)
  WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ============================================================
-- 2. RPC: get_shared_project_data — owner binding + view throttle
-- ============================================================
-- Changes from share_link_rpc.sql (everything else is identical):
--   a. The project must be owned by the share's creator
--      (p.user_id = v_share.shared_by_user_id); otherwise INVALID_OR_EXPIRED.
--   b. Sessions are limited to the share creator's own rows.
--   c. A project_share_views row is recorded only when none exists for this
--      share in the last 60 seconds. view_count therefore means
--      "at most one view per minute per link", not raw page loads.

CREATE INDEX IF NOT EXISTS project_share_views_share_viewed_idx
  ON project_share_views (share_id, viewed_at DESC);

CREATE OR REPLACE FUNCTION public.get_shared_project_data(
  p_token      TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share        project_shares%ROWTYPE;
  v_caller_email TEXT;
  v_project      JSONB;
  v_result       JSONB;
BEGIN
  -- 1. Look up the share by token, restricted to active + not-expired.
  SELECT *
    INTO v_share
    FROM project_shares
   WHERE share_token = p_token
     AND is_active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_OR_EXPIRED';
  END IF;

  -- 2. If the share is email-restricted, require auth + matching email.
  IF v_share.shared_with_email IS NOT NULL THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    SELECT email
      INTO v_caller_email
      FROM auth.users
     WHERE id = auth.uid();

    IF v_caller_email IS NULL
       OR lower(v_caller_email) <> lower(v_share.shared_with_email) THEN
      RAISE EXCEPTION 'EMAIL_MISMATCH';
    END IF;
  END IF;

  -- 3. The project must belong to the user who created the share. A share
  --    pointing at someone else's project is treated as an invalid link.
  SELECT jsonb_build_object(
           'id',          p.id,
           'name',        p.name,
           'description', p.description,
           'color',       p.color,
           'hourly_rate', p.hourly_rate,
           'created_at',  p.created_at
         )
    INTO v_project
    FROM projects p
   WHERE p.id = v_share.project_id
     AND p.user_id = v_share.shared_by_user_id;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'INVALID_OR_EXPIRED';
  END IF;

  -- 4. Build the curated projection. `user_id` is intentionally omitted from
  --    every row so the response cannot be used to enumerate accounts.
  SELECT jsonb_build_object(
    'project', v_project,
    'sessions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',               s.id,
          'started_at',       s.started_at,
          'duration_minutes', s.duration_minutes,
          'description',      s.description,
          'tags',             s.tags
        )
        ORDER BY s.started_at DESC
      )
      FROM (
        SELECT id, started_at, duration_minutes, description, tags
          FROM pomodoro_sessions
         WHERE project_id = v_share.project_id
           AND user_id = v_share.shared_by_user_id
           AND mode = 'focus'
         ORDER BY started_at DESC
         LIMIT 50
      ) s
    ), '[]'::jsonb),
    'share_info', jsonb_build_object(
      'id',                v_share.id,
      'label',             v_share.label,
      'access_type',       v_share.access_type,
      'expires_at',        v_share.expires_at,
      'shared_with_email', v_share.shared_with_email
    )
  )
  INTO v_result;

  -- 5. Record the view, at most once per minute per link. The
  --    increment_share_view_count trigger bumps view_count + last_accessed_at.
  --    The per-share advisory lock makes check-then-insert atomic: concurrent
  --    requests cannot all see "no recent view" and each insert a row. A
  --    request that fails to get the lock skips recording, because the holder
  --    is recording (or has found) a view inside the same minute. The lock is
  --    released when this transaction ends.
  IF pg_try_advisory_xact_lock(
       hashtextextended('project_share_view:' || v_share.id::text, 0)
     ) THEN
    INSERT INTO project_share_views (share_id, viewer_user_agent)
    SELECT v_share.id, left(p_user_agent, 512)
     WHERE NOT EXISTS (
       SELECT 1
         FROM project_share_views v
        WHERE v.share_id = v_share.id
          AND v.viewed_at > clock_timestamp() - INTERVAL '60 seconds'
     );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL    ON FUNCTION public.get_shared_project_data(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_project_data(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.get_shared_project_data(TEXT, TEXT) IS
  'Returns curated project + sessions for a valid share token. '
  'Enforces active/expiry/email-allowlist and share-owner binding server-side. '
  'Records at most one view per minute per link. '
  'Sentinels: INVALID_OR_EXPIRED, AUTH_REQUIRED, EMAIL_MISMATCH.';


-- ============================================================
-- 3. Cross-owner project reference guard
-- ============================================================
-- RLS only checks that user_id = auth.uid(); it never checked that project_id
-- belongs to that same user. This trigger closes that gap on every write path,
-- including the service role (triggers are not bypassed by BYPASSRLS).
--
-- NULL project_id always passes, so the FK `ON DELETE SET NULL` path (deleting
-- a project nulls project_id on its sessions/transactions/tasks via an UPDATE
-- that fires this trigger) keeps working.
--
-- SECURITY DEFINER so the projects lookup is not filtered by the caller's RLS.
-- A NULL user_id with a non-NULL project_id fails the check (no project has a
-- NULL owner that could match), which is intended.

CREATE OR REPLACE FUNCTION public.enforce_project_owner_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM projects
     WHERE id = NEW.project_id
       AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'PROJECT_OWNER_MISMATCH'
      USING ERRCODE = '42501',
            DETAIL  = format('%s.project_id must reference a project owned by the same user_id', TG_TABLE_NAME);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger functions fire without EXECUTE grants; remove direct-call surface.
REVOKE EXECUTE ON FUNCTION public.enforce_project_owner_match() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pomodoro_sessions_project_owner_check ON pomodoro_sessions;
CREATE TRIGGER pomodoro_sessions_project_owner_check
  BEFORE INSERT OR UPDATE OF project_id, user_id ON pomodoro_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_project_owner_match();

DROP TRIGGER IF EXISTS financial_transactions_project_owner_check ON financial_transactions;
CREATE TRIGGER financial_transactions_project_owner_check
  BEFORE INSERT OR UPDATE OF project_id, user_id ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_project_owner_match();

-- Guarded so the file still runs if create_tasks.sql has not been applied yet.
DO $$ BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS tasks_project_owner_check ON public.tasks;
    CREATE TRIGGER tasks_project_owner_check
      BEFORE INSERT OR UPDATE OF project_id, user_id ON public.tasks
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_project_owner_match();
  END IF;
END $$;


-- ============================================================
-- 4. Dormant team tables — revoke client access
-- ============================================================
-- The team feature has no UI, and its RLS is wrong: a member can update their
-- own team_members row to role 'owner' or to another team_id, and the
-- team_members SELECT policy is self-referencing. Until the feature ships,
-- anon and authenticated get no access at all.
--
-- Re-enabling requires FIXING THOSE POLICIES FIRST, not just re-granting.
--
-- Each table is guarded because create_team_collaboration.sql is optional.

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'teams',
    'team_members',
    'team_sessions',
    'team_session_participants',
    'team_invitations'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v_table);
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- 5. Length limits for open signup
-- ============================================================
-- Added NOT VALID: existing rows are not scanned (so legacy data cannot block
-- this migration), but every INSERT and UPDATE is checked from now on. Note a
-- CHECK evaluates the whole new row, so updating ANY column of a legacy row
-- that already violates a limit will fail until that value is shortened.
-- Once the "find violators" queries below return nothing, the owner can run
-- ALTER TABLE ... VALIDATE CONSTRAINT ... to mark them fully valid.
--
-- Limits sit well above every client-side limit (validation.js: project name
-- 100, description 500, tag 30, email 254; TagInput: 10 tags; generated share
-- tokens are 32 chars; push title/body/tag are short constants).
-- A CHECK passes on NULL, so nullable columns stay nullable.

DO $$ BEGIN
  -- projects
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'projects_name_len_check'
                    AND conrelid = 'public.projects'::regclass) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_name_len_check
      CHECK (char_length(name) <= 200) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'projects_description_len_check'
                    AND conrelid = 'public.projects'::regclass) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_description_len_check
      CHECK (char_length(description) <= 2000) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'projects_color_len_check'
                    AND conrelid = 'public.projects'::regclass) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_color_len_check
      CHECK (char_length(color) <= 32) NOT VALID;
  END IF;

  -- pomodoro_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pomodoro_sessions_description_len_check'
                    AND conrelid = 'public.pomodoro_sessions'::regclass) THEN
    ALTER TABLE public.pomodoro_sessions
      ADD CONSTRAINT pomodoro_sessions_description_len_check
      CHECK (char_length(description) <= 2000) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'pomodoro_sessions_tags_len_check'
                    AND conrelid = 'public.pomodoro_sessions'::regclass) THEN
    ALTER TABLE public.pomodoro_sessions
      ADD CONSTRAINT pomodoro_sessions_tags_len_check
      CHECK (cardinality(tags) <= 20) NOT VALID;
  END IF;

  -- financial_transactions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'financial_transactions_description_len_check'
                    AND conrelid = 'public.financial_transactions'::regclass) THEN
    ALTER TABLE public.financial_transactions
      ADD CONSTRAINT financial_transactions_description_len_check
      CHECK (char_length(description) <= 1000) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'financial_transactions_category_len_check'
                    AND conrelid = 'public.financial_transactions'::regclass) THEN
    ALTER TABLE public.financial_transactions
      ADD CONSTRAINT financial_transactions_category_len_check
      CHECK (char_length(category) <= 100) NOT VALID;
  END IF;

  -- project_shares
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'project_shares_label_len_check'
                    AND conrelid = 'public.project_shares'::regclass) THEN
    ALTER TABLE public.project_shares
      ADD CONSTRAINT project_shares_label_len_check
      CHECK (char_length(label) <= 200) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'project_shares_shared_with_email_len_check'
                    AND conrelid = 'public.project_shares'::regclass) THEN
    ALTER TABLE public.project_shares
      ADD CONSTRAINT project_shares_shared_with_email_len_check
      CHECK (char_length(shared_with_email) <= 254) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'project_shares_share_token_len_check'
                    AND conrelid = 'public.project_shares'::regclass) THEN
    ALTER TABLE public.project_shares
      ADD CONSTRAINT project_shares_share_token_len_check
      CHECK (char_length(share_token) BETWEEN 20 AND 128) NOT VALID;
  END IF;
END $$;

-- Push tables are guarded in case add_push_notifications.sql was never applied.
DO $$ BEGIN
  IF to_regclass('public.timer_notifications') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'timer_notifications_title_len_check'
                      AND conrelid = to_regclass('public.timer_notifications')) THEN
      ALTER TABLE public.timer_notifications
        ADD CONSTRAINT timer_notifications_title_len_check
        CHECK (char_length(title) <= 200) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'timer_notifications_body_len_check'
                      AND conrelid = to_regclass('public.timer_notifications')) THEN
      ALTER TABLE public.timer_notifications
        ADD CONSTRAINT timer_notifications_body_len_check
        CHECK (char_length(body) <= 500) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'timer_notifications_tag_len_check'
                      AND conrelid = to_regclass('public.timer_notifications')) THEN
      ALTER TABLE public.timer_notifications
        ADD CONSTRAINT timer_notifications_tag_len_check
        CHECK (char_length(tag) <= 100) NOT VALID;
    END IF;
  END IF;

  IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'push_subscriptions_endpoint_len_check'
                      AND conrelid = to_regclass('public.push_subscriptions')) THEN
      ALTER TABLE public.push_subscriptions
        ADD CONSTRAINT push_subscriptions_endpoint_len_check
        CHECK (char_length(endpoint) <= 2048) NOT VALID;
    END IF;
  END IF;
END $$;


-- ============================================================
-- 6. Cap queued timer notifications
-- ============================================================
-- Rejects any write that would make a row pending (sent_at NULL) when the user
-- already has 10+ pending rows. That covers INSERTs and also UPDATEs that
-- clear sent_at, since RLS lets users update their own rows and the cap could
-- otherwise be bypassed by inserting pre-"sent" rows and clearing them. The
-- client deletes its unsent rows before inserting a new one, so normal use
-- holds at most one; the cap only stops a scripted client from flooding the
-- queue the edge function polls every minute.
--
-- SECURITY DEFINER so the count is not narrowed by the caller's RLS. The
-- inner LIMIT bounds the scan at 10 rows.

CREATE OR REPLACE FUNCTION public.enforce_timer_notification_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only a row that is BECOMING pending counts against the cap: an insert
  -- with sent_at NULL, or an update that clears sent_at or moves a pending
  -- row to another user. Marking rows sent (the edge function) is never
  -- blocked.
  IF NEW.sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.sent_at IS NULL AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Serialize per user so concurrent writers cannot each pass the count.
  -- Under READ COMMITTED the count below runs after the lock is granted and
  -- so sees rows committed by the previous holder.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('timer_notification_cap:' || NEW.user_id::text, 0)
  );

  IF (
    SELECT count(*)
      FROM (
        SELECT 1
          FROM timer_notifications
         WHERE user_id = NEW.user_id
           AND sent_at IS NULL
           AND id IS DISTINCT FROM NEW.id
         LIMIT 10
      ) pending
  ) >= 10 THEN
    RAISE EXCEPTION 'TIMER_NOTIFICATION_LIMIT'
      USING ERRCODE = '54000',
            DETAIL  = 'At most 10 unsent timer notifications per user';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_timer_notification_cap() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF to_regclass('public.timer_notifications') IS NOT NULL THEN
    -- Serves the cap check above and the client's per-user unsent delete.
    CREATE INDEX IF NOT EXISTS timer_notifications_user_unsent_idx
      ON public.timer_notifications (user_id)
      WHERE sent_at IS NULL;

    DROP TRIGGER IF EXISTS timer_notifications_cap_check ON public.timer_notifications;
    CREATE TRIGGER timer_notifications_cap_check
      BEFORE INSERT OR UPDATE OF sent_at, user_id ON public.timer_notifications
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_timer_notification_cap();
  END IF;
END $$;


-- ============================================================
-- Verification (read-only)
-- ============================================================
-- 1. UPDATE policy now has a WITH CHECK:
-- SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'project_shares'
--    AND policyname = 'Users can update own project shares';
--
-- 2. RPC body contains the owner binding and throttle, index exists:
-- SELECT prosrc LIKE '%p.user_id = v_share.shared_by_user_id%' AS owner_bound,
--        prosrc LIKE '%INTERVAL ''60 seconds''%'               AS throttled
--   FROM pg_proc WHERE proname = 'get_shared_project_data';
-- SELECT indexname FROM pg_indexes
--  WHERE indexname = 'project_share_views_share_viewed_idx';
--
-- 3 & 6. Triggers:
-- SELECT tgrelid::regclass AS table_name, tgname, tgenabled
--   FROM pg_trigger
--  WHERE tgname IN ('pomodoro_sessions_project_owner_check',
--                   'financial_transactions_project_owner_check',
--                   'tasks_project_owner_check',
--                   'timer_notifications_cap_check');
--
-- 4. No client grants left on team tables (expect zero rows):
-- SELECT table_name, grantee, privilege_type
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public'
--    AND table_name IN ('teams', 'team_members', 'team_sessions',
--                       'team_session_participants', 'team_invitations')
--    AND grantee IN ('anon', 'authenticated');
--
-- 5. Length constraints (convalidated = false until VALIDATE CONSTRAINT runs):
-- SELECT conrelid::regclass AS table_name, conname, convalidated,
--        pg_get_constraintdef(oid) AS definition
--   FROM pg_constraint
--  WHERE conname LIKE '%\_len\_check'
--  ORDER BY 1, 2;
--
-- Existing rows that would block VALIDATE CONSTRAINT / legacy-row updates:
-- SELECT 'projects' AS t, id FROM projects
--  WHERE char_length(name) > 200 OR char_length(description) > 2000
--     OR char_length(color) > 32
-- UNION ALL
-- SELECT 'pomodoro_sessions', id FROM pomodoro_sessions
--  WHERE char_length(description) > 2000 OR cardinality(tags) > 20
-- UNION ALL
-- SELECT 'financial_transactions', id FROM financial_transactions
--  WHERE char_length(description) > 1000 OR char_length(category) > 100
-- UNION ALL
-- SELECT 'project_shares', id FROM project_shares
--  WHERE char_length(label) > 200 OR char_length(shared_with_email) > 254
--     OR char_length(share_token) NOT BETWEEN 20 AND 128;
--
-- Existing cross-owner references that section 3 now blocks on edit:
-- SELECT 'pomodoro_sessions' AS t, s.id FROM pomodoro_sessions s
--   JOIN projects p ON p.id = s.project_id
--  WHERE p.user_id IS DISTINCT FROM s.user_id
-- UNION ALL
-- SELECT 'financial_transactions', f.id FROM financial_transactions f
--   JOIN projects p ON p.id = f.project_id
--  WHERE p.user_id IS DISTINCT FROM f.user_id
-- UNION ALL
-- SELECT 'tasks', t.id FROM tasks t
--   JOIN projects p ON p.id = t.project_id
--  WHERE p.user_id IS DISTINCT FROM t.user_id;
