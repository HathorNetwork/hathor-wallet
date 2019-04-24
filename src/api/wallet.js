/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import createRequestInstance from './axiosInstance';
import { SEND_TOKENS_TIMEOUT } from '../constants';

/**
 * Api calls for wallet
 *
 * @namespace ApiWallet
 */

const walletApi = {
  /**
   * Get address history from passed addresses
   *
   * @param {Array} addresses Array of addresses to search for the history
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiWallet
   * @inner
   */
  getAddressHistory(addresses, resolve) {
    const data = {addresses};
    return createRequestInstance(resolve).get('thin_wallet/address_history', {'params': data}).then((res) => {
      resolve(res.data)
    }, (res) => {
      return Promise.reject(res);
    });
  },

  /**
   * Execute method to send tokens
   *
   * @param {string} txHex Complete transaction serialized in hexadecimal
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiWallet
   * @inner
   */
  sendTokens(txHex, resolve) {
    const postData = {tx_hex: txHex};
    return createRequestInstance(resolve, SEND_TOKENS_TIMEOUT).post('thin_wallet/send_tokens', postData).then((res) => {
      resolve(res.data)
    }, (res) => {
      return Promise.reject(res);
    });
  },

};

export default walletApi;
