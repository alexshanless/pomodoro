# Complete Action

1. Run a final review to ensure everything is complete
2. Run `npm run build` and confirm it passes — do not proceed if the build fails
3. **Ask the user for permission before committing** (per `context/ai-interaction.md`)
4. Reset `current-feature.md` (this happens *before* the commit so the reset is included in it):
   - Change H1 back to `# Current Feature`
   - Clear the Goals and Notes sections
   - Set Status to "Not Started"
   - Append a one-liner summary of the just-finished feature to the END of History
5. Stage all changes (including the cleared `current-feature.md`)
6. Commit with a conventional commit message based on the feature (`feat:`, `fix:`, `chore:`, etc.) — never include "Generated with Claude" in the commit message
7. Push the branch to origin
8. Merge into main (only after the user confirms) — per project convention, open a PR with `gh pr create` rather than merging locally
9. Switch back to main branch
10. Ask the user whether to delete the feature branch
