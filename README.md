# 🍅 PomPay - Track Time. Track Money. Get More Done.

**The only Pomodoro timer that calculates your earnings while you work.**

Perfect for freelancers, consultants, and professionals who bill by the hour. PomPay combines the proven Pomodoro Technique with automatic earnings tracking, giving you insights into both productivity AND profitability.

> Built with ❤️ for the freelance community

## 📍 Development Status

**Current Phase:** Live & Polishing ✨

All major features are implemented, including:
- **PWA** — installable, works offline (app shell + service worker)
- **Closed-tab push notifications** when a Pomodoro completes (Web Push via Supabase; see `docs/push-notifications-setup.md`)
- **Google sign-in** alongside email/password (see `docs/google-oauth-setup.md`)
- **Guest mode** — the whole app works signed-out with on-device storage; signing in adds cross-device sync
- **Invoicing** — client-ready PDF invoices and timesheet exports (CSV/PDF)
- Offline sync queue — sessions and transactions saved while offline replay to the cloud on reconnect
- Unit tests over the billing/earnings math + GitHub Actions CI

## ✨ What Makes PomPay Different?

### 💰 Automatic Earnings Calculation
Set your hourly rate per project, and PomPay automatically calculates your earnings as you work. No more manual time tracking or spreadsheet math.

### ⏱️ Professional Pomodoro Timer
- Customizable work and break intervals (25/5 default)
- **Background timer using Web Workers** - keeps running even when tab is minimized
- **Floating timer widget** - follows you across all pages
- Auto-start options for seamless workflow
- Lo-fi music integration for focus sessions

### 📊 Project-Based Tracking
- Unlimited projects with custom colors
- Sequential project numbering (#1, #2, #3...)
- Track time AND earnings per project
- Session history with calendar views
- Detailed analytics and insights

### 💸 Complete Financial Management
- Income and expense logging linked to projects
- Balance tracking per project (earnings - expenses)
- Recurring transactions for subscriptions
- Beautiful charts and financial overview
- Export to CSV and PDF for invoicing

### 🤝 Team Collaboration & Sharing
- **Share projects with clients** via secure read-only links
- **Project dashboards** for transparent time tracking
- **Access control** with expiration dates and email restrictions
- **View analytics** to track link usage
- **Team infrastructure** ready for collaborative pomodoro sessions

### ☁️ Cloud Sync & Authentication
- **Supabase integration** for data persistence
- **User authentication** with secure sign-up/login
- **Multi-device sync** - access your data anywhere
- **Offline-first** with localStorage fallback
- **Privacy-focused** with Row Level Security (RLS)

### 🎨 Beautiful UI/UX
- **Modern, clean interface** with smooth animations
- **Full focus mode** for distraction-free work
- **Dark mode compatible** design
- **Responsive layout** works on desktop and mobile
- **Intuitive navigation** with real-time updates

## 🛠️ Technologies

### Frontend
- **React** - UI framework
- **React Router** - Navigation and routing
- **Recharts** - Data visualization
- **React DatePicker** - Date selection
- **React Icons** - Icon library

### Backend & Database
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Authentication

### State Management
- **Custom React Hooks** for data management
- **localStorage** for offline persistence
- **Context API** for global state

### Build Tools
- **Create React App** - Development environment
- **React Scripts** - Build tooling

## 📸 Screenshots

### Dashboard
<!-- Add dashboard screenshot here -->
*Coming soon*

### Pomodoro Timer
<!-- Add timer screenshot here -->
*Coming soon*

### Project Management
<!-- Add projects view screenshot here -->
*Coming soon*

### Financial Overview
<!-- Add financial overview screenshot here -->
*Coming soon*

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ and npm
- Supabase account (optional, works offline with localStorage)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/pomodoro.git
cd pomodoro
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables (optional for Supabase)
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Database Setup (For Supabase)

If you're using Supabase for cloud sync, run the SQL migrations from
`database/migrations/` in the order listed in
[`database/migrations/README.md`](database/migrations/README.md) — that README
is the source of truth for the run order and what each migration does.

### Optional Integrations

- **Google sign-in** — [`docs/google-oauth-setup.md`](docs/google-oauth-setup.md)
- **Closed-tab push notifications** — [`docs/push-notifications-setup.md`](docs/push-notifications-setup.md)
  (VAPID keys, edge function deploy, pg_cron schedule; requires
  `REACT_APP_VAPID_PUBLIC_KEY` in the environment)

## 🏗️ Project Structure

```
pomodoro/
├── src/
│   ├── components/          # React components
│   │   ├── Timer.jsx       # Main pomodoro timer
│   │   ├── Dashboard.jsx   # Dashboard overview
│   │   ├── Projects.jsx    # Project management
│   │   ├── ProjectDetail.jsx
│   │   ├── FinancialOverview.jsx
│   │   ├── ShareProjectModal.jsx    # Project sharing
│   │   ├── SharedProjectView.jsx    # Public shared view
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useProjects.js
│   │   ├── usePomodoroSessions.js
│   │   ├── useFinancialTransactions.js
│   │   ├── useProjectShares.js      # Project sharing
│   │   └── useGoalsStreaks.js
│   ├── contexts/           # React contexts
│   │   └── AuthContext.js
│   ├── lib/               # Utilities
│   │   └── supabaseClient.js
│   ├── utils/             # Utility functions
│   │   └── exportUtils.js  # CSV/PDF export
│   └── App.css            # Global styles
├── database/
│   └── migrations/        # SQL migration files
├── public/                # Static assets
└── package.json          # Dependencies
```

## 📝 Usage

### Offline Mode
The app works completely offline using localStorage. All your data is stored locally in your browser.

### Cloud Mode (Supabase)
When configured with Supabase:
- Data syncs across devices
- Secure authentication
- Real-time updates
- Automatic backups

### Switching Between Modes
The app automatically detects if Supabase is configured and falls back to localStorage when:
- No internet connection
- Not logged in
- Supabase credentials not provided

## 🤝 Contributing

This is an experimental project. Contributions, issues, and feature requests are welcome!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with assistance from **Claude AI** by Anthropic
- Inspired by the Pomodoro Technique® by Francesco Cirillo
- Icons by [React Icons](https://react-icons.github.io/react-icons/)

## ⚠️ Disclaimer

This is an experimental project created to explore AI-assisted development workflows. While functional, it may contain bugs or incomplete features. Use at your own discretion.

---

**Made with ❤️ and 🤖 AI assistance**
