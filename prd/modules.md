# Modules and General PRD

**Source Report:** [reports/modules-bad-practices.md](../reports/modules-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Fix double dispatch bug in wallet saga (sagas/wallet.js: 281)
- [ ] High: Remove all console.log/error/debug statements in production (sagas/wallet.js, sagas/helpers.js, sagas/featureToggle.js, sagas/tokens.js, screens/StartHardwareWallet.js, components/GlobalModal.js, components/InputNumber.js)
- [ ] High: Refactor global singletons to use dependency injection or context (modules/wallet.js, modules/reown.js, modules/unleash.js)
- [ ] High: Move hardcoded magic numbers to constants.js (sagas/featureToggle.js: 43-44, sagas/tokens.js: 36-37, components/GlobalModal.js: 150, 155, 175)
- [ ] Medium: Fix memory leaks by adding proper cleanup to event listeners and timers (components/GlobalModal.js, components/InputNumber.js, screens/StartHardwareWallet.js, components/ModalAddressQRCode.js)
- [ ] Medium: Address security concerns by moving secrets to .env (SENTRY_DSN, REOWN_PROJECT_ID in constants.js)
- [ ] Medium: Fix inconsistent error handling and silent errors (sagas/helpers.js: 105, components/InputNumber.js: 42, utils/helpers.js: 318, sagas/reown.js: 442, storage.js: 218-235)
- [ ] Medium: Resolve potential circular dependencies (utils/helpers.js -> store -> reducers, sagas/wallet.js -> helpers -> store)
- [ ] Low: Add JSDoc documentation and type annotations (modules/reown.js, modules/wallet.js, modules/unleash.js)
- [ ] Low: Properly await Promises in async operations (utils/helpers.js: 116-122)
- [ ] Low: Move translation function usage after initialization (constants.js: 46)
- [ ] Low: Address all TODO/FIXME/XXX comments across the codebase
