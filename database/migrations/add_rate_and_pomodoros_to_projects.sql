-- Migration: Add rate and pomodoros_count columns to projects table
-- This enables proper earnings calculations and pomodoro tracking

-- Add hourly_rate column (decimal for accurate financial calculations)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Add pomodoros_count column (integer to track completed pomodoros)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pomodoros_count INTEGER DEFAULT 0;

-- Add comment to explain the columns
COMMENT ON COLUMN projects.hourly_rate IS 'Hourly rate for earnings calculations (in dollars)';
COMMENT ON COLUMN projects.pomodoros_count IS 'Total number of completed pomodoros for this project';

-- Optional: Update existing projects to have default values (already handled by DEFAULT clause)
-- UPDATE projects SET hourly_rate = 0.00 WHERE hourly_rate IS NULL;
-- UPDATE projects SET pomodoros_count = 0 WHERE pomodoros_count IS NULL;
