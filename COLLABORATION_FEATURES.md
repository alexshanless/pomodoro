# Collaboration Features Implementation

## Overview

This document outlines the implementation of Team/Collaboration Features (Item 4 from PRODUCT_STRATEGY.md) for the PomPay Pomodoro Timer application.

Project sharing is live. The team collaboration tables exist but are dormant and locked down: there is no UI, all client access to them is revoked, and their RLS policies are known to be wrong (see section 2).

## Features Implemented

### 1. Project Sharing System

Users can now share their project dashboards with clients or team members using secure, shareable links.

#### Key Features:
- **Read-only project views** - Share time tracking data with clients transparently
- **Secure share tokens** - Unique, cryptographically secure tokens for each share
- **Read-only access only** - `share_link_rpc.sql` restricts `access_type` to `read-only`; the older `comment` / `edit` values are gone
- **Expiration dates** - Set automatic expiration for share links (7/30/90 days or never)
- **View analytics** - Count views per link. A view is recorded at most once per minute per link, so the count is not raw page loads
- **Enable/disable shares** - Temporarily disable shares without deleting them
- **Email-specific sharing** - Optionally restrict a share to one email address; the recipient must sign in with that email

#### How to Use:

1. **Create a Share Link:**
   - Navigate to a project detail page
   - Click the three-dot menu (⋮) in the top right
   - Select "Share Project"
   - Click "Create Share Link"
   - Set an optional label, optional email restriction, and expiration
   - Click "Create Share Link"

2. **Manage Share Links:**
   - View all active share links for a project
   - Copy share URLs to clipboard
   - Toggle shares active/inactive
   - Revoke shares permanently
   - View the view count for each link

3. **Access Shared Project:**
   - Share the generated URL with clients/team members
   - Recipients can view the project without logging in
   - Shared view shows:
     - Project name, description, and color
     - Total pomodoros and time tracked
     - Earnings in total and per session (if the project has an hourly rate)
     - The 50 most recent focus sessions, grouped by date, with descriptions and tags
     - Read-only badge to indicate viewing restrictions

### 2. Team Collaboration Infrastructure (dormant)

Database schema for future team features. Nothing in the app uses it yet.

#### Tables Created:
- **teams** - Store team information
- **team_members** - Track team membership and roles
- **team_sessions** - Collaborative pomodoro sessions
- **team_session_participants** - Track participation in team sessions
- **team_invitations** - Manage team invitation workflow

#### Current State:
- `audit_security_hardening.sql` revokes all `anon` and `authenticated` grants on these five tables, so client code cannot read or write them.
- The RLS policies in `create_team_collaboration.sql` are wrong: a member can update their own `team_members` row to role `owner` or to another `team_id`, and the `team_members` SELECT policy references itself.
- Before the feature ships, fix those policies first, then re-grant access. Re-granting alone reopens the holes.

#### Planned Features:
- Team pomodoro sessions (synchronized focus time)
- Team member management with roles (owner, admin, member)
- Invitation system for adding team members
- Collaborative project tracking

## Technical Implementation

### Database Migrations

1. **`database/migrations/create_project_sharing.sql`**
   - `project_shares` table
   - `project_share_views` table (analytics)
   - RLS policies for secure data access
   - Helper functions for token generation
   - Automatic view count tracking

2. **`database/migrations/create_team_collaboration.sql`**
   - `teams` table
   - `team_members` table
   - `team_sessions` table
   - `team_session_participants` table
   - `team_invitations` table
   - RLS policies (known to be wrong; see section 2)
   - Invitation token generation

Later migrations changed how sharing works:

- **`share_link_rpc.sql`** adds the `get_shared_project_data(p_token, p_user_agent)` RPC (SECURITY DEFINER). It validates the token, active flag, expiry and email restriction server-side, returns the project and sessions without `user_id`, and records the view.
- **`auth_hardening_medium.sql`** and **`auth_hardening_low.sql`** remove the old anonymous grants on `project_shares` and `project_share_views`.
- **`audit_security_hardening.sql`** stops a share from being re-pointed at another user's project, makes the RPC return only data owned by the share's creator, throttles view recording to one per minute per link, and revokes client access to the team tables.

See `database/migrations/README.md` for the run order.

### React Hooks

**`src/hooks/useProjectShares.js`**

Three custom hooks for project sharing:

1. **`useProjectShares(projectId)`**
   - Fetch shares for a specific project
   - Create new share links
   - Update existing shares
   - Revoke shares
   - Toggle share active status
   - Get share analytics
   - Generate shareable URLs

2. **`useSharedProject(shareToken)`**
   - Public hook for accessing shared project data
   - Calls the `get_shared_project_data` RPC, which does all validation and view recording server-side
   - Maps the RPC's `INVALID_OR_EXPIRED`, `AUTH_REQUIRED` and `EMAIL_MISMATCH` errors to UI states

3. **`useTeams()`**
   - Manage teams (create, update, delete)
   - Fetch teams user belongs to
   - Not used by any component. Its queries fail while client access to the team tables is revoked

### React Components

1. **`src/components/ShareProjectModal.jsx`**
   - Modal for creating and managing project shares
   - Share link creation form
   - List of existing shares with management options
   - Copy-to-clipboard functionality
   - Share status indicators (active, inactive, expired)
   - View analytics display

2. **`src/components/SharedProjectView.jsx`**
   - Public view of shared project
   - Clean, branded interface for external viewers
   - Project stats and information
   - Session timeline grouped by date
   - Error handling for invalid/expired links
   - Loading states

3. **Updated `src/components/ProjectDetail.jsx`**
   - Added "Share Project" button to actions menu
   - Integration with ShareProjectModal

### Routing

**`src/App.js`**
- Added public route: `/shared/:shareToken`
- Lazy-loaded SharedProjectView component
- No authentication required for shared views

### Styling

**`src/App.css`**
- Complete styling for all collaboration components
- Responsive design for mobile devices
- Dark theme consistency
- Hover effects and transitions
- Badge styling for share statuses
- Timeline and card layouts
- Error and loading states

## Security Considerations

### Row Level Security (RLS)

- **Project Shares:**
  - Users can only manage shares they created, and only for projects they own
  - Share owners can view analytics
  - Anonymous users have no direct table access; views are recorded only inside `get_shared_project_data`

- **Team tables:**
  - No client access: all `anon` / `authenticated` grants are revoked
  - The existing policies are wrong and must be fixed before access is re-granted (see section 2)

### Token Security

- Share tokens are generated using cryptographically secure random bytes
- Tokens are 32 characters long and URL-safe
- Uniqueness is enforced at the database level
- Inactive and expired shares are rejected by the RPC

### Data Access

- Shared project views only expose necessary data
- Financial data requires explicit consent (hourly rate shown only if set)
- The RPC returns only the project and sessions owned by the share's creator
- No access to user accounts or other projects
- View tracking for accountability

## Database Setup Instructions

To enable these features in your Supabase instance:

1. **Run the migrations** in the order listed in `database/migrations/README.md`. Sharing needs `create_project_sharing.sql`, `share_link_rpc.sql`, the two `auth_hardening_*` files and `audit_security_hardening.sql`.

2. **Verify tables:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'project_shares',
     'project_share_views',
     'teams',
     'team_members',
     'team_sessions',
     'team_session_participants',
     'team_invitations'
   );
   ```

3. **Test RLS policies:**
   - Create a share link via the UI
   - Verify you can access it without authentication
   - Try accessing another user's share (should fail)

## Future Enhancements

### Phase 1: Enhanced Sharing
- [ ] Add comments to shared projects
- [ ] Client approval workflow for time entries
- [ ] Custom branding for shared views
- [ ] Export shared data to PDF/CSV from shared view
- [ ] Share link usage limits

### Phase 2: Team Features
- [ ] Real-time team pomodoro sessions
- [ ] Team leaderboards
- [ ] Shared project management
- [ ] Team chat/collaboration
- [ ] Synchronized break times

### Phase 3: Advanced Collaboration
- [ ] Public accountability boards
- [ ] Study group coordination
- [ ] Remote team focus time coordination
- [ ] Integration with Slack/Discord for status updates
- [ ] Webhooks for external integrations

## Known Limitations

1. **Real-time Updates:**
   - Shared views are static at load time
   - Consider adding Supabase Realtime subscriptions for live updates

2. **Session History:**
   - The RPC returns only the 50 most recent focus sessions, so totals on the shared view cover those sessions only
   - Showing more would need pagination or date-range filters

## Testing Checklist

- [ ] Create a project share link
- [ ] Access share link in incognito mode
- [ ] Verify share expiration works
- [ ] Test toggle share active/inactive
- [ ] Revoke a share and verify access is denied
- [ ] Check view count increments
- [ ] Test on mobile devices
- [ ] Verify RLS prevents unauthorized access
- [ ] Test with expired share links
- [ ] Copy share link to clipboard

## API Reference

### useProjectShares Hook

```javascript
const {
  shares,           // Array of share objects
  loading,          // Boolean loading state
  error,            // Error message if any
  createShare,      // Function: (shareData) => Promise<share>
  updateShare,      // Function: (shareId, updates) => Promise<share>
  revokeShare,      // Function: (shareId) => Promise<void>
  toggleShareStatus,// Function: (shareId, isActive) => Promise<share>
  getShareAnalytics,// Function: (shareId) => Promise<analytics[]>
  getShareUrl,      // Function: (shareToken) => string
  refresh           // Function: () => Promise<void>
} = useProjectShares(projectId);
```

### useSharedProject Hook

```javascript
const {
  project,          // Project object
  sessions,         // Array of session objects
  shareInfo,        // Share configuration
  loading,          // Boolean loading state
  error,            // Error message if any
  errorCode         // 'INVALID_OR_EXPIRED' | 'AUTH_REQUIRED' | 'EMAIL_MISMATCH' | null
} = useSharedProject(shareToken);
```

## Support

For issues or questions about collaboration features:
1. Check this documentation
2. Review the database migration files
3. Check Supabase logs for RLS policy errors
4. Verify share tokens are valid and not expired
5. Check browser console for API errors

## License

These collaboration features are part of the PomPay application and follow the same license as the main project.
