# Tokens and Atomic Swap Components PRD

**Source Report:** [reports/components-tokens-atomicswap-bad-practices.md](../reports/components-tokens-atomicswap-bad-practices.md)

## Common Directives
- [ ] **Test-Driven Refactoring**: For every task, create or update unit tests to verify the fix and prevent regressions.

## Tasks
- [ ] Critical: Replace jQuery animations with React state for visibility (TokenMint.js: 10, 120, 122)
- [ ] Critical: Replace array index as key in lists with unique identifiers (ProposalBalanceTable.js: 45, ModalAtomicSend.js: 118)
- [ ] High: Replace deprecated string refs with React.createRef() (TokenAction.js: 60)
- [ ] High: Add missing dependencies to useEffect (ExternalChangeModal.js: 16, ModalAtomicReceive.js: 77, ModalAtomicSend.js: 285)
- [ ] High: Fix async validation bug by adding await (ModalAtomicReceive.js: 65)
- [ ] Medium: Wrap inline handlers and callbacks with useCallback (ExternalChangeModal.js: 24, ModalAtomicSend.js: 120, 125)
- [ ] Medium: Extract render functions and memoize them (TokenMelt.js: 101, TokenMint.js: 134-160, ProposalBalanceTable.js: 26-56, ModalAtomicReceive.js: 26-30)
- [ ] Medium: Memoize array filter operations with useMemo (ProposalBalanceTable.js: 19-23)
- [ ] Low: Extract inline style objects to constants (TokenMint.js: 145)
- [ ] Low: Use boolean for defaultChecked and avoid hardcoded IDs (ModalAtomicSend.js: 340)
