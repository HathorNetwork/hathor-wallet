# Screens PRD

**Source Report:** [reports/screens-bad-practices.md](../reports/screens-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Memoize functions passed to children with useCallback (SendTokens.js: 522-525, 535-553, ReownConnect.js: 44, 88, 110, 146, LockedWallet.js: 120, Settings.js: 289)
- [ ] Critical: Fix missing dependencies in useEffect hooks (LoadingAddresses.js: 68, NFTList.js: 76, UnknownTokens.js: 79, Wallet.js: 92, 103, TransactionDetail.js: 120, LoadWalletFailed.js: 37)
- [ ] Critical: Replace React.createRef() calls during render with useRef() (NFTList.js: 104, UnknownTokens.js: 104, Welcome.js: 34, SendTokens.js: 77, 485)
- [ ] Critical: Replace jQuery DOM manipulation/animations with React state (ChoosePassphrase.js: 113-117, CreateNFT.js: 227-231, CreateToken.js: 198-203, UnknownTokens.js)
- [ ] High: Extract inline object/array creation in props to useMemo or constants (CustomTokens.js: 45-50, CreateNFT.js: 281-284, CreateToken.js: 251-257, Settings.js: 151-168, 176-193, Welcome.js: 86-92)
- [ ] High: Extract inline style objects to CSS or constants (CreateNFT.js: 327, CreateToken.js: 288, Wallet.js: 327)
- [ ] High: Memoize render functions within components (ChoosePassphrase.js: 121, 132, UnknownTokens.js: 203-247, Wallet.js: 209-216, 235-255)
- [ ] Medium: Refactor complex state update logic (TransactionDetail.js: 73-91, Wallet.js: 108-125)
- [ ] Medium: Avoid hardcoded object creation in hot paths (SendTokens.js: 188)
- [ ] Low: Split large screen components into smaller sub-components
