/**
 * Layer 1 — Unit (selector / state-consuming function).
 *
 * Reference smoke test for a function that reads from the Redux state shape.
 * Demonstrates how to construct a test state object (using `getInitialState`
 * from src/test-utils) and pass it to a pure selector.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L1 (selector)".
 */

import {
  selectIsOnline,
  selectSelectedToken,
  selectTokenByUid,
} from '../../utils/selectors';
import { getInitialState } from '../../test-utils';

describe('utils/selectors — state-consuming functions', () => {
  describe('selectIsOnline', () => {
    it('reads `isOnline` from the initial state (false on startup)', () => {
      // Whatever the reducer's `initialState` says is the source of truth.
      // The test does NOT hard-code `false` — it reads through getInitialState
      // so a future reducer change is reflected automatically.
      const state = getInitialState();
      expect(selectIsOnline(state)).toBe(state.isOnline);
    });

    it('honours overrides on the preloaded state', () => {
      const state = { ...getInitialState(), isOnline: true };
      expect(selectIsOnline(state)).toBe(true);
    });
  });

  describe('selectSelectedToken', () => {
    it('returns the NATIVE_TOKEN_UID by default', () => {
      // The centralized wallet-lib mock pins NATIVE_TOKEN_UID to '00'; the
      // initial state's `selectedToken` is sourced from that constant.
      const state = getInitialState();
      expect(selectSelectedToken(state)).toBe('00');
    });
  });

  describe('selectTokenByUid', () => {
    it('finds a registered token by uid', () => {
      const TST = { uid: 'token-uid-tst', name: 'Test', symbol: 'TST', version: 1 };
      const state = { ...getInitialState(), tokens: [TST] };
      expect(selectTokenByUid(state, 'token-uid-tst')).toEqual(TST);
    });

    it('returns undefined when the uid is not registered', () => {
      const state = { ...getInitialState(), tokens: [] };
      expect(selectTokenByUid(state, 'token-uid-missing')).toBeUndefined();
    });
  });
});
