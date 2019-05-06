/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { newTokens } from '../actions/index';
import hathorLib from 'hathor-wallet-utils';


/**
 * Methods to create and handle tokens
 *
 * @namespace Tokens
 */

const tokens = {
  /**
   * Add a new token to the localStorage and redux
   *
   * @param {string} uid Token uid
   * @param {string} name Token name
   * @param {string} symbol Token synbol
   *
   * @memberof Tokens
   * @inner
   */
  addToken(uid, name, symbol) {
    const tokens = hathorLib.tokens.addToken(uid, name, symbol);
    store.dispatch(newTokens({tokens, uid: uid}));
  },

  /**
   * Edit token name and symbol. Save in localStorage and redux
   *
   * @param {string} uid Token uid to be edited
   * @param {string} name New token name
   * @param {string} synbol New token symbol
   *
   * @memberof Tokens
   * @inner
   */
  editToken(uid, name, symbol) {
    const tokens = hathorLib.tokens.editToken(uid, name, symbol);
    store.dispatch(newTokens({tokens, uid}));
  },

  /**
   * Unregister token from localStorage and redux
   *
   * @param {string} uid Token uid to be unregistered
   *
   * @memberof Tokens
   * @inner
   */
  unregisterToken(uid) {
    const tokens = hathorLib.tokens.unregisterToken(uid);
    store.dispatch(newTokens({tokens, uid: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid}));
  },
}

export default tokens;
