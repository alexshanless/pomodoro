# Pomodoro Timer

A productivity app combining the Pomodoro Technique with project management and time tracking.

## Features

- ⏱️ **Pomodoro Timer** - Customizable focus, short break, and long break durations
- 📊 **Analytics** - Visualize your productivity trends with charts and calendar views
- 💼 **Project Management** - Organize work sessions by project
- 💰 **Financial Tracking** - Track earnings and expenses per project
- ☁️ **Cloud Sync** - Sync your data across devices with Supabase
- 🎨 **Beautiful UI** - Modern design with smooth animations

## Tech Stack

- **Frontend:** React, React Router
- **Backend:** Supabase (PostgreSQL + Auth)
- **Styling:** CSS with custom animations
- **Charts:** Recharts
- **Deployment:** Netlify

## Screenshots

<!-- Add screenshots here -->

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase credentials to .env

# Start development server
npm start
```

### Environment Variables

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Build

```bash
npm run build
```

## License

MIT
