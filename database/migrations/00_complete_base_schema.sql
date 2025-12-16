-- Complete Base Schema for PomPay Pomodoro Timer
-- This consolidates all base migrations that have been implemented
-- Date: 2025-12-14
--
-- IMPORTANT: Only run this on a fresh database. If you have existing data,
-- the individual migration files should have already been run.
--
-- Included migrations:
-- - create_user_settings.sql
-- - create_goals_and_streaks.sql
-- - add_rate_and_pomodoros_to_projects.sql
-- - add_tags_to_sessions.sql
-- - add_selected_project_to_user_settings.sql

-- ============================================
-- User Settings
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_timestamp
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- ============================================
-- Goals and Streaks
-- ============================================

CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal INTEGER DEFAULT 4,
  weekly_goal INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_goals
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Project Enhancements
-- ============================================

-- Add hourly_rate and pomodoros_count to projects table
-- (Assumes projects table already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE projects ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'pomodoros_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN pomodoros_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- Session Tags
-- ============================================

-- Add tags column to pomodoro_sessions table
-- (Assumes pomodoro_sessions table already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pomodoro_sessions' AND column_name = 'tags'
  ) THEN
    ALTER TABLE pomodoro_sessions ADD COLUMN tags TEXT[];

    -- Create GIN index for efficient tag searches
    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_tags
      ON pomodoro_sessions USING GIN (tags);
  END IF;
END $$;

-- ============================================
-- Verification
-- ============================================

-- To verify this migration ran successfully, run:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('user_settings', 'user_goals', 'user_streaks');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'projects'
-- AND column_name IN ('hourly_rate', 'pomodoros_count');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'pomodoro_sessions'
-- AND column_name = 'tags';

COMMENT ON TABLE user_settings IS 'User-specific settings and preferences';
COMMENT ON TABLE user_goals IS 'Daily and weekly pomodoro goals';
COMMENT ON TABLE user_streaks IS 'Current and longest streaks tracking';
