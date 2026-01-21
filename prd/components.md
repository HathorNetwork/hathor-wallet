# Components PRD

**Source Report:** [reports/components-bad-practices.md](../reports/components-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Add missing dependencies to useEffect/useLayoutEffect arrays (AddressList.js: 81, InputNumber.js: 143, ModalConfirmTestnet.js: 17, ModalError.js: 19, NetworkSettingsForm.js: 57, PinPad.js: 115)
- [ ] Critical: Replace jQuery DOM manipulation with React state/refs for modals and animations (GlobalModal.js: 141-145, ModalAddManyTokens.js: 47-71, ModalAddToken.js: 44-68, ModalBackupWords.js: 52-81, ModalConfirm.js: 25-36, RequestError.js: 130-145, SendTokensOne.js: 157-160, OutputsWrapper.js: 48-51, TxData.js: 301, ModalAddressQRCode.js: 60-65)
- [ ] High: Remove console.log/error statements in production (InputNumber.js: 42, TxData.js: 546)
- [ ] High: Memoize props functions with useCallback to prevent re-renders (AddressList.js: 165, CopyButton.js: 22, ChoosePassword.js: 51, ChoosePin.js: 41, Navigation.js: 41, NetworkSettingsForm.js: 92, PinPasswordWrapper.js: 55, TokenBar.js: 158)
- [ ] High: Replace array index as key in lists with unique identifiers (ModalBackupWords.js: 230, SendTokensOne.js: 177, TxData.js: 506, 895)
- [ ] High: Extract inline object/array creation to useMemo or constants (GlobalModal.js: 225, SendTokensOne.js: 177, ModalBackupWords.js: 264-290)
- [ ] Medium: Implement proper cleanup for event listeners in effects (NetworkSettingsForm.js: 47-57, WalletAddress.js: 49-57)
- [ ] Medium: Fix direct state/instance variable mutations (TxData.js: 88, ModalBackupWords.js: 160-162, SendTokensOne.js: 81-83)
- [ ] Low: Split large components into smaller, focused components (TxData.js, ModalBackupWords.js, GlobalModal.js)
