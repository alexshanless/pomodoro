-- Migration: Create user_goals and user_streaks tables
-- This enables goal tracking and streak gamification

-- Create user_goals table to store daily and weekly pomodoro targets
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_pomodoro_goal INTEGER DEFAULT 8,
  weekly_pomodoro_goal INTEGER DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_streaks table to track consecutive days with pomodoros
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add comments to explain the tables and columns
COMMENT ON TABLE user_goals IS 'Stores user-defined daily and weekly pomodoro goals';
COMMENT ON COLUMN user_goals.daily_pomodoro_goal IS 'Target number of pomodoros to complete each day';
COMMENT ON COLUMN user_goals.weekly_pomodoro_goal IS 'Target number of pomodoros to complete each week';

COMMENT ON TABLE user_streaks IS 'Tracks user streaks for consecutive days with completed pomodoros';
COMMENT ON COLUMN user_streaks.current_streak IS 'Current number of consecutive days with at least 1 pomodoro';
COMMENT ON COLUMN user_streaks.longest_streak IS 'All-time longest streak achieved';
COMMENT ON COLUMN user_streaks.last_activity_date IS 'Last date when user completed a pomodoro';
COMMENT ON COLUMN user_streaks.streak_start_date IS 'Date when the current streak started';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);

-- Enable Row Level Security
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for user_goals
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for user_streaks
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks"
  ON user_streaks FOR DELETE
  USING (auth.uid() = user_id);
