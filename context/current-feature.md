# Current Feature: —

## Status

None active

## Goals

—

## Notes

—

## History (One liner)

- Project Switch Transfer — switching projects mid-session now asks whether to transfer the running time to the new project or save-and-stop on the old one; also fixed dropped in-progress minutes in the old switch-save math (`feature/project-switch-transfer`).
- Desktop Download Button — timer-page toolbar gained a download link to the GitHub-released Windows gadget exe, hidden on phones (`feature/desktop-download-button`).
- Desktop Widget — added an Electron desktop widget with timer and project switching, guest mode, and auto-updates from web deploys (`feature/desktop-widget`).
- Floating Timer Redesign — restyled the cross-page floating timer to the PomPay design system with a working pause/resume from any page (`fix/floating-timer-redesign`).
- Manual Time Entries — tracked time can now be added and edited in-app from Project Detail and Dashboard (`feature/manual-time-entries`).

- Timer Icon Controls — replaced labeled control pills with captioned icon circles and rebuilt the drawer's session card to match the on-page tracker (`fix/timer-icon-controls`).
- Timer Page Polish — fixed Timer layout issues (description field, tag input sizing, control order, live session tracker) and standardized minute displays (`fix/timer-page-polish`).
- Guest Projects + Data Migration — guests can create and track projects locally, and can import that local data into their account after signing up (`feature/guest-data-migration`).

- Roadmap Batch — enabled guest mode app-wide, folded analytics into Financial, redesigned the share view, extended offline sync to transactions, and added SW update notices (`feat/roadmap-batch`).
- Mobile Sweep — audited and fixed 17 mobile UI issues spanning navigation, modals, tap targets, and form zoom-on-focus (`fix/mobile-sweep`).
- PWA Phase 2 (closed-tab completion push) — added real Web Push so timer-completion notifications fire even with the tab closed (`feat/push-notifications`).
- PWA Phase 1 (installable + offline shell) — made the app installable with an offline shell via a precaching service worker and PomPay-branded icons (`feat/pwa`).
- Invoice Polish — added multi-currency support and optional day-grouped line items to PDF invoices (`feat/invoice-polish`).
- Offline Sync Queue — failed session saves now queue locally and replay automatically on reconnect, closing a signed-in data-loss gap (`fix/offline-sync-queue`).
- Timesheet Export — brought session exports up to standard CSV/PDF timesheet format with accurate start/end times and billable hours (`feat/timesheet-export`).
- Shared Data Contexts + Tests + CI — converted core data hooks to shared contexts for consistent app-wide state, and added unit tests plus CI (`refactor/shared-data-contexts`, `chore/money-tests-ci`).
- Recurring Transactions — recurring income and expenses now materialize automatically, and fixed broken transaction editing (`fix/recurring-transactions`).
- Invoicing — fixed broken invoice earnings and PDF generation, and added a real Generate Invoice modal (`feat/invoicing`).
- App Audit — moved the timer engine into a persistent context so it survives route changes, and unified all modals on one accessible behavior (`fix/app-audit`).
- Google Sign-In — added "Continue with Google" to the sign-in and sign-up pages (`feat/google-signin`).
- Profile Drawer Redesign — rebuilt the account drawer to the PomPay design system (PR #242).
- Settings Redesign — rebuilt the Settings page to the PomPay design system with steppers and toggle rows (PR #240).

- Sign-up Redesign — rebuilt the Sign Up page to the PomPay design system with a password strength meter (PR #239).
- Sign-in Redesign — converted sign-in from a nav modal into a real `/signin` page (PR #238).

- Financial Redesign — rebuilt Financial Overview with a cash-flow chart and summary tiles, and redesigned the global nav (`feat/financial-redesign`).
- Projects Redesign — rebuilt the Projects page with grid/list views and themed CRUD modals (PR #237).

- Commit Baseline Migrations for Core Tables — committed baseline SQL migrations with RLS policies for core tables (PR #223).
- Share-Link RPC Refactor — moved shared-project access to a secure server-side RPC, closing token/expiry/allowlist bypass risks.
- Auth Hardening (Medium + Low) — closed medium and low severity auth audit findings via migrations and aligned validation.
- Code-Scanner Quick Wins — cleaned up dead code and fixed a dev-mode crash in the Timer.
- Dashboard Cleanup — fixed scanner-flagged Dashboard issues and extracted shared date/financial utility helpers (PR #231).
- Timer Auto Focus-Mode + Critical A11y — timer auto-engages focus mode after start, plus critical accessibility fixes across modals and controls (PR #232).
- Timer Polish — moved session progress into the stats drawer and replaced all alert/confirm dialogs with a themed dialog system.
- Timer Minimalist Redesign — rebuilt the Timer screen into a two-state ring layout with a settings drawer and mobile bottom sheet (`feat/timer-redesign`).
- Dashboard Redesign — rebuilt the Dashboard with hero summary, projects table, goals/streaks, and financial activity panels (`feat/dashboard-redesign`).
