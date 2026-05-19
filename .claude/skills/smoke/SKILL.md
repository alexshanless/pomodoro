---
name: smoke
description: Run a quick Playwright smoke test against the local dev server (http://localhost:3000) to verify routes load, capture console errors, and surface failed network requests. Use when the user asks to "smoke it", "smoke test", "verify nothing broke", or wants a fast end-to-end sanity check after edits.
---

# Smoke

A fast end-to-end sanity check against the running CRA dev server. Headless Chromium, no test framework — just navigate, capture signals, report.

## When to invoke

Iterative dev moments where the user wants confirmation the app still loads cleanly before committing or pushing. Typical phrasings:
- "smoke it"
- "smoke test"
- "make sure nothing broke"
- "is /<route> still working"

Not for: writing tests, full E2E coverage, CI gating. This is a 5–10 second sanity check.

## Prerequisites

1. **Dev server must be on http://localhost:3000.** Check first by reading the most recent `npm start` background-task output for "Compiled successfully". If not running, start it with `BROWSER=none` in the background and wait for the compile signal before continuing.
2. **`@playwright/test` must be installed** (already a devDependency).
3. **Chromium browser binary** present at `%LOCALAPPDATA%\ms-playwright\chromium-*`. If missing, `npx playwright install chromium` once.

## How to run

The smoke script lives at `.claude/skills/smoke/smoke.mjs`. Invoke from the project root (Node must be on PATH — `C:\Program Files\nodejs` if not):

```
node .claude/skills/smoke/smoke.mjs [route1] [route2] ...
```

Default routes if none specified: `/`, `/account`, `/signup`.

## Output shape

The script emits a single JSON object to stdout:

```json
{
  "navigations": [
    { "route": "/", "landedAt": "/", "httpStatus": 200, "title": "...", "ms": 1800, "err": null }
  ],
  "consoleErrors": ["..."],
  "pageErrors": ["..."],
  "failedRequests": ["GET https://... - net::ERR_ABORTED"]
}
```

`landedAt` differs from `route` when ProtectedRoute redirects (e.g. `/account` → `/signup` when unauthenticated). That's a useful signal, not a failure.

## Reporting

Summarize for the user as a markdown table (one row per navigation) plus a short list of any console / page / network failures. Don't dump raw JSON unless explicitly asked. Call out anything surprising — unexpected redirects, third-party requests, slow loads (>3s).

## Cleanup

Stateless. No repo changes, no temp files, no browser persistence. Nothing to clean up.
