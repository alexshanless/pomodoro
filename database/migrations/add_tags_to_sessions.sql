-- Migration: Add tags column to pomodoro_sessions table
-- This enables tagging sessions for better filtering and analytics
-- Example tags: 'urgent', 'client-work', 'deep-focus', 'research'

-- Add tags column (text array for multiple tags per session)
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create GIN index for efficient tag searches and filtering
-- GIN (Generalized Inverted Index) is optimized for array operations
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_tags
ON pomodoro_sessions USING GIN (tags);

-- Add comment to explain the column
COMMENT ON COLUMN pomodoro_sessions.tags IS 'Array of tags for categorizing sessions (e.g., urgent, client-work, deep-focus, research). Enables tag-based filtering and analytics.';

-- Note: Existing sessions will have empty array [] for tags by default
