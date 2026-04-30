# PomPay

🍅 A Pomodoro timer that tracks earnings while you work. Built for freelancers and consultants who bill by the hour.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/project-spec.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Tech Stack (quick reference)

- React 18 + Create React App (JavaScript / JSX — **not** TypeScript)
- styled-components for styling
- Supabase (Postgres + Auth + RLS) with localStorage offline fallback
- React Router v6, Recharts, Web Workers (timer), Netlify deploy

## Commands

- **Dev server**: `npm start` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Tests**: `npm test`
- **Bundle analysis**: `npm run build:analyze`
- **Clean install**: `npm run reinstall`

> No `lint` or `dev` scripts — use `npm start` for development.

## Database Migrations

- SQL files in `database/migrations/`, applied via the Supabase SQL editor
- **Never** edit the schema directly in the Supabase dashboard for shipping changes
- See `database/migrations/README.md` for the order and instructions
