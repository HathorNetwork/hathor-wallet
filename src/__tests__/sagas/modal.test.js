/**
 * Layer 2 — Integration (saga with module-level state, *ForTesting reset).
 *
 * Reference smoke test demonstrating the `*ForTesting` hygiene pattern: a
 * saga module keeps state outside the Redux store (here, the `modalContext`
 * registration) and tests must restore the "freshly-loaded" state between
 * cases or earlier tests' setup leaks forward.
 *
 * The pattern:
 *   1. The module exports a named function `<noun>ForTesting` that resets the
 *      private state to its initial value.
 *   2. Tests call it in `beforeEach`. Production code does not call it.
 *   3. The export is small (one line in this case), conspicuously marked as
 *      test-only, and reviewed as such — never removed by future refactors.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L2 (saga state reset)" and
 * § Production code changes expected.
 */

import { expectSaga } from 'redux-saga-test-plan';
import {
  modalSaga,
  setModalContext,
  clearModalContextForTesting,
} from '../../sagas/modal';
import { types } from '../../actions';

describe('sagas/modal — module-state hygiene via *ForTesting', () => {
  beforeEach(() => {
    // Restore the module-level `modalContext = null` that the saga sees on a
    // fresh app load. Without this reset, a prior test's setModalContext()
    // call would persist and break the no-context branch below.
    clearModalContextForTesting();
  });

  it('logs and exits early when no modal context is registered', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    return expectSaga(modalSaga)
      .dispatch({
        type: types.SHOW_GLOBAL_MODAL,
        payload: { modalType: 'pin', modalProps: {} },
      })
      .silentRun()
      .then(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Modal context not found'),
        );
        errorSpy.mockRestore();
      });
  });

  it('calls the registered context when SHOW_GLOBAL_MODAL is dispatched', () => {
    const showModal = jest.fn();
    const hideModal = jest.fn();
    setModalContext({ showModal, hideModal });

    return expectSaga(modalSaga)
      .dispatch({
        type: types.SHOW_GLOBAL_MODAL,
        payload: { modalType: 'pin', modalProps: { onSuccess: () => {} } },
      })
      .silentRun()
      .then(() => {
        expect(showModal).toHaveBeenCalledTimes(1);
        expect(showModal).toHaveBeenCalledWith('pin', {
          onSuccess: expect.any(Function),
        });
      });
  });
});
