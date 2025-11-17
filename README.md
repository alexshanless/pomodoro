# 🍅 Pomodoro Timer

A modern, feature-rich Pomodoro timer application with project tracking, financial management, and cloud synchronization.

> **Note:** This is an experimental project built with assistance from Claude AI, exploring the intersection of productivity tools and AI-assisted development.

## ✨ Features

### ⏱️ Smart Time Tracking
- **Pomodoro Timer** with customizable work and break intervals
- **Project-based sessions** to track time spent on different tasks
- **Session history** with detailed analytics and calendar views
- **Auto-start options** for seamless workflow

### 📊 Project Management
- **Unlimited projects** with custom colors and descriptions
- **Sequential project numbering** for easy reference
- **Time tracking** per project with pomodoro counts
- **Hourly rate calculation** for freelancers and consultants
- **Project-specific financial tracking**

### 💰 Financial Tracking
- **Income and expense logging** linked to projects
- **Balance tracking** per project
- **Recurring transactions** for subscription management
- **Financial overview** with charts and filters
- **Date range filtering** (today, 7d, 30d, 90d, 1y)

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

If you're using Supabase for cloud sync:

1. Go to your Supabase project's SQL Editor
2. Run the schema setup:
   - Execute `supabase_schema.sql` to create tables
   - Execute `add_project_number_migration.sql` to add sequential project numbering

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
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useProjects.js
│   │   ├── usePomodoroSessions.js
│   │   └── useFinancialTransactions.js
│   ├── contexts/           # React contexts
│   │   └── AuthContext.js
│   ├── lib/               # Utilities
│   │   └── supabaseClient.js
│   └── App.css            # Global styles
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
