/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';

/**
 * Methods to handle Nano Contracts
 *
 * @namespace Nano Contracts
 */

const nanoContracts = {
  /**
   * Get registered nano contracts from the wallet instance.
   * @param {HathorWallet} wallet
   * @returns {Promise<Record<string, NanoContractData>>}
   */
  async getRegisteredNanoContracts(wallet) {
    // redux-saga generator magic does not work well with the "for await..of" syntax
    // The asyncGenerator is not recognized as an iterable and it throws an exception
    // So we must iterate manually, awaiting each "next" call
    const iterator = wallet.storage.getRegisteredNanoContracts();
    const nanoContracts = {};
    let next = await iterator.next();
    while (!next.done) {
      const ncData = next.value;
      nanoContracts[ncData.ncId] = { ...ncData, history: [], historyMetadata: {} };
      next = await iterator.next();
    }

    return nanoContracts;
  },

  /**
   * Check if transaction is a nano contract create tx
   *
   * @param {Transaction} tx
   * @returns {boolean}
   */
  isNanoContractCreate(tx) {
    return tx.version === hathorLib.constants.NANO_CONTRACTS_VERSION && tx.nc_method === hathorLib.constants.NANO_CONTRACTS_INITIALIZE_METHOD;
  },
}

export default nanoContracts;
