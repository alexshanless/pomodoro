---
name: research
description: Run a research task to generate documentation
argument-hint: <prompt-name>
---

## Task

Execute research task: $ARGUMENTS

---

### Instructions

1. If no argument provided, error: "Usage: /research <prompt-name>"
2. Look for prompt file at `context/research/{$ARGUMENTS}.md`
3. If not found, error: "Prompt file not found at context/research/{$ARGUMENTS}.md"
4. Read the prompt file which should contain:
   - **Output**: Where to write results (e.g., `docs/auth-flow.md`)
   - **Research**: What to investigate
   - **Include**: Specific details to capture
   - **Sources**: What files/tools to use
5. Execute the research using appropriate tools:
   - Read source files (`src/`, migrations in `database/migrations/`, context docs)
   - Query Supabase via the configured Supabase MCP **if** it's authenticated; otherwise infer schema from the SQL migration files
   - Search the codebase with Grep / Glob
6. Write findings to the specified output location
7. Summarize what was discovered

---

### Rules

- This command produces DOCUMENTATION only
- Do NOT modify source code files
- Do NOT create branches or commits
- Output should go to `docs/` unless the prompt file specifies otherwise
- Use subagents (via the Agent tool) for thorough exploration if needed
