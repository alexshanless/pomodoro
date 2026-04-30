# Coding Standards

## Language

- **JavaScript (JSX)** — this project does **not** use TypeScript. Do not introduce `.ts` / `.tsx` files or TS config.
- Target modern JS (ES2020+) as supported by Create React App's Babel preset.
- Prefer `const`; use `let` only when reassignment is required. No `var`.

## React

- Functional components only — no class components (except `ErrorBoundary`, which must be a class for `componentDidCatch`).
- Hooks for state and side effects.
- One job per component; extract reusable logic into custom hooks under `src/hooks/`.
- Memoize expensive computations with `useMemo` / `useCallback` only when there's a measurable need — don't blanket-memoize.
- Keep `useEffect` dependency arrays honest. If a dep would cause an infinite loop, fix the underlying logic, don't silence the lint rule.

## Build Tooling

- Built on **Create React App** (`react-scripts` 5). Do **not** eject.
- Do **not** introduce Next.js, Vite, Webpack configs, or alternative bundlers.
- Scripts: `npm start` (dev), `npm run build` (prod), `npm test` (Jest), `npm run build:analyze` (bundle analysis).

## Routing

- Use React Router v6 (`react-router-dom`).
- Route definitions live in `App.js`. Route-level guards use `ProtectedRoute.jsx`.

## Styling

- **Primary:** `styled-components` — co-locate styled components with their consumer where reasonable, or define them at the top of the same file.
- **Secondary:** plain `.css` files in `src/styles/` or alongside the component (e.g. `App.css`, `index.css`) for global / utility styles.
- **Do not** add Tailwind, CSS Modules, or other styling systems.
- No inline `style={}` props except for truly dynamic values that can't be expressed via styled-components props.
- Dark-mode-compatible colors; aim for accessibility (sufficient contrast, focus states).

## Backend / Data

- **Supabase** is the backend. Client is configured once in `src/lib/supabaseClient.js` — import from there, never re-instantiate.
- All Supabase access should go through a custom hook in `src/hooks/` (e.g. `useProjects.js`, `usePomodoroSessions.js`). Components should not call `supabase.from(...)` directly.
- Hooks must handle three states explicitly: loading, error, and offline (localStorage fallback).
- Respect Row Level Security — never use the service role key in client code.

## Database Migrations

- All schema changes go in `database/migrations/` as `.sql` files, named descriptively.
- **Never** edit schema directly in the Supabase dashboard for changes that need to ship.
- Document new migrations in `database/migrations/README.md` and run them in dev before prod.
- Migrations must be idempotent where possible (`create table if not exists`, `add column if not exists`).

## Offline & Sync

- Read paths: try Supabase if signed in + online; fall back to `localStorage`.
- Write paths: when offline, queue via `useOfflineQueue.js` and replay on reconnect.
- Use `useOnlineStatus.js` / `OfflineContext` for connectivity state — don't read `navigator.onLine` ad hoc.

## File Organization

```
src/
├── components/   # PascalCase.jsx — React components
├── hooks/        # useCamelCase.js — custom hooks
├── contexts/     # PascalCaseContext.js
├── lib/          # third-party clients (supabaseClient.js)
├── utils/        # pure helpers (camelCase.js)
└── styles/       # component-specific .css
```

- One component per file. File name matches default export.
- Co-located helpers used by exactly one component can stay in that file; once shared, move to `utils/`.

## Naming

- Components: `PascalCase.jsx` (e.g. `FloatingTimer.jsx`)
- Hooks: `useCamelCase.js`, must start with `use`
- Contexts: `PascalCaseContext.js`
- Functions / variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Boolean props/vars: prefix with `is`, `has`, `should`, `can`

## Error Handling

- Wrap top-level routes / risky subtrees in `ErrorBoundary.jsx`; render `ErrorFallback.jsx` on failure.
- Async hook actions: `try/catch`, surface errors via toast or inline UI — never swallow silently.
- Show user-friendly messages; log technical detail to the console for debugging.
- Validate user input via `src/utils/validation.js` and `useFormValidation.js`.

## State Management

- Local component state: `useState` / `useReducer`.
- Cross-component state: Context (`AuthContext`, `OfflineContext`) — keep contexts narrow and stable.
- Server state: custom hooks that wrap Supabase + localStorage fallback.
- Don't reach for Redux / Zustand / Jotai — current patterns are sufficient.

## Performance

- Web Worker handles the timer tick — don't move it back to the main thread.
- Lazy-load heavy routes/components with `React.lazy` + `Suspense` when bundle size warrants it.
- Use `src/utils/performance.js` helpers (e.g. debounce/throttle) instead of re-implementing.
- Run `npm run build:analyze` before merging large feature work to catch bundle bloat.

## Accessibility

- Use `src/utils/accessibility.js` helpers for focus management and announcements.
- All interactive elements must be keyboard reachable with visible focus states.
- Provide `aria-label`s for icon-only buttons.

## Testing

- Tests use Jest + `@testing-library/react` (provided by react-scripts).
- Test user behavior, not implementation details — query by role/label/text first.
- Keep tests close to the unit under test (`Component.test.jsx` next to `Component.jsx`).

## Code Quality

- No commented-out code. If it might be needed later, that's what git history is for.
- No unused imports, variables, or props.
- Keep functions under ~50 lines when reasonable; split if logic spans multiple concerns.
- No `console.log` left in committed code (use it during dev, then remove).
- Default to writing no comments — let names explain the *what*. Add a comment only when the *why* is non-obvious (a workaround, a hidden constraint, a subtle invariant).

## Deployment

- Deploys to **Netlify** via `netlify.toml`. Build command: `npm run build`, publish dir: `build/`.
- Environment variables on Netlify must be prefixed `REACT_APP_` to be exposed to the client (CRA convention).
- Required env vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`. **Never** expose the Supabase service role key to the client.
