# Current Feature

## Status

Complete — shipped to `main` via `feat/timer-redesign`.

## Goals

Faithful minimalist timer redesign from the Claude Design handoff (`pompay` bundle: `Pomodoro.html` + `Pomodoro Style Spec.html`). Rebuild the main timer screen to match the prototype pixel-for-pixel while preserving all existing Supabase/session wiring.

### What changed
- New self-contained stylesheet `src/styles/TimerRedesign.css` with the spec's design tokens (navy base `#131a2a`, surface `#1b2336`, track `#232c42`, ink/soft/muted text, cyan/violet/magenta accents), Fredoka + Inter type, pill/round geometry. Scoped under `.pompay-timer` / `.pompay-settings` so it never collides with the legacy 11k-line `.pomodoro-container` CSS.
- `Timer.jsx` render fully restructured to the two-state layout driven by `sessionState` (`idle` vs `active`):
  - **Setup (idle):** task input hero, Focus/Short/Long mode tabs, project select + tags meta row, Start (ink) + Reset (ghost).
  - **Running (active):** chrome collapses to a read-only task title + project/tag chips; Pause/Resume (ink) + Stop (ghost) + Finish & Save (cyan accent).
- Vertical right-edge toolbar (settings, stats, zen, music) replacing the old horizontal utility cluster + Today panel (Today/streak block dropped per chat — Stats drawer covers daily totals).
- Ring readout rewritten as a non-rotated overlay (`.ppt-readout`) over the rotated `CircularProgressbar` gradient arc, so the big Fredoka time + uppercase mode label sit upright.
- Settings drawer form restyled to spec: stepper controls for durations/interval + toggle switches for auto-start/tracking/sound (was number inputs + checkboxes).
- Zen mode = existing `fullFocusMode` (auto-engages 5s after start, preserved); `[data-zen]` strips toolbar/task/meta/dots to ring + tabs + Start + eye.
- Extracted the inline project-switch handler to `handleProjectChange`; removed dead Today-panel code and unused imports.

### Preserved (not touched)
Web Worker timer, session persistence/restore, continuous tracking + earnings math, midnight rollover, auto-save on complete/reset/finish, DialogContext toasts/confirms, StatsDrawer (Recent/Calendar + session-progress panel), keyboard shortcuts, FloatingTimer, lo-fi music event wiring.

---

_Previous feature (kept for context):_ Timer polish PR — move the session-progress panel into the Stats drawer, plus all remaining UI-review findings (Warnings W6-W15 + Suggestions S17-S20).

### Session-progress relocation
- Move `session-progress-panel` JSX (`Timer.jsx:1499-1526`) out of the timer body and into the **Stats drawer** as a top section above the Recent/Calendar tabs.
- Only render when `settings.continuousTracking && isInActiveSession && sessionStartTime` (same gate as today).
- Section heading: "Current Session"; preserve Total Time / Earning / paused-active hint.
- While doing this, address **S18** by replacing "⏸️ Session paused" / "⏱️ Time tracking active" emoji-as-state with a text-first `paused`/`active` indicator (icon `aria-hidden`).

### Warnings (9)
- **W6** Remove `margin-top: -60px` on `.top-controls-zone > .project-selector-container` (`App.css:5088`). Assign to the correct grid row instead.
- **W7** Remove `margin-top: calc(1rem - 50px)` on `.session-description-container-separated` (`App.css:7868`). Same grid-row fix.
- **W8** Add `aria-hidden="true"` to `.mobile-timer-text` overlay; ensure the `CircularProgressbar` text remains accessible via the `text` prop or a visually-hidden `<span>` (`App.css:7770-7787`).
- **W9** Mobile mode tabs functional bug: `.mode-tabs-horizontal-header` is `display: none !important` on `max-width: 768px` (`App.css:7298-7300`). Replace with either a compact pill-toggle or a `<select>` so mobile users can switch Focus / Short Break / Long Break.
- **W10** Replace 6× `alert()` + 2× `window.confirm()` in `Timer.jsx` (lines 1041, 1066, 1072, 1080, 1136, 1139, 1353):
  - Investigation needed: there is no project-wide toast system today (only `OfflineContext` uses the word "toast"). Either (a) introduce a small `ToastContext` + `<Toast>` styled-component, or (b) for status messages convert to inline form errors and for the confirm dialog reuse `ModalCloseButton` + a styled `<ConfirmModal>` component.
  - Recommended: small `ToastContext` for notices + a new `ConfirmModal.jsx` for the project-switch confirmation.
- **W11** Increase tap targets to 44×44 via padding: `.minimize-floating-timer` (24px → 44px) and `.close-floating-timer` (~20px → 44px). Keep visual icon size the same (`App.css:3040-3082`).
- **W12** Same treatment for `.music-toggle-floating` (28px → 44px) (`App.css:5690-5706`).
- **W13** Replace the `body.keyboard-user` JS pattern (`App.css:11071-11087`, `useFocusVisible` in `utils/accessibility.js`) with native `:focus-visible`. Drop the `useFocusVisible` hook and its mount-time call sites.
- **W14** When settings modal or stats drawer is open, set `aria-hidden="true"` + `pointer-events: none` on `.floating-timer` so its buttons aren't reachable behind the overlay (`App.css:3024, 307, 7924`).
- **W15** Rename `const idCSS = 'hello'` (`Timer.jsx:410`) to `const GRADIENT_ID = 'timerGradient'` and import/use the same id from `GradientSVG.jsx`.

### Suggestions (4 — S16/S21 done in PR #232)
- **S17** Drop redundant inline streak flame color (`Timer.jsx:1203`); `.streak-badge-small` already sets `color: #FF6B35`.
- **S18** Covered above in the session-progress relocation step.
- **S19** Extract `rotate(215deg)` / `rotate(145deg)` magic numbers into CSS custom properties (`App.css:5470, 5478` + media-query duplicates). Define `--arc-rotation` / `--text-counter-rotation` at `:root`.
- **S20** Add `id`/`htmlFor` association to Focus/Short/Long break duration inputs (`Timer.jsx:1552-1591`).

## Notes

- Branch: `feat/timer-polish`
- Single bundled PR per user request — large but mechanical.
- Order suggestion to keep the PR reviewable: (1) session-progress relocation + S18, (2) W15 + S17 + S20 cleanups, (3) W11/W12/W14 floating-timer a11y, (4) W13 focus-visible migration, (5) W6/W7 layout grid fix, (6) W8 mobile timer a11y, (7) W9 mobile mode tabs, (8) S19 CSS custom properties, (9) W10 toast/confirm replacement (last because it adds new infra).
- Each step should build green; verify in the browser after the toast/confirm work since it touches user-visible flows.
- Out of scope: any deeper refactor of the settings modal layout, GradientSVG component cleanup beyond the id rename.

## History (One liner)

- Commit Baseline Migrations for Core Tables — added `baseline_core_tables.sql` with `CREATE TABLE IF NOT EXISTS` + RLS policies for `projects`, `pomodoro_sessions`, `financial_transactions` (PR #223).
- Share-Link RPC Refactor — added `share_link_rpc.sql` with `get_shared_project_data` SECURITY DEFINER RPC (server-side token + expiry + email allowlist enforcement), tightened `access_type` to `read-only`; closes audit Critical #1, #2, High #4.
- Auth Hardening (Medium + Low) — added `auth_hardening_medium.sql` and `auth_hardening_low.sql`, aligned auth forms with `validatePassword`; closes audit Medium #1-3 and Low #4-5.
- Code-Scanner Quick Wins — dead-code cleanup in Timer/useProjects/FinancialOverview; fixed a Timer TDZ crash that only surfaced in dev mode.
- Dashboard Cleanup — Dashboard.jsx scanner fixes (W1-W10, S5) + extracted `src/utils/dateUtils.js` and `src/utils/financialUtils.js`; ProjectDetail uses formatRelativeDate (PR #231).
- Timer Auto Focus-Mode + Critical A11y — auto-engage `fullFocusMode` 5s after Start; added focus traps to settings modal and stats drawer; screen-reader announcements on timer transitions; aria-labels on FloatingTimer buttons (PR #232).
- Timer Polish — moved session-progress panel into Stats drawer; closed UI-review Warnings W6-W13/W15 + Suggestions S17-S20; added DialogContext + DialogHost for toasts and confirms replacing all alert()/window.confirm() calls; migrated focus visibility to native `:focus-visible`; fixed mobile mode-tab functional bug; bumped FloatingTimer tap targets to 44x44.
- Timer Minimalist Redesign — rebuilt the Timer screen from the Claude Design handoff to a two-state (setup/running) layout: vertical right-edge toolbar, gradient-ring overlay readout, cohesive button hierarchy, stepper/switch settings drawer, zen mode. All Supabase/session wiring preserved (`feat/timer-redesign`). Overlay system (spec 05) added: spec'd settings drawer + blurred scrim and a stats popover, mutually exclusive with Esc/outside-click dismiss. Styling converted from a scoped CSS file to styled-components (`Timer.styles.js`); Fredoka loaded via `index.html`. Mobile (≤560px) ported from `Pomodoro Mobile.html`: toolbar → centered top pill, ring scales to `min(76vw,330px)` with overflow clipped, settings drawer → bottom sheet with grab handle, stats popover spans the top, meta stacks, controls wrap.
