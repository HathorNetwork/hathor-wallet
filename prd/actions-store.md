# Actions and Store PRD

**Source Report:** [reports/actions-store-bad-practices.md](../reports/actions-store-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Move functions and promises from Redux state to sagas (actions/index.js: 245, 250, 875-878, 888-891, 901-904, 914-917, 927-930, 940-943)
- [ ] Critical: Re-enable Redux Toolkit serialization check with targeted ignores (store/index.js: 19-23)
- [ ] High: Move hardcoded action type strings to constants object (actions/index.js: 127, 132, 137, 142, 147, 152, 157, 162, 167, 172, 177, 182, 187, 194, 202, 209, 215, 220, 225, 230, 235, 240, 245, 250, 255, 262)
- [ ] High: Make actions FSA-compliant by moving root properties to payload (actions/index.js: 268-272, 278-282, 287-290, 304-308, 355-360, 395-398)
- [ ] Medium: Remove redundant redux-thunk middleware (store/index.js: 9, 15)
- [ ] Medium: Complete migration to types syntax in reducers (reducers/index.js: 377)
- [ ] Low: Modernize state update pattern to use spread instead of Object.assign (reducers/index.js: 318-375)
- [ ] Low: Standardize inconsistent payload structures across actions
