-- auth_hardening_low.sql
-- Closes Low-severity finding #5 from the 2026-05-01 auth audit:
-- redundant anon SELECT grants on `project_shares` and `project_share_views`.
--
-- Background:
--   Before share_link_rpc.sql, the public share-link page queried
--   `project_shares` directly with the anon key to validate tokens. After the
--   RPC refactor, validation runs inside `get_shared_project_data`
--   (SECURITY DEFINER) and the anon role no longer needs direct table access.
--
--   RLS already prevents anon from reading any rows on either table
--   (the SELECT policies require the caller to be the share owner), so this
--   migration is purely defense-in-depth — it removes dead surface area so a
--   future RLS misconfiguration cannot expose the tables by accident.
--
-- Verified safe before applying (no caller affected):
--   • All `from('project_shares')` queries in `useProjectShares.js` run as
--     the authenticated owner (gated by `if (!user) return`). They use the
--     `authenticated` role's grants, not anon's.
--   • The public share view (`useSharedProject`) calls only the RPC; it never
--     reads `project_shares` or `project_share_views` directly.
--   • The owner-side `getShareAnalytics` query on `project_share_views` also
--     runs as the authenticated owner (covered by the existing
--     "Share owners can view their share views" SELECT policy).
--   • The RPC's INSERT into `project_share_views` runs as SECURITY DEFINER,
--     bypassing both RLS and table-level grants.
--
-- Run order : AFTER `share_link_rpc.sql` and `auth_hardening_medium.sql`
-- Safe to re-run: YES (REVOKE on a missing grant is a no-op)


REVOKE SELECT ON project_shares      FROM anon;
REVOKE SELECT ON project_share_views FROM anon;
