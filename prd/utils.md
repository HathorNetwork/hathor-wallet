# Utils PRD

**Source Report:** [reports/utils-bad-practices.md](../reports/utils-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Fix shadowed variable isAllAuthority (helpers.js: 313)
- [ ] High: Remove console.error/log statements (wallet.js: 127, 192, helpers.js: 318)
- [ ] High: Address all TODO/FIXME/XXX technical debt comments (wallet.js, ledger.js, atomicSwap.js)
- [ ] High: Add input validation to public utility functions (nanoContracts.js, atomicSwap.js, helpers.js, i18n.js, wallet.js)
- [ ] Medium: Implement proper error handling for async operations and Promise.all (wallet.js: 151-159, 178, atomicSwap.js: 233-239, ledger.js: 177-185)
- [ ] Medium: Fix potential race conditions by awaiting promises (helpers.js: 120)
- [ ] Medium: Extract magic numbers to constants (ledger.js, nanoContracts.js, helpers.js)
- [ ] Medium: Sanitize inputs in JSX-returning functions to prevent XSS (nanoContracts.js: 96, i18n.js: 33)
- [ ] Low: Add missing JSDoc comments and return types (nanoContracts.js, atomicSwap.js, storage.js)
- [ ] Low: Fix redundant conditional logic and improve error recovery (helpers.js, wallet.js, atomicSwap.js)
