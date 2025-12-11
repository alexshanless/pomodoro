-- Migration: Create Project Sharing System
-- Description: Enables users to share projects with clients via read-only links
-- Date: 2025-12-11

-- ============================================
-- Table: project_shares
-- ============================================
CREATE TABLE IF NOT EXISTS project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Access control
  access_type TEXT NOT NULL CHECK (access_type IN ('read-only', 'comment', 'edit')),

  -- Sharing mechanism
  share_token TEXT NOT NULL UNIQUE,
  shared_with_email TEXT, -- Optional: specific user sharing

  -- Metadata
  label TEXT, -- Optional: friendly name for this share (e.g., "Client Portal")
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0, -- Track how many times accessed
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one share per email per project
  UNIQUE(project_id, shared_with_email)
);

-- Create index for fast token lookup
CREATE INDEX idx_project_shares_token ON project_shares(share_token);
CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX idx_project_shares_shared_by ON project_shares(shared_by_user_id);

-- ============================================
-- Table: project_share_views
-- ============================================
-- Track who viewed shared projects and when
CREATE TABLE IF NOT EXISTS project_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES project_shares(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewer_user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_share_views_share_id ON project_share_views(share_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_share_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares they created
CREATE POLICY "Users can view their own project shares"
  ON project_shares FOR SELECT
  USING (auth.uid() = shared_by_user_id);

-- Policy: Users can create shares for their own projects
CREATE POLICY "Users can create shares for own projects"
  ON project_shares FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own shares
CREATE POLICY "Users can update own project shares"
  ON project_shares FOR UPDATE
  USING (auth.uid() = shared_by_user_id);

-- Policy: Users can delete their own shares
CREATE POLICY "Users can delete own project shares"
  ON project_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- Policy: Anyone with valid token can view share views (for owner to see analytics)
CREATE POLICY "Share owners can view their share views"
  ON project_share_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_shares
      WHERE project_shares.id = project_share_views.share_id
      AND project_shares.shared_by_user_id = auth.uid()
    )
  );

-- Policy: Allow anonymous insert for tracking views
CREATE POLICY "Anonymous users can insert share views"
  ON project_share_views FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Functions
-- ============================================

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 32-character token
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := replace(token, '=', '');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM project_shares WHERE share_token = token) INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_project_shares_timestamp
  BEFORE UPDATE ON project_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_project_shares_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE project_shares
  SET
    view_count = view_count + 1,
    last_accessed_at = NOW()
  WHERE id = NEW.share_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment view count when view is recorded
CREATE TRIGGER increment_view_count_on_insert
  AFTER INSERT ON project_share_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_share_view_count();

-- ============================================
-- Grant Permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON project_shares TO anon;
GRANT SELECT ON project_share_views TO anon;
GRANT INSERT ON project_share_views TO anon;
GRANT USAGE ON SEQUENCE project_share_views_id_seq TO anon;

COMMENT ON TABLE project_shares IS 'Stores project sharing links for collaboration';
COMMENT ON TABLE project_share_views IS 'Tracks analytics for shared project views';
