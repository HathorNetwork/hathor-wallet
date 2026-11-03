/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Returns the root reducer's initial state by calling it with `undefined`
 * state and a Redux init action. Used by reducer tests (the three-contracts
 * shape assertion) and by createTestStore as the base for preloaded state.
 *
 * Refs RFC 0001 (auto-qa) § Helpers.
 */

import rootReducer from '../reducers/index';

/**
 * @returns {object} The initial state produced by the root reducer.
 */
export function getInitialState() {
  return rootReducer(undefined, { type: '@@INIT' });
}

export default getInitialState;
