/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Redux selectors.
 *
 * Reference module created in PR 1 of the auto-qa work to establish the
 * pattern for selector co-location and unit testing. As feature-area PRs
 * extract selector logic out of `mapStateToProps` blocks in connected
 * components, the extracted selectors land here (or in a sibling file
 * scoped to that feature area) so they can be tested without rendering
 * the whole component tree.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L1 (selector)".
 */

/**
 * Whether the wallet is currently online (websocket + API connection healthy).
 * @param {object} state Root Redux state
 * @returns {boolean}
 */
export const selectIsOnline = (state) => state.isOnline;

/**
 * UID of the token currently selected in the UI. Defaults to
 * NATIVE_TOKEN_UID until the user picks a different token.
 * @param {object} state Root Redux state
 * @returns {string}
 */
export const selectSelectedToken = (state) => state.selectedToken;

/**
 * Look up a registered token by its UID.
 * @param {object} state Root Redux state
 * @param {string} uid Token UID to look up
 * @returns {object|undefined} The token record, or `undefined` if it is not
 *   registered for the current wallet.
 */
export const selectTokenByUid = (state, uid) =>
  state.tokens.find((token) => token.uid === uid);
