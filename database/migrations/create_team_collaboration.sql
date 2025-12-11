-- Migration: Create Team Collaboration System
-- Description: Enables team pomodoro sessions and collaborative project tracking
-- Date: 2025-12-11

-- ============================================
-- Table: teams
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- Settings
  default_focus_duration INTEGER DEFAULT 25, -- minutes
  default_break_duration INTEGER DEFAULT 5,  -- minutes

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);

-- ============================================
-- Table: team_members
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Access control
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',

  -- Invitation tracking
  invitation_status TEXT CHECK (invitation_status IN ('pending', 'accepted', 'declined')) DEFAULT 'accepted',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one membership per user per team
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ============================================
-- Table: team_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS team_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Session details
  name TEXT NOT NULL, -- e.g., "Morning Deep Work Session"
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Timing
  scheduled_start_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  break_duration_minutes INTEGER DEFAULT 5,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'break', 'completed', 'cancelled')) DEFAULT 'scheduled',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_team_sessions_team_id ON team_sessions(team_id);
CREATE INDEX idx_team_sessions_status ON team_sessions(status);
CREATE INDEX idx_team_sessions_scheduled_start ON team_sessions(scheduled_start_at);

-- ============================================
-- Table: team_session_participants
-- ============================================
CREATE TABLE IF NOT EXISTS team_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_session_id UUID NOT NULL REFERENCES team_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Participation tracking
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  completed_full_session BOOLEAN DEFAULT false,

  -- Personal notes for this session
  personal_notes TEXT,

  UNIQUE(team_session_id, user_id)
);

CREATE INDEX idx_session_participants_session_id ON team_session_participants(team_session_id);
CREATE INDEX idx_session_participants_user_id ON team_session_participants(user_id);

-- ============================================
-- Table: team_invitations
-- ============================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),

  -- Invitation details
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invitation_token TEXT NOT NULL UNIQUE,
  message TEXT,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(team_id, invited_email, status)
);

CREATE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(invited_email);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies: teams
-- ============================================

-- Users can view teams they own or are members of
CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.invitation_status = 'accepted'
    )
  );

-- Only authenticated users can create teams
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Team owners and admins can update teams
CREATE POLICY "Owners and admins can update teams"
  ON teams FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    )
  );

-- Only team owners can delete teams
CREATE POLICY "Only owners can delete teams"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- RLS Policies: team_members
-- ============================================

-- Users can view members of teams they belong to
CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Team owners and admins can add members
CREATE POLICY "Owners and admins can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    )
  );

-- Users can update their own membership, owners/admins can update any
CREATE POLICY "Users can update team members"
  ON team_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    )
  );

-- Users can remove themselves, owners/admins can remove any member
CREATE POLICY "Users can remove team members"
  ON team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    )
  );

-- ============================================
-- RLS Policies: team_sessions
-- ============================================

-- Team members can view sessions for their teams
CREATE POLICY "Team members can view team sessions"
  ON team_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_sessions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.invitation_status = 'accepted'
    )
  );

-- Team members can create sessions
CREATE POLICY "Team members can create sessions"
  ON team_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_sessions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.invitation_status = 'accepted'
    )
  );

-- Session creators and admins can update sessions
CREATE POLICY "Session creators and admins can update"
  ON team_sessions FOR UPDATE
  USING (
    auth.uid() = created_by_user_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_sessions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    )
  );

-- Session creators and admins can delete sessions
CREATE POLICY "Session creators and admins can delete"
  ON team_sessions FOR DELETE
  USING (
    auth.uid() = created_by_user_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_sessions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'owner')
    )
  );

-- ============================================
-- RLS Policies: team_session_participants
-- ============================================

-- Users can view participants of sessions they can access
CREATE POLICY "Users can view session participants"
  ON team_session_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_sessions ts
      JOIN team_members tm ON ts.team_id = tm.team_id
      WHERE ts.id = team_session_participants.team_session_id
      AND tm.user_id = auth.uid()
      AND tm.invitation_status = 'accepted'
    )
  );

-- Team members can join sessions
CREATE POLICY "Team members can join sessions"
  ON team_session_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM team_sessions ts
      JOIN team_members tm ON ts.team_id = tm.team_id
      WHERE ts.id = team_session_participants.team_session_id
      AND tm.user_id = auth.uid()
      AND tm.invitation_status = 'accepted'
    )
  );

-- Users can update their own participation
CREATE POLICY "Users can update own participation"
  ON team_session_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can remove themselves from sessions
CREATE POLICY "Users can remove themselves from sessions"
  ON team_session_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies: team_invitations
-- ============================================

-- Users can view invitations for their teams or sent to them
CREATE POLICY "Users can view relevant invitations"
  ON team_invitations FOR SELECT
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_invitations.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    )
  );

-- Team owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    (EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_invitations.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    ))
  );

-- Users can update invitations sent to them
CREATE POLICY "Users can update their invitations"
  ON team_invitations FOR UPDATE
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    auth.uid() = invited_by
  );

-- ============================================
-- Functions
-- ============================================

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := replace(token, '=', '');

    SELECT EXISTS(SELECT 1 FROM team_invitations WHERE invitation_token = token) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for teams
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_timestamp
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Function to update updated_at timestamp for team_members
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_members_timestamp
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

-- Function to update updated_at timestamp for team_sessions
CREATE OR REPLACE FUNCTION update_team_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_sessions_timestamp
  BEFORE UPDATE ON team_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_team_sessions_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE teams IS 'Teams for collaborative pomodoro sessions';
COMMENT ON TABLE team_members IS 'Team membership and roles';
COMMENT ON TABLE team_sessions IS 'Collaborative pomodoro sessions for teams';
COMMENT ON TABLE team_session_participants IS 'Tracks user participation in team sessions';
COMMENT ON TABLE team_invitations IS 'Team invitation system';
