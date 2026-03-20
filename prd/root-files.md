# Root Files PRD

**Source Report:** [reports/root-files-bad-practices.md](../reports/root-files-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Fix error state logic bug in ErrorWrapper (ErrorWrapper.js: 46)
- [ ] High: Add missing dependencies to useEffect hooks (App.js: 182, ErrorWrapper.js: 33)
- [ ] High: Replace jQuery modal manipulation with React state (ErrorWrapper.js: 47)
- [ ] High: Add null checks for DOM elements and context (App.js: 113, index.js: 37)
- [ ] High: Move hardcoded secrets and URLs to .env files (constants.js: 80, 210-211, 310)
- [ ] Medium: Wrap application with root-level Error Boundary (index.js)
- [ ] Medium: Document global polyfills for Buffer and process (index.js: 22-26)
- [ ] Medium: Create ROUTES constant object to replace hardcoded strings (App.js)
- [ ] Medium: Simplify and extract logic from complex nested components (App.js: 275-330)
- [ ] Medium: Remove duplicate CSS imports (ErrorWrapper.js: 14-17)
- [ ] Low: Add PropTypes or TypeScript definitions
- [ ] Low: Organize constants into logical groupings and document magic numbers
- [ ] Low: Add proper error handling and recovery to storage operations (storage.js)
