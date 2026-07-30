/**
 * Layer 1 — Unit (reducer, three-contracts pattern).
 *
 * Reference smoke test for the root reducer. Three contracts are pinned
 * independently, on purpose:
 *
 *   1. Initial state shape. The keys this reducer initializes are part of
 *      the wallet's effective public surface — any code path that does
 *      `useSelector(state => state.<key>)` relies on them existing. The shape
 *      contract is the safety net for the eventual RTK-slices migration.
 *
 *   2. Action type literals. The exact strings (not the names of the
 *      constants) are what dispatched actions carry on the wire. A rename in
 *      actions/index.js that drops a literal surfaces here as a clear test
 *      failure instead of as a silent no-op at runtime.
 *
 *   3. Behavior. Dispatching an action produces the expected new state. This
 *      is the bread-and-butter of feature-area PR reducer tests — every new
 *      action gets a behavior test that lives next to the action's handler.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L1 (reducer)" and
 * § Reference-level explanation > Layer 1.
 */

import rootReducer from '../../reducers/index';
import { types, setNavigateTo } from '../../actions';
import { getInitialState } from '../../test-utils';

describe('reducers/index — wallet root reducer', () => {
  // ----- Contract 1: initial state shape -----
  describe('initial state shape', () => {
    // The minimum top-level keys the wallet's UI and sagas read from state.
    // Kept alphabetically sorted; add new keys here when a reducer is taught
    // to initialize one. Removing a key from this list without removing it
    // from the reducer is fine; removing one from the reducer without removing
    // it from this list fails the test, which is the point.
    const expectedKeys = [
      'addressMode',
      'allTokens',
      'height',
      'isOnline',
      'isVersionAllowed',
      'lastSharedAddress',
      'lastSharedIndex',
      'navigateTo',
      'network',
      'selectedToken',
      'serverInfo',
      'tokens',
      'tokensBalance',
      'tokensHistory',
      'useWalletService',
      'walletState',
    ];

    const state = getInitialState();

    it.each(expectedKeys)('initializes top-level key `%s`', (key) => {
      expect(state).toHaveProperty(key);
    });
  });

  // ----- Contract 2: action type literals -----
  describe('action type literals', () => {
    // A small representative slice of the action-type catalog. Feature-area
    // PRs add their own action-type contract tests in their own *.test.js
    // file; this set covers the actions exercised by the behavior tests below.
    const expected = {
      SET_NAVIGATE_TO: 'SET_NAVIGATE_TO',
      WALLET_RESET: 'WALLET_RESET',
      START_WALLET_REQUESTED: 'START_WALLET_REQUESTED',
      START_WALLET_SUCCESS: 'START_WALLET_SUCCESS',
      START_WALLET_FAILED: 'START_WALLET_FAILED',
    };

    it.each(Object.entries(expected))(
      'types.%s === %j',
      (name, literal) => {
        expect(types[name]).toBe(literal);
      },
    );
  });

  // ----- Contract 3: behavior -----
  describe('behavior — SET_NAVIGATE_TO', () => {
    it('updates state.navigateTo from the action payload', () => {
      const initial = getInitialState();
      const next = rootReducer(
        initial,
        setNavigateTo('/wallet/atomic_swap/proposal/abc', true),
      );

      expect(next.navigateTo).toEqual({
        route: '/wallet/atomic_swap/proposal/abc',
        replace: true,
      });
    });

    it('defaults `replace` to false when the action creator omits it', () => {
      const initial = getInitialState();
      const next = rootReducer(initial, setNavigateTo('/wallet'));

      expect(next.navigateTo).toEqual({ route: '/wallet', replace: false });
    });

    it('does not mutate other slices of state', () => {
      const initial = getInitialState();
      const next = rootReducer(initial, setNavigateTo('/wallet'));

      // Spot-check a handful of unrelated slices.
      expect(next.tokens).toBe(initial.tokens);
      expect(next.isOnline).toBe(initial.isOnline);
      expect(next.selectedToken).toBe(initial.selectedToken);
    });
  });
});
