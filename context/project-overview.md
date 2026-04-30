# PomPay Project Overview

🍅 **Track Time. Track Money. Get More Done.**

The only Pomodoro timer that calculates your earnings while you work.

---

## 📌 Problem (Core Idea)

Freelancers, consultants, and hourly professionals juggle two things at once:

- A focus/productivity tool (Pomodoro, time blocking)
- A separate spreadsheet, invoice tool, or memory for billable hours

This means context-switching, double entry, lost time, and inaccurate invoices.

➡️ **PomPay merges focus sessions and billable-hour tracking into one tool: when the timer runs, your earnings update automatically.**

---

## 🧑‍💻 Users

| Persona                    | Needs                                              |
| -------------------------- | -------------------------------------------------- |
| Freelance Developer        | Track focus time + earnings per client/project     |
| Consultant                 | Hourly-rate tracking, exportable invoice data      |
| Solopreneur / Indie Hacker | Project-level financial visibility (income/expense)|
| Agency Contractor          | Shareable read-only dashboards for clients         |

---

## ✨ Core Features

### A) Pomodoro Timer

- Customizable work/break intervals (default 25/5)
- Background timer via **Web Workers** — keeps running when tab is minimized
- Floating timer widget that follows the user across pages
- Auto-start options for back-to-back sessions
- Lo-fi music integration for focus

### B) Projects

- Unlimited projects with custom colors
- Sequential project numbering (#1, #2, #3…)
- Per-project hourly rate → automatic earnings calculation
- Session history with calendar view
- Per-project analytics

### C) Financial Tracking

- Income and expense entries linked to projects
- Per-project balance (earnings − expenses)
- Recurring transactions (subscriptions, retainers)
- Charts and overview dashboards
- Export to CSV and PDF (for invoicing)

### D) Authentication & Sync

- Supabase Auth (email + password)
- Multi-device sync via Postgres
- Row Level Security (RLS) for data isolation
- Offline-first: localStorage fallback when not signed in or offline

### E) Sharing & Collaboration

- Share projects with clients via secure read-only links
- Public dashboards for transparent time tracking
- Access control: expiration dates, email restrictions
- Link view analytics
- Team-collaboration infrastructure (in progress)

### F) UX

- Full focus mode for distraction-free work
- Responsive (desktop + mobile)
- Smooth animations, real-time updates
- Toast notifications, loading states

---

## 🧱 Tech Stack

| Category        | Choice                                       |
| --------------- | -------------------------------------------- |
| Framework       | **React 18** (Create React App / react-scripts) |
| Language        | JavaScript (JSX) — no TypeScript             |
| Routing         | React Router v6                              |
| Styling         | **styled-components** (+ some CSS files)     |
| State           | Custom hooks + Context API + localStorage    |
| Backend         | **Supabase** (PostgreSQL + Auth + RLS)       |
| Charts          | Recharts, react-circular-progressbar         |
| Date pickers    | react-datepicker, react-calendar             |
| Icons           | react-icons                                  |
| Export          | jspdf + jspdf-autotable (PDF), CSV utilities |
| Deployment      | **Netlify**                                  |
| Background work | Web Workers (for timer)                      |

---

## 📁 Repo Layout

```
src/
├── components/        # React components (.jsx)
├── hooks/             # Custom data + logic hooks (use*.js)
├── contexts/          # AuthContext, OfflineContext
├── lib/               # supabaseClient.js
├── utils/             # exportUtils, validation, accessibility, etc.
├── styles/            # Component-specific .css
└── App.js / App.css
database/
└── migrations/        # SQL migrations (run manually in Supabase SQL editor)
```

---

## 📌 Status

- All major features implemented
- Currently in **QA / refinement** phase: bugs, edge cases, UX polish, perf
- **Next milestone:** Progressive Web App (PWA) implementation

---

🍅 **PomPay — Focus pays.**
