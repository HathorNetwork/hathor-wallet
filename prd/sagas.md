# Sagas PRD

**Source Report:** [reports/sagas-bad-practices.md](../reports/sagas-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Fix typo in property name 'falure' -> 'failure' (featureToggle.js: 78)
- [ ] Critical: Define missing 'newWsServer' variable (networkSettings.js: 39)
- [ ] Critical: Fix double dispatch yield put(dispatch(...)) (wallet.js: 281)
- [ ] High: Remove console.log/debug statements (featureToggle.js, wallet.js, tokens.js, nanoContract.js)
- [ ] High: Properly yield blocking operations with yield call() (tokens.js: 365, nanoContract.js: 365)
- [ ] High: Move hardcoded error codes to constants (reown.js: 442+)
- [ ] Medium: Replace async/await with Redux-Saga effects (reown.js: 594, 831)
- [ ] Medium: Add cancellation checks to infinite loops (nanoContract.js: 180)
- [ ] Medium: Remove unnecessary parenthesis in yield put (atomicSwap.js: 149)
- [ ] Low: Fix typos in comments and improve error context in actions
- [ ] Low: Standardize logging using the logger module instead of console
