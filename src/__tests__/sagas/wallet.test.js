/**
 * Layer 2 — Integration (saga + reducer via expectSaga + provide).
 *
 * Reference smoke test demonstrating the canonical redux-saga-test-plan
 * pattern: dispatch the action under test, inject mocked effects with
 * `provide()`, assert on the saga's return value and on any dispatched
 * effects.
 *
 * The saga under test (`isAtomicSwapEnabled`) is the simplest in
 * src/sagas/wallet.js — it calls one helper saga and returns its result.
 * Future feature-area PRs add larger sagas (startWallet, send-tx flows,
 * Nano Contract registration, …) following the same shape.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L2 (saga)".
 */

import { expectSaga } from 'redux-saga-test-plan';
import * as matchers from 'redux-saga-test-plan/matchers';
import { isAtomicSwapEnabled } from '../../sagas/wallet';
import { checkForFeatureFlag } from '../../sagas/helpers';

describe('sagas/wallet — isAtomicSwapEnabled', () => {
  it('returns true when the atomic swap feature flag is on', () => {
    return expectSaga(isAtomicSwapEnabled)
      .provide([
        // `.call.fn()` matches any call to the named saga regardless of args,
        // so a future change to the feature-flag constant doesn't break the
        // test. Tests that need to assert on the specific constant use
        // `matchers.call(checkForFeatureFlag, 'exact-flag-name')` instead.
        [matchers.call.fn(checkForFeatureFlag), true],
      ])
      .returns(true)
      .run();
  });

  it('returns false when the atomic swap feature flag is off', () => {
    return expectSaga(isAtomicSwapEnabled)
      .provide([
        [matchers.call.fn(checkForFeatureFlag), false],
      ])
      .returns(false)
      .run();
  });
});
