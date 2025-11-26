-- Add selected_project_id column to user_settings table
-- Run this if you get error: column "selected_project_id" does not exist

-- Add the column if it doesn't exist
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS selected_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN user_settings.selected_project_id IS 'Currently selected project for the timer';
