# Database Migrations

SQL migration files for the PomPay database schema.

## Migration Order

For fresh database setup, run in this order:

1. `create_user_settings.sql`
2. `create_goals_and_streaks.sql`
3. `add_rate_and_pomodoros_to_projects.sql`
4. `add_tags_to_sessions.sql`
5. `add_selected_project_to_user_settings.sql`
6. `create_project_sharing.sql`
7. `create_team_collaboration.sql` (optional, for future team features)

## Running Migrations

### Supabase Dashboard
1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to SQL Editor
3. Copy migration file contents
4. Run

### Supabase CLI
```bash
supabase db execute -f database/migrations/<migration-file>.sql
```
