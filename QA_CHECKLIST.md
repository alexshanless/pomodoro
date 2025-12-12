# 🔍 PomPay QA Testing Checklist

> **Phase:** Pre-PWA Quality Assurance & Bug Fixing
> **Goal:** Identify and fix all bugs, optimize logic flow, ensure production readiness
> **Last Updated:** 2025-12-11

---

## 🎯 Testing Methodology

For each test:
- [ ] Test as **authenticated user** (Supabase)
- [ ] Test as **guest user** (localStorage only)
- [ ] Test on **desktop** (Chrome, Firefox, Safari)
- [ ] Test on **mobile** (responsive view)
- [ ] Test with **slow network** (throttle in DevTools)
- [ ] Check browser **console for errors**

---

## ⏱️ CRITICAL: Timer Logic Testing

### Timer Start/Stop/Pause
- [ ] Start timer → verify countdown works
- [ ] Pause timer → verify it stops counting
- [ ] Resume timer → verify it continues from paused time
- [ ] Stop timer → verify session is saved (if authenticated)
- [ ] Start without project selected → verify behavior
- [ ] Start with project selected → verify project tracks time

### Continuous Tracking
- [ ] Enable continuous tracking in settings
- [ ] Complete 1 pomodoro → verify session continues during break
- [ ] Session time continues accumulating during break
- [ ] Earnings update in real-time during break
- [ ] Click "Finish & Save" → verify total session time is correct
- [ ] Disable continuous tracking → verify traditional behavior (saves after each pomodoro)

### Timer Modes
- [ ] Complete focus session → verify break starts automatically (if auto-start enabled)
- [ ] Complete short break → verify focus resumes
- [ ] Complete 4 pomodoros → verify long break triggers
- [ ] Skip break → verify focus session starts immediately
- [ ] Switch modes manually → verify timer adjusts

### Edge Cases - Timer
- [ ] **Close tab during timer** → reopen → verify timer still running (Web Worker)
- [ ] **Minimize tab** → verify timer continues (Web Worker)
- [ ] **Change project mid-session** → verify behavior (should warn or split session?)
- [ ] **Logout mid-session** → verify session is saved
- [ ] **Network disconnect mid-session** → verify localStorage backup
- [ ] **Multiple tabs open** → verify timer state syncs
- [ ] **Timer running for 24+ hours** → verify doesn't break
- [ ] **Manual pause for extended time** → resume → verify pause time excluded
- [ ] **Session pause time > session active time** → verify calculation correct

### Timer Notifications
- [ ] Pomodoro completes → verify notification shows (if enabled)
- [ ] Break completes → verify notification shows
- [ ] Notification permission denied → verify graceful fallback
- [ ] Notification clicked → verify app focuses

---

## 📊 Project Management Testing

### Create/Edit/Delete Projects
- [ ] Create project → verify appears in list
- [ ] Create project with hourly rate → verify saves correctly
- [ ] Create project with color → verify color displays
- [ ] Edit project name → verify updates everywhere
- [ ] Edit hourly rate → verify earnings recalculate
- [ ] Delete project with sessions → verify sessions persist or warning shows
- [ ] Delete project with transactions → verify behavior
- [ ] Archive project (if feature exists)

### Project Display
- [ ] View projects in card view → verify stats correct
- [ ] View projects in table view → verify columns display
- [ ] Switch between views → verify preference persists
- [ ] Project with no sessions → verify shows "0" not error
- [ ] Project with sessions but no rate → verify earnings show $0.00
- [ ] Navigate to project detail → verify all data loads

### Edge Cases - Projects
- [ ] **Create project with emoji in name** → verify displays correctly
- [ ] **Create project with very long name (100+ chars)** → verify truncates or wraps
- [ ] **Create project with special characters** → verify saves/displays
- [ ] **Duplicate project names** → verify allowed or prevented
- [ ] **Delete last project** → verify empty state displays
- [ ] **Create 100+ projects** → verify performance acceptable

---

## 💰 Financial Tracking Testing

### Income/Expense Transactions
- [ ] Add income transaction → verify appears in list
- [ ] Add expense transaction → verify deducts from balance
- [ ] Link transaction to project → verify project balance updates
- [ ] Edit transaction → verify balance recalculates
- [ ] Delete transaction → verify balance updates
- [ ] Recurring transaction → verify creates correctly

### Balance Calculations
- [ ] Project with time tracked → verify earnings calculate correctly
- [ ] Project with income → verify adds to balance
- [ ] Project with expenses → verify subtracts from balance
- [ ] Project balance = (earnings + income) - expenses → verify formula
- [ ] Multiple projects → verify balances independent
- [ ] No transactions → verify shows $0.00

### Charts & Analytics
- [ ] Financial overview chart → verify displays data
- [ ] Empty state (no data) → verify shows appropriate message
- [ ] Date range filter → verify filters data correctly
- [ ] Export charts → verify if feature exists

### Edge Cases - Financial
- [ ] **Negative balance** → verify displays correctly (e.g., -$500)
- [ ] **Very large numbers** (>$1M) → verify formatting
- [ ] **Decimal precision** → verify rounds to 2 decimal places
- [ ] **Zero-dollar transactions** → verify allowed/disallowed
- [ ] **Future-dated transactions** → verify behavior
- [ ] **Delete project with transactions** → verify transactions persist or cascade delete

---

## 📤 Export Functionality Testing

### CSV Export
- [ ] Export all sessions → verify CSV downloads
- [ ] Export filtered sessions (date range) → verify correct data
- [ ] Export project-specific sessions → verify filters correctly
- [ ] Open CSV in Excel/Google Sheets → verify formatting correct
- [ ] Verify headers: Date, Project, Description, Duration, Tags, Earnings
- [ ] Sessions with no project → verify shows "No Project"
- [ ] Sessions with tags → verify tags column populates
- [ ] Empty session list → verify exports with headers only

### PDF Invoice Generation
- [ ] Generate PDF invoice → verify downloads
- [ ] PDF contains project name → verify
- [ ] PDF contains session details → verify
- [ ] PDF contains earnings total → verify calculations correct
- [ ] PDF formatting looks professional → verify
- [ ] Invoice number generates uniquely → verify

### Edge Cases - Export
- [ ] **Export 1000+ sessions** → verify doesn't timeout/crash
- [ ] **Export with special characters in descriptions** → verify CSV escapes correctly
- [ ] **Export with emojis** → verify displays in CSV/PDF
- [ ] **No data to export** → verify shows appropriate message

---

## 🤝 Project Sharing Testing

### Create Share Links
- [ ] Create share link (read-only) → verify generates
- [ ] Copy share link → verify copies to clipboard
- [ ] Set expiration (7 days) → verify saves
- [ ] Set expiration (30 days) → verify saves
- [ ] Set expiration (never) → verify saves
- [ ] Add email restriction → verify saves
- [ ] Create multiple shares for same project → verify allowed

### Access Shared Projects
- [ ] Open share link in incognito mode → verify loads
- [ ] Shared project displays correctly → verify project name, stats
- [ ] Sessions display in timeline → verify grouped by date
- [ ] Earnings display (if rate set) → verify calculations
- [ ] Read-only badge shows → verify
- [ ] No edit/delete buttons → verify
- [ ] Expired link → verify shows error message
- [ ] Inactive/revoked link → verify shows error message
- [ ] Invalid token → verify shows 404 or error

### Share Management
- [ ] View all shares for project → verify list displays
- [ ] View count increments → verify tracks views
- [ ] Last accessed updates → verify timestamp
- [ ] Toggle share active/inactive → verify updates
- [ ] Revoke share → verify deletes and link stops working
- [ ] Edit share expiration → verify updates

### Edge Cases - Sharing
- [ ] **Share link with no sessions** → verify shows empty state
- [ ] **Share link with 1000+ sessions** → verify loads/performs well
- [ ] **Access share link while logged in** → verify doesn't conflict with auth
- [ ] **Share link SQL injection attempt** → verify sanitized
- [ ] **Malformed share token** → verify graceful error handling
- [ ] **Multiple people access same link simultaneously** → verify no conflicts

---

## 🎯 Goals & Streaks Testing

### Goal Setting
- [ ] Set daily goal → verify saves
- [ ] Set weekly goal → verify saves
- [ ] Change goal mid-week → verify updates
- [ ] Complete goal → verify checkmark/indicator shows
- [ ] Goal progress displays correctly → verify percentage/fraction
- [ ] Goal resets at midnight → verify (test with system clock change?)

### Streak Tracking
- [ ] Complete 1+ pomodoros today → verify current streak increments
- [ ] Miss a day → verify streak resets to 0
- [ ] Current streak > longest streak → verify longest streak updates
- [ ] Streak displays on dashboard → verify with fire emoji 🔥
- [ ] Streak survives midnight → verify doesn't reset mid-day

### Edge Cases - Goals
- [ ] **Set goal to 0** → verify behavior (disable feature?)
- [ ] **Set goal to 999** → verify handles large numbers
- [ ] **Complete goal multiple times in one day** → verify doesn't double-count
- [ ] **Timezone change** → verify streak doesn't break
- [ ] **Manual system clock change** → verify streak logic robust

---

## 🏷️ Tags System Testing

### Add/Edit Tags
- [ ] Add tag to session → verify saves
- [ ] Add multiple tags → verify all save
- [ ] Edit tag → verify updates
- [ ] Remove tag → verify deletes
- [ ] Tag suggestions/autocomplete (if exists) → verify works

### Tag Filtering
- [ ] Filter by single tag → verify shows correct sessions
- [ ] Filter by multiple tags → verify AND/OR logic
- [ ] Most-used tags display → verify sorts by usage count
- [ ] Tag-based time reports → verify calculates correctly
- [ ] Empty tag filter → verify shows all sessions

### Edge Cases - Tags
- [ ] **Tag with spaces** → verify saves as single tag
- [ ] **Tag with special characters** → verify handles
- [ ] **Very long tag name (50+ chars)** → verify truncates or wraps
- [ ] **100+ unique tags** → verify performance
- [ ] **Case sensitivity** (e.g., "Urgent" vs "urgent") → verify behavior

---

## 🔐 Authentication & Data Sync

### Sign Up/Login/Logout
- [ ] Sign up with email/password → verify account created
- [ ] Login with credentials → verify session established
- [ ] Logout → verify session cleared
- [ ] Password reset → verify email sent and flow works
- [ ] Invalid credentials → verify error message clear
- [ ] Already registered email → verify error message

### Data Synchronization
- [ ] Create data as guest → login → verify data syncs from localStorage to Supabase
- [ ] Create data online → go offline → continue working → come back online → verify syncs
- [ ] Multiple devices → create data on device 1 → open device 2 → verify syncs
- [ ] Conflict resolution → modify same project on 2 devices → verify handles correctly

### Offline Mode
- [ ] Disconnect network → create projects → verify saves locally
- [ ] Disconnect network → track time → verify works
- [ ] Reconnect network → verify data syncs to Supabase
- [ ] Offline indicator shows → verify UI feedback
- [ ] Network error handling → verify graceful degradation

### Edge Cases - Auth
- [ ] **Session expires mid-use** → verify re-authenticates or prompts
- [ ] **Logout with unsaved data** → verify warns or auto-saves
- [ ] **Login from multiple tabs** → verify state syncs
- [ ] **Account deletion** → verify data cleanup
- [ ] **RLS policy violations** → verify error handling (can't access other user's data)

---

## 🎨 UI/UX Testing

### Navigation
- [ ] Navigate between all pages → verify no broken links
- [ ] Back button works correctly → verify
- [ ] Floating timer widget follows across pages → verify
- [ ] Mobile menu (hamburger) opens/closes → verify
- [ ] Breadcrumbs (if exist) → verify accurate

### Responsive Design
- [ ] Desktop (1920x1080) → verify layout
- [ ] Laptop (1366x768) → verify layout
- [ ] Tablet (768x1024) → verify layout
- [ ] Mobile (375x667) → verify layout
- [ ] Rotate device → verify adapts
- [ ] Zoom in/out (browser zoom) → verify usable

### Forms & Inputs
- [ ] All form validations work → verify error messages
- [ ] Submit with missing required fields → verify blocked
- [ ] Input sanitization → verify XSS prevention
- [ ] Date pickers work → verify can select dates
- [ ] Dropdowns/selects populate → verify
- [ ] Character limits enforced → verify

### Loading & Error States
- [ ] Loading spinners show during async operations → verify
- [ ] Error messages display clearly → verify actionable
- [ ] Empty states display → verify helpful messaging
- [ ] Network error → verify retry option
- [ ] 404 page → verify exists and helpful

### Accessibility
- [ ] Keyboard navigation works → verify tab order logical
- [ ] Screen reader testing (if possible) → verify labels correct
- [ ] Color contrast sufficient → verify WCAG AA compliance
- [ ] Focus indicators visible → verify
- [ ] Alt text on images → verify

### Edge Cases - UI
- [ ] **Very long text** (project names, descriptions) → verify truncates/wraps
- [ ] **Empty data states** → verify empty state components show
- [ ] **Rapid clicking/double-submit** → verify debounced
- [ ] **Browser autofill** → verify doesn't break forms
- [ ] **Print page** → verify reasonable print layout

---

## ⚡ Performance Testing

### Load Times
- [ ] Initial app load < 3 seconds → verify
- [ ] Dashboard loads < 1 second → verify
- [ ] Project detail loads < 1 second → verify
- [ ] Page transitions smooth → verify no jank

### Data Performance
- [ ] 100 projects → verify no lag
- [ ] 1000 sessions → verify list scrolls smoothly
- [ ] 500 transactions → verify charts render quickly
- [ ] Large CSV export (1000+ rows) → verify completes

### Memory & Resources
- [ ] Leave app open for hours → verify no memory leak (check DevTools)
- [ ] Background timer doesn't spike CPU → verify
- [ ] Network requests batched/optimized → verify
- [ ] localStorage doesn't exceed limits → verify

---

## 🔧 Developer Console Checks

For every test scenario:
- [ ] **No console errors** (red text)
- [ ] **No console warnings** (yellow text)
- [ ] **Network tab**: No failed requests (except expected offline scenarios)
- [ ] **Network tab**: No unnecessary duplicate requests
- [ ] **Application tab**: localStorage/sessionStorage data structure valid
- [ ] **Application tab**: Service worker (if PWA) working

---

## 🧪 Specific User Flows to Test

### Flow 1: New User Onboarding
1. Open app as new user
2. See welcome/onboarding (if exists)
3. Create first project
4. Start first pomodoro
5. Complete first session
6. View on dashboard
**Expected:** Smooth, intuitive, no errors

### Flow 2: Freelancer Daily Workflow
1. Login
2. Select client project
3. Start continuous tracking session
4. Complete 4 pomodoros (2 hours)
5. Finish & save session
6. View earnings for day
7. Export to CSV
8. Share project with client
**Expected:** Seamless, accurate billing

### Flow 3: Offline → Online Recovery
1. Start with network connected
2. Create project and track time
3. Disconnect network
4. Continue working (localStorage)
5. Reconnect network
6. Verify all data synced to Supabase
**Expected:** Zero data loss

### Flow 4: Multi-Device Sync
1. Login on Device 1
2. Create project and session
3. Login on Device 2
4. Verify project and session appear
5. Edit project on Device 2
6. Refresh Device 1
7. Verify changes synced
**Expected:** Real-time or near-real-time sync

### Flow 5: Client Viewing Shared Project
1. Freelancer creates share link
2. Copies link and sends to client
3. Client opens link (not logged in)
4. Client views project progress
5. Client sees sessions and earnings
6. Client cannot edit anything
**Expected:** Professional, transparent, read-only

---

## 🐛 Bug Tracking Template

When you find a bug, document it:

```markdown
## Bug #[number]

**Severity:** Critical / High / Medium / Low
**Component:** Timer / Projects / Financial / Sharing / etc.
**Browser:** Chrome 120 / Firefox 121 / etc.
**Device:** Desktop / Mobile

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Console Errors:**
```
[paste error]
```

**Screenshots:**
[attach if helpful]

**Workaround:**
[if any]

**Fix Priority:** P0 (blocker) / P1 (critical) / P2 (important) / P3 (nice-to-have)
```

---

## ✅ Sign-Off Criteria

Before moving to PWA:
- [ ] **Zero P0 bugs** (blockers)
- [ ] **Zero P1 bugs** (critical)
- [ ] **All critical flows work** (timer, projects, export, sharing)
- [ ] **No console errors** in happy path scenarios
- [ ] **Mobile responsive** on all pages
- [ ] **Offline mode stable**
- [ ] **Data sync reliable**
- [ ] **Performance acceptable** (no lag, no crashes)
- [ ] **Security verified** (RLS policies, XSS prevention, SQL injection prevention)
- [ ] **User testing completed** (3+ real users tried it)

---

## 📋 Testing Priority Order

**Phase 1: Core Functionality (P0)**
1. Timer logic (continuous tracking, pause/resume)
2. Session saving (data integrity)
3. Authentication (login/logout/sync)
4. Offline mode (localStorage fallback)

**Phase 2: Key Features (P1)**
5. Project management (CRUD)
6. Financial tracking (earnings calculations)
7. Export (CSV/PDF generation)
8. Sharing (link creation and access)

**Phase 3: Polish (P2)**
9. Goals & streaks
10. Tags system
11. UI/UX refinements
12. Performance optimization

**Phase 4: Edge Cases (P3)**
13. All edge case scenarios
14. Accessibility
15. Cross-browser compatibility
16. Extended performance testing

---

**Happy Testing! 🧪**

> Tip: Use browser DevTools → Application → "Preserve log" to catch errors that happen during page transitions/reloads
