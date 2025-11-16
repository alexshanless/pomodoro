-- Migration: Add project_number to projects table
-- Run this in Supabase SQL Editor

-- Add project_number column with sequence
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_number SERIAL;

-- Create a sequence per user for project numbering
-- Note: Since SERIAL creates a global sequence, we'll use a function to handle per-user numbering

-- Drop the SERIAL column and create our own solution
ALTER TABLE projects DROP COLUMN IF EXISTS project_number;
ALTER TABLE projects ADD COLUMN project_number INTEGER;

-- Create a function to get the next project number for a user
CREATE OR REPLACE FUNCTION get_next_project_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(project_number), 0) + 1
  INTO next_number
  FROM projects
  WHERE user_id = p_user_id;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-assign project numbers
CREATE OR REPLACE FUNCTION assign_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := get_next_project_number(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_number ON projects;
CREATE TRIGGER set_project_number
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION assign_project_number();

-- Backfill existing projects with project numbers
-- This assigns numbers based on creation order
WITH numbered_projects AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM projects
  WHERE project_number IS NULL
)
UPDATE projects
SET project_number = numbered_projects.row_num
FROM numbered_projects
WHERE projects.id = numbered_projects.id;
