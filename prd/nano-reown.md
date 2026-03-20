# Nano Contract and Reown Components PRD

**Source Report:** [reports/components-nano-reown-bad-practices.md](../reports/components-nano-reown-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Add missing dependencies to useEffect arrays (ModalChangeAddress.js: 38-52, ModalConfirmUnregister.js: 15-20, ModalSelectAddressToSignData.js: 44-52, ModalSelectAddressToSignTx.js: 26-33, ModalRegisterNanoContract.js: 38-50, ReownModal.js: 32-34, FeedbackModal.js: 43-45, GenericErrorFeedbackModal.js: 24-26)
- [ ] Critical: Replace jQuery DOM manipulation with React state/refs (ModalChangeAddress.js: 39-44, ModalConfirmUnregister.js: 16-19, ModalSelectAddressToSignData.js: 45-51, ModalSelectAddressToSignTx.js: 27-32, ModalRegisterNanoContract.js: 39-49)
- [ ] High: Replace array index as key in lists with unique identifiers (GetBalanceModal.js: 41-59, SignedDataDisplay.js: 23-26, SendTransactionModal.js: 130, 166)
- [ ] High: Wrap prop functions with useCallback (ModalChangeAddress.js, ModalSelectAddressToSignData.js, ModalSelectAddressToSignTx.js, BaseNanoContractModal.js, SendTransactionModal.js)
- [ ] High: Remove console statements in production (CreateTokenRequestData.js: 73, NanoContractActions.js: 95, ErrorDetailModal.js: 41, CreateTokenModal.js: 39)
- [ ] Medium: Extract inline object/array creation to useMemo or constants (ModalChangeAddress.js, ModalSelectAddressToSignData.js, BaseNanoContractModal.js, DAppInfo.js, CreateTokenRequestData.js, ErrorDetailModal.js)
- [ ] Medium: Split large components into smaller ones (BaseNanoContractModal.js, SendTransactionModal.js, NanoContractHistory.js)
- [ ] Medium: Add missing PropTypes to components
- [ ] Medium: Memoize expensive computations with useMemo (NanoContractActions.js, SendTransactionModal.js, BaseNanoContractModal.js)
- [ ] Medium: Replace hardcoded strings with shared constants (NanoContractHistory.js, BaseNanoContractModal.js)
