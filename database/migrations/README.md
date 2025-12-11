# Database Migrations

This directory contains SQL migration files for the PomPay Pomodoro Timer application.

## How to Run Migrations

### Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Create a new query
5. Copy and paste the contents of the migration file
6. Click **Run** to execute the migration

### Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or execute a specific migration:

```bash
supabase db execute -f database/migrations/<migration-file>.sql
```

## Migration Order

Run migrations in this order for a fresh database setup:

1. **Base schema** (create tables for projects, sessions, transactions)
2. `create_user_settings.sql` - User preferences and settings
3. `create_goals_and_streaks.sql` - Goals and streaks tracking
4. `add_rate_and_pomodoros_to_projects.sql` - Project enhancements
5. `add_tags_to_sessions.sql` - Session tagging system
6. `create_project_sharing.sql` - **NEW** Project sharing and collaboration
7. `create_team_collaboration.sql` - **NEW** Team features (optional)

## Available Migrations

### create_user_settings.sql

**Purpose**: User-specific settings and preferences

**What it does**:
- Creates `user_settings` table
- Stores selected project ID per user
- Implements RLS policies for user isolation
- Adds auto-update trigger for `updated_at`

**Status**: ✅ Production ready

---

### create_goals_and_streaks.sql

**Purpose**: Goals and streak tracking system

**What it does**:
- Creates `user_goals` table (daily/weekly pomodoro goals)
- Creates `user_streaks` table (current/longest streak tracking)
- Implements RLS policies
- Links to auth.users for user isolation

**Status**: ✅ Production ready

---

### add_rate_and_pomodoros_to_projects.sql

**Purpose**: Adds earning tracking to projects

**What it does**:
- Adds `hourly_rate` column (DECIMAL) for storing project hourly rates
- Adds `pomodoros_count` column (INTEGER) for tracking completed pomodoros
- Sets default values to 0 for both columns
- Safe to run multiple times (uses `IF NOT EXISTS`)

**Status**: ✅ Production ready

---

### add_tags_to_sessions.sql

**Purpose**: Session tagging system

**What it does**:
- Adds `tags` column (TEXT[] array) to pomodoro_sessions
- Creates GIN index for efficient tag searches
- Enables filtering sessions by tags
- Supports multiple tags per session

**Status**: ✅ Production ready

---

### create_project_sharing.sql ⭐ NEW

**Purpose**: Enable sharing projects with clients and team members

**What it does**:
- Creates `project_shares` table with secure token-based sharing
- Creates `project_share_views` table for analytics tracking
- Implements RLS policies for secure access control
- Supports expiration dates and access types
- Enables email-specific sharing
- Auto-generates unique share tokens
- Tracks view counts and last access times

**Features**:
- Read-only, comment, and edit access levels
- Optional expiration dates (7/30/90 days or never)
- Email restrictions for specific sharing
- Anonymous view tracking for analytics
- Public access via share tokens (no login required)

**Status**: ✅ Production ready

**Documentation**: See `COLLABORATION_FEATURES.md` for full details

---

### create_team_collaboration.sql ⭐ NEW

**Purpose**: Team collaboration infrastructure

**What it does**:
- Creates `teams` table for team management
- Creates `team_members` table with roles (owner/admin/member)
- Creates `team_sessions` table for collaborative pomodoro sessions
- Creates `team_session_participants` table for tracking participation
- Creates `team_invitations` table for invitation workflow
- Implements comprehensive RLS policies
- Auto-generates invitation tokens

**Features**:
- Team ownership and role management
- Synchronized team pomodoro sessions
- Invitation system with expiration
- Participation tracking
- Future: Real-time collaboration

**Status**: ✅ Ready for future features

**Documentation**: See `COLLABORATION_FEATURES.md` for implementation guide

---

## Verifying Migrations

After running migrations, verify they were successful:

### Check User Settings

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_settings';
```

### Check Project Sharing

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('project_shares', 'project_share_views');
```

### Check Team Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'team%'
  AND table_schema = 'public';
```

### Check RLS Policies

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('project_shares', 'teams', 'team_members');
```

## Rollback Instructions

### Rollback Project Sharing

```sql
DROP TABLE IF EXISTS project_share_views CASCADE;
DROP TABLE IF EXISTS project_shares CASCADE;
DROP FUNCTION IF EXISTS generate_share_token();
DROP FUNCTION IF EXISTS increment_share_view_count();
```

**⚠️ Warning**: This will delete all share links and analytics data.

### Rollback Team Collaboration

```sql
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS team_session_participants CASCADE;
DROP TABLE IF EXISTS team_sessions CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP FUNCTION IF EXISTS generate_invitation_token();
```

**⚠️ Warning**: This will delete all team data.

### Rollback Goals and Streaks

```sql
DROP TABLE IF EXISTS user_streaks CASCADE;
DROP TABLE IF EXISTS user_goals CASCADE;
```

### Rollback User Settings

```sql
DROP TABLE IF EXISTS user_settings CASCADE;
```

## Troubleshooting

### Error: Relation already exists

**Solution**: The migration is safe to run multiple times. This warning means the table already exists.

### Error: Permission denied

**Solution**: Ensure you're using the Supabase service role key or running as a superuser.

### Error: Function does not exist

**Solution**: Run the migration that creates the function first (e.g., `generate_share_token()`).

### Error: RLS policy conflict

**Solution**: Drop existing policies before re-running:

```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

## Best Practices

1. **Backup First**: Always backup your database before running migrations
2. **Test in Development**: Test migrations in a development environment first
3. **Run in Order**: Execute migrations in the order specified above
4. **Verify Changes**: Run verification queries after each migration
5. **Document Changes**: Update this README when adding new migrations

## Need Help?

- Check the main `README.md` for setup instructions
- Review `COLLABORATION_FEATURES.md` for collaboration feature details
- Check Supabase logs for detailed error messages
- Verify your RLS policies are configured correctly

---

**Last Updated**: 2025-12-11
