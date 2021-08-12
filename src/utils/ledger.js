/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { IPC_RENDERER } from '../constants';
import hathorLib from '@hathor/wallet-lib';

/**
 * Error thrown when we get an error from Ledger
 *
 * @memberof Ledger
 * @inner
 */
export class LedgerError extends Error {}

const formatPathData = (index) => {
  const pathArr = [
    44  + 0x80000000, // 44'
    280 + 0x80000000, // 280'
    0   + 0x80000000, // 0'
    0,                // 0
  ];
  if (index !== undefined) {
    pathArr.push(index);
  }
  const buffer = Buffer.alloc(1+(4*pathArr.length));
  buffer[0] = pathArr.length;
  pathArr.forEach((element, index) => {
    buffer.writeUInt32BE(element, 1 + 4 * index);
  });
  return buffer;
};

let ledger = null;

if (IPC_RENDERER) {
  /**
   * Methods to interact with ledger
   *
   * @namespace Ledger
   */
  ledger = {
    /**
     * Get app version from ledger
     *
     * @memberof Ledger
     * @inner
     */
    getVersion() {
      IPC_RENDERER.send("ledger:getVersion");
    },

    /**
     * Get xpub data from ledger
     *
     * @memberof Ledger
     * @inner
     */
    getPublicKeyData() {
      IPC_RENDERER.send("ledger:getPublicKeyData");
    },

    /**
     * Show address from index (in the path) on ledger
     *
     * @param {number} index Path index of address
     *
     * @memberof Ledger
     * @inner
     */
    checkAddress(index) {
      IPC_RENDERER.send("ledger:checkAddress", index);
    },

    /**
     * Send tx data to ledger
     *
     * @param {Object} data Transaction data
     * @param {number} changeIndex Index of the change output. -1 in case there is no change
     * @param {number} changeKeyIndex Index of address of the change output
     *
     * @memberof Ledger
     * @inner
     */
    sendTx(data, changeIndex, changeKeyIndex) {
      // first assemble data to be sent
      const arr = [];
      if (changeIndex > -1) {
        const changeBuffer = formatPathData(changeKeyIndex)
        // encode the bit indicating existence of change and change path length on first byte
        arr.push(hathorLib.transaction.intToBytes(0x80 | changeBuffer[0], 1))
        // change output index on the second
        arr.push(hathorLib.transaction.intToBytes(changeIndex, 1))
        // Change key path of the address
        arr.push(changeBuffer.slice(1));
      } else {
        // no change output
        arr.push(hathorLib.transaction.intToBytes(0, 1));
      }

      const initialData = Buffer.concat(arr);
      const dataBytes = hathorLib.transaction.dataToSign(data);
      const dataToSend = Buffer.concat([initialData, dataBytes]);

      IPC_RENDERER.send("ledger:sendTx", dataToSend);
    },

    /**
     * Get tx signatures from ledger
     *
     * @param {Object} data Transaction data
     *
     * @memberof Ledger
     * @inner
     */
    getSignatures(data, keys) {
      // send key indexes as 4-byte integers
      const arr = [];
      for (const input of data.inputs) {
        const index = keys[input.address].index;
        arr.push(index);
      }
      IPC_RENDERER.send("ledger:getSignatures", arr);
    },
  }
}

export default ledger;
