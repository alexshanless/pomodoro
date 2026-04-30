# Complete Action

1. Run a final review to ensure everything is complete
2. Run `npm run build` and confirm it passes — do not proceed if the build fails
3. **Ask the user for permission before committing** (per `context/ai-interaction.md`)
4. Stage all changes
5. Commit with a conventional commit message based on the feature (`feat:`, `fix:`, `chore:`, etc.) — never include "Generated with Claude" in the commit message
6. Push the branch to origin
7. Merge into main (only after the user confirms)
8. Switch back to main branch
9. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals and Notes sections
   - Set Status to "Not Started"
10. Add feature summary to the END of History (one-liner)
11. Ask the user whether to delete the feature branch
