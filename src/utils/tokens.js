/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { newTokens } from '../actions/index';
import wallet from './wallet';
import hathorLib from '@hathor/wallet-lib';


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
   * @return {Object} edited token
   *
   * @memberof Tokens
   * @inner
   */
  editToken(uid, name, symbol) {
    const tokens = hathorLib.tokens.editToken(uid, name, symbol);
    store.dispatch(newTokens({tokens, uid}));
    return {uid, name, symbol};
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

  /**
   * Save new tokens array and selected token after a new one
   *
   * @param {string} uid Token uid added
   *
   * @memberof Tokens
   * @inner
   */
  saveTokenRedux(uid) {
    const storageTokens = hathorLib.storage.getItem('wallet:tokens');
    store.dispatch(newTokens({tokens: storageTokens, uid: uid}));
  },

  /**
   * Returns the deposit amount in 'pretty' format
   *
   * @param {number} mintAmount Amount of tokens to mint
   *
   * @memberof Tokens
   * @inner
   */
  getDepositAmount(mintAmount) {
    if (mintAmount) {
      const amountValue = wallet.decimalToInteger(mintAmount);
      const deposit = hathorLib.helpers.getDepositAmount(amountValue);
      return hathorLib.helpers.prettyValue(deposit);
    } else {
      return 0;
    }
  },
}

export default tokens;
