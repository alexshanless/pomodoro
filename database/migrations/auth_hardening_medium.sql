-- auth_hardening_medium.sql
-- Closes the three Medium-severity findings from the 2026-05-01 auth audit:
--
--   M1 — Drop the anon INSERT policy on `project_share_views` and revoke the
--        table-level grant. After share_link_rpc.sql, view recording happens
--        inside `get_shared_project_data` under SECURITY DEFINER privileges,
--        so the anon-INSERT path is both redundant and exploitable
--        (let any anon caller stuff `view_count` for any discoverable share_id
--        via the `increment_view_count_on_insert` trigger).
--
--   M2 — Add DELETE policies on `user_settings`, `user_goals`, `user_streaks`.
--        These tables have SELECT/INSERT/UPDATE but no DELETE, so users cannot
--        clean up their own rows; brings them in line with `projects` /
--        `pomodoro_sessions` / `financial_transactions` (which got DELETE
--        coverage in baseline_core_tables.sql).
--
--   M3 — Add DELETE policy on `team_invitations`. Owners/admins can update an
--        invitation to `expired`/`declined` but cannot hard-delete it; closes
--        the authorization-completeness gap.
--
-- Run order : AFTER `create_project_sharing.sql`, `00_complete_base_schema.sql`,
--             and `create_team_collaboration.sql`
-- Safe to re-run: YES (fully idempotent)


-- ============================================================
-- M1: project_share_views — drop anon INSERT
-- ============================================================

DROP POLICY IF EXISTS "Anonymous users can insert share views"
  ON project_share_views;

REVOKE INSERT ON project_share_views FROM anon;


-- ============================================================
-- M2a: user_settings — add DELETE policy
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings'
      AND policyname = 'Users can delete their own settings'
  ) THEN
    CREATE POLICY "Users can delete their own settings"
      ON user_settings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- M2b: user_goals — add DELETE policy
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals'
      AND policyname = 'Users can delete their own goals'
  ) THEN
    CREATE POLICY "Users can delete their own goals"
      ON user_goals FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- M2c: user_streaks — add DELETE policy
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_streaks'
      AND policyname = 'Users can delete their own streaks'
  ) THEN
    CREATE POLICY "Users can delete their own streaks"
      ON user_streaks FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- M3: team_invitations — add DELETE policy
-- ============================================================
-- Match the existing INSERT policy: the inviter, team owner, or any team
-- member with role 'admin'/'owner' can hard-delete the invitation.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_invitations'
      AND policyname = 'Owners and admins can delete invitations'
  ) THEN
    CREATE POLICY "Owners and admins can delete invitations"
      ON team_invitations FOR DELETE
      USING (
        auth.uid() = invited_by OR
        EXISTS (
          SELECT 1 FROM teams
          WHERE teams.id = team_invitations.team_id
            AND teams.owner_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = team_invitations.team_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;
