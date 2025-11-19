# Database Migrations

This directory contains SQL migration files for the Pomodoro Timer application.

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
supabase db execute -f database/migrations/add_rate_and_pomodoros_to_projects.sql
```

## Available Migrations

### add_rate_and_pomodoros_to_projects.sql

**Purpose**: Adds `hourly_rate` and `pomodoros_count` columns to the `projects` table.

**What it does**:
- Adds `hourly_rate` column (DECIMAL) for storing project hourly rates
- Adds `pomodoros_count` column (INTEGER) for tracking completed pomodoros
- Sets default values to 0 for both columns
- Safe to run multiple times (uses `IF NOT EXISTS`)

**When to run**: This migration is required for proper project earnings calculations and pomodoro tracking.

## Verifying Migrations

After running a migration, verify it was successful:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('hourly_rate', 'pomodoros_count');
```

## Rollback

To rollback the `add_rate_and_pomodoros_to_projects` migration:

```sql
ALTER TABLE projects DROP COLUMN IF EXISTS hourly_rate;
ALTER TABLE projects DROP COLUMN IF EXISTS pomodoros_count;
```

**⚠️ Warning**: Only rollback if you haven't started using these features yet, as it will result in data loss.
