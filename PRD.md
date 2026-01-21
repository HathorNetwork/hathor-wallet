# Hathor Wallet Refactoring PRD

This PRD aggregates the technical debt and bad practices identified in the analysis reports.

## CRITICAL WORKFLOW
1.  **Start with Infrastructure**: Complete the [Test Environment Setup](./prd/infrastructure.md) first.
2.  **Fork for Refactoring**: All subsequent category tasks MUST be forked from the stable branch containing the test infrastructure (`feat/test-infrastructure`).
3.  **Branching Strategy**: For each PRD/Category, open a new branch (e.g., `feat/actions-store`), push it, and open a PR to the infrastructure branch (`feat/test-infrastructure`).
4.  **Test-Driven**: No refactoring should be committed without corresponding tests.

## Task Sources
The tasks are organized into specialized files in the `prd/` directory:

- [x] [Infrastructure (PREREQUISITE)](./prd/infrastructure.md)
- [ ] [Actions and Store](./prd/actions-store.md)
- [ ] [Components](./prd/components.md)
- [ ] [Modules and General](./prd/modules.md)
- [ ] [Reducers](./prd/reducers.md)
- [ ] [Screens](./prd/screens.md)
- [ ] [Sagas](./prd/sagas.md)
- [ ] [Utils](./prd/utils.md)
- [ ] [Root Files](./prd/root-files.md)
- [ ] [Nano Contract and Reown](./prd/nano-reown.md)
- [ ] [Tokens and Atomic Swap](./prd/tokens-atomic-swap.md)

