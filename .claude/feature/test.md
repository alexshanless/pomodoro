# Test Action

1. Read current-feature.md to understand what was implemented
2. Identify custom hooks (`src/hooks/`) and utility functions (`src/utils/`) added/modified for this feature
3. Check if tests already exist for these functions
4. For functions without tests that have testable logic, write unit tests:
   - Use **Jest** + `@testing-library/react` (already wired up via `react-scripts`)
   - Co-locate as `*.test.js` / `*.test.jsx` next to the unit under test
   - Focus on hooks and utilities (component tests should test user behavior, not implementation details)
   - Test happy path and error cases
   - Do not write tests just to write them. Use your best judgement
5. Run `npm test -- --watchAll=false` to verify all tests pass
6. Report test coverage for the new feature code