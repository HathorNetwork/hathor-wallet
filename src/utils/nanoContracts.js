/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';
import { get } from 'lodash';

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

  /**
   * Format a nano contract field value based on its type
   * 
   * @param {string} field Field name
   * @param {any} value Field value to format
   * @param {Object} blueprintInformation Blueprint information containing field types
   * @param {number} decimalPlaces Number of decimal places for Amount formatting
   * @returns {string|number|null} Formatted value
   */
  formatNCField(field, value, blueprintInformation, decimalPlaces) {
    if (value === undefined) {
      // Error getting field
      // Since we are using the attributes from the blueprint information API to
      // get the state, we know that the fields exist. If value is undefined, it
      // means they are dict fields, which we should just show the types of them for now
      return get(blueprintInformation.attributes, field);
    }

    if (value == null) {
      // If value is null or undefined, we show empty string
      return null;
    }

    // Get type of value but removing possible optional mark (?) to format the value correctly
    const fieldType = blueprintInformation.attributes[field]?.replace('?', '');

    return this.formatNCArgValue(value, fieldType, decimalPlaces);
  },

  /**
   * Format a nano contract argument value
   * 
   * @param {any} value Argument value
   * @param {string} argType Argument type from blueprint information
   * @param {number} decimalPlaces Number of decimal places for Amount formatting
   * @returns {string} Formatted value as string
   */
  formatNCArgValue(value, argType, decimalPlaces) {
    // If no specific type provided, just convert to string
    if (!argType) {
      return typeof value === 'string' ? value : value.toString();
    }

    // Handle optional types
    const typeWithoutOptional = argType.replace('?', '');
    
    // Format based on argument type
    if (typeWithoutOptional === 'Timestamp') {
      return hathorLib.dateUtils.parseTimestamp(value);
    }
    
    if (typeWithoutOptional === 'Amount') {
      return hathorLib.numberUtils.prettyValue(value, decimalPlaces);
    }

    // Default string representation
    return typeof value === 'string' ? value : value.toString();
  }
}

export default nanoContracts;
