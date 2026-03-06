# Reducers PRD

**Source Report:** [reports/reducers-bad-practices.md](../reports/reducers-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Fix parameter name bug in onNanoContractDetailLoaded (index.js: 1485)
- [ ] Critical: Move side effects (lockWalletPromise) from reducer to saga (index.js: 707)
- [ ] High: Complete migration of hardcoded action types to types.* constants (index.js: 317-374)
- [ ] High: Add null checks for array access and undefined data fields (index.js: 547-552, 1223)
- [ ] Medium: Replace Object.assign pattern with spread operator (index.js: 318-375)
- [ ] Medium: Replace delete operator with destructuring or spread (index.js: 643, 651, 1090)
- [ ] Medium: Add action payload validation and type checking
- [ ] Low: Standardize return styles (implicit vs explicit) across reducer functions
