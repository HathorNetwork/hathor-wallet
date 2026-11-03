/**
 * Layer 1 — Unit (pure function).
 *
 * Reference smoke test demonstrating the simplest Jest pattern: import,
 * call, assert. No mocks. No state. No async. New utility functions follow
 * this shape until they grow a dependency that needs scaffolding.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L1 (utility)".
 */

import tokens from '../../utils/tokens';

describe('utils/tokens — pure functions', () => {
  describe('getNFTFee', () => {
    it('returns 1n — the HTR cost in cents for creating an NFT', () => {
      expect(tokens.getNFTFee()).toBe(1n);
    });

    it('is referentially stable across calls', () => {
      // Pure: no input, no internal state, no side effects → identical
      // return value every call. Locking this in here is what makes the
      // function safely callable from render paths without memoization.
      expect(tokens.getNFTFee()).toBe(tokens.getNFTFee());
    });
  });
});
