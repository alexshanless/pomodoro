---
name: list-components
description: List PomPay's React components
argument-hint: [subdirectory]
---

## Task

List all React component files (`.jsx`, `.js`) in `src/components/`.

If a `[subdirectory]` is provided via `$ARGUMENTS`, only list files under `src/components/[subdirectory]/`.

## Output Format

- Numbered list of files with paths relative to the repo root (e.g. `src/components/Timer.jsx`)
- One-line description of each (infer from filename and a quick peek at the default export if needed)
- Summary count at the end

If no files found, say "No components found."
