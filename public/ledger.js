/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Need to require this to use ledger libs
// https://github.com/LedgerHQ/ledgerjs/issues/332
require('babel-polyfill');
const Transport = require('@ledgerhq/hw-transport-node-hid').default;
const constants = require('./constants');

const maxLedgerBuffer = 255;
const ledgerCLA = 0xe0;

class Ledger {
  
  static parseLedgerError(e) {
    if (e.name && e.name === 'TransportStatusError') {
      switch (e.statusCode) {
        case 0x6985:
          return {status: e.statusCode, message: 'Request denied by user on Ledger'};
        case 0x6a86:  // WRONG_P1P2
        case 0x6a87:  // SW_WRONG_DATA_LENGTH
        case 0x6d00:  // SW_INS_NOT_SUPPORTED
        case 0x6e00:  // SW_CLA_NOT_SUPPORTED
        case 0xb000:  // SW_WRONG_RESPONSE_LENGTH
        case 0xb001:  // SW_DISPLAY_BIP32_PATH_FAIL
        case 0xb002:  // SW_DISPLAY_ADDRESS_FAIL
        case 0xb003:  // SW_DISPLAY_AMOUNT_FAIL
        case 0xb004:  // SW_WRONG_TX_LENGTH
        case 0xb005:  // SW_TX_PARSING_FAIL
        case 0xb006:  // SW_TX_HASH_FAIL
        case 0xb007:  // SW_BAD_STATE
        case 0xb008:  // SW_SIGNATURE_FAIL
        case 0xb009:  // SW_INVALID_TX
        default:
          return {status: e.statusCode, message: 'Error communicating with Ledger'};
      }
    }
    return e;
  }

  static formatPathData(index) {
    pathArr = [
      44  + 0x80000000, // 44'
      280 + 0x80000000, // 280'
      0   + 0x80000000, // 0'
      0,                // 0
    ];
    if (index !== undefined) {
      pathArr.push(index);
    }
    const buffer = Buffer.alloc(21);
    buffer[0] = 5;
    pathArr.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return buffer;
  }

  constructor() {
    // Electron main window to send command to renderer process
    this.mainWindow = null;
    // Ledger transport
    this.transport = null;
    // Timeout for ledger connection
    this.timeout = 10000;
    // If hathor app is opened on ledger
    this.hathorAppOpened = false;

    this.subscriptor = Transport.listen({
      next: e => {
        if (e.type === 'add') {
          // We get this event when any app is opened on Ledger (Bitcoin, Ethereum, Hathor, etc). We have
          // the getVersion call next to make sure we're on the Hathor app.
          this.getVersion();
        } else if (e.type === 'remove') {
          // This is called in some situations
          // - Usb disconnected
          // - When user quits an app
          // - When user opens an app
          if (this.hathorAppOpened) {
            // If was opened we schedule a setTimeout
            // to lock the wallet in case it continues closed
            setTimeout(() => {
              if (!this.hathorAppOpened) {
                this.mainWindow.webContents.send("ledger:closed");
              }
            }, 3000);
          }
          this.hathorAppOpened = false;
          // If we don't close it when changing the app we get an error
          // https://github.com/LedgerHQ/ledgerjs/issues/22
          this.transport.device.close();
          this.transport = null;
        }
      },
      error: error => {},
      complete: () => {}
    })

    // Ledger commands
    this.commands = {
      'VERSION': 0x03,
      'ADDRESS': 0x04,
      'PUBLIC_KEY_DATA': 0x05,
      'SEND_TX': 0x06,
    }

    // Queue of commands to send to ledger so we don't send them in paralel
    this.sendQueue = [];

    // If can send command to ledger
    this.canSend = true;
  }

  /**
   * Send a command to ledger if there's anything on the send queue.
   */
  checkSendQueue = () => {
    if (this.sendQueue.length > 0) {
      const { transport, command, p1, p2, data, resolve, reject } = this.sendQueue.shift();
      const promise = transport.send(ledgerCLA, command, p1, p2, data);
      promise.then((response) => {
        resolve(response);
      }, (error) => {
        reject(error);
      }).finally(() => {
        this.checkSendQueue();
      });
    } else {
      this.canSend = true;
    }
  }

  /**
   * Send the command to Ledger. If we're still waiting for the response of a previous
   * command, add this to the send queue.
   *
   * @return {Promise} Promise resolved when there's a response from Ledger
   */
  sendToLedgerOrQueue = (transport, command, p1, p2, data) => {
    if (this.canSend) {
      this.canSend = false;
      const promise = transport.send(ledgerCLA, command, p1, p2, data);
      promise.finally(() => {
        this.checkSendQueue();
      });
      return promise;
    } else {
      const promise = new Promise((resolve, reject) => {
        const element = {
          transport,
          command,
          p1,
          p2,
          data,
          resolve,
          reject
        }
        this.sendQueue.push(element);
      });
      return promise;
    }
  }

  /**
   * Get ledger transport in case was already set and create one if is null
   *
   * @return {Promise} Promise resolved when transport is created with the transport as parameter. Promise might be rejected in case of error creating the transport
   */
  getTransport = () => {
    if (this.transport) {
      return Promise.resolve(this.transport);
    }

    const promiseMethod = new Promise((resolve, reject) => {
      const promise = Transport.create(this.timeout, this.timeout);
      promise.then((transport) => {
        this.transport = transport;
        this.methods = [
          "getVersion",
          "getPublicKeyData",
          "checkAddress",
          "sendTx",
          "getSignatures"
        ];
        this.transport.decorateAppAPIMethods(this, this.methods, "HTR");
        resolve(transport);
      }, (e) => {
        reject(Ledger.parseLedgerError(e));
      });
    });
    return promiseMethod;
  }

  /**
   * Check if user is in the Hathor app on ledger
   *
   * @return {Promise} Promise resolved if user is with Hathor app opened on ledger with version as parameter. Might be rejected if user is not with Hathor opened.
   */
  getVersion = async () => {
    let result;
    try {
      const transport = await this.getTransport();
      result = await this.sendToLedgerOrQueue(transport, this.commands.VERSION, 0, 0);
    } catch (e) {
      throw Ledger.parseLedgerError(e);
    }

    if (result.length === 8 && result.slice(0, 3).equals(Buffer.from(constants.ledgerVersionMagicStringBuffer))) {
      this.hathorAppOpened = true;
      return result;
    } else {
      throw new Error('Invalid Hathor app.');
    }
  }

  /**
   * Get public key data that will be used to generate the xpub
   *
   * @return {Promise} Promise resolved with the data as parameter. Might be rejected in case of an error or if the user denies access.
   */
  getPublicKeyData = async () => {
    try {
      const transport = await this.getTransport();
      return await this.sendToLedgerOrQueue(transport, this.commands.PUBLIC_KEY_DATA, 0, 0, Ledger.formatPathData());
    } catch (e) {
      throw Ledger.parseLedgerError(e);
    }
  }

  /**
   * Send address command so ledger can show specific address for user to validate
   *
   * @param {Buffer} index Address index to be shown on ledger
   *
   * @return {Promise} Promise resolved when user validates that the address is correct.
   */
  checkAddress = async (index) => {
    try {
      const transport = await this.getTransport();
      const result = await this.sendToLedgerOrQueue(transport, this.commands.ADDRESS, 0, 0, Ledger.formatPathData(index));
      return result;
    } catch (e) {
      throw Ledger.parseLedgerError(e);
    }
  }

  /**
   * Send transaction to ledger
   *
   * Maximum data that can be transferred to ledger is 255 bytes
   *
   * p1 = 0
   * p2 = remaining calls
   * Eg: 3 rounds (data has 612 bytes)
   * p1 p2 data
   * 0  2  255 bytes
   * 0  1  255 bytes
   * 0  0  102 bytes
   *
   * @param {Object} data Data to send to Ledger (change_output_info + sighash_all)
   *
   * @return {Promise} Promise resolved when data is received
   */
  sendTx = async (data) => {
    let offset = 0;
    try {
      const transport = await this.getTransport();
      let i=0;
      while (offset < data.length) {
        const toSend = data.slice(offset, offset + maxLedgerBuffer);
        await this.sendToLedgerOrQueue(transport, this.commands.SEND_TX, 0, i++, toSend);
        offset += maxLedgerBuffer;
      }
    } catch (e) {
      throw Ledger.parseLedgerError(e);
    }
  }

  /**
   * Get signatures
   *
   * We request the signature for each input
   *
   * p1 = 1
   * p2 = *
   * data = priv key index (4 bytes)
   * ## done, no more signatures needed
   * p1 = 2
   * p2 = *
   * data = none
   *
   * @param {Object} indexes Index of the key we want the data signed with
   *
   * @return {Promise} Promise resolved when all signatures are received. Promise is resolved with an array with the signatures.
   */
  getSignatures = async (indexes) => {
    const values = [];
    try {
      const transport = await this.getTransport();
      for (const index of indexes) {
        const value = await this.sendToLedgerOrQueue(transport, this.commands.SEND_TX, 1, 0, Ledger.formatPathData(index));
        // we remove the last 2 bytes as they're just control bytes from ledger to say if
        // the communication was successful or not
        values.push(value.slice(0, -2));
      }
      return values;
    } catch (e) {
      throw Ledger.parseLedgerError(e);
    } finally {
      const transport = await this.getTransport();
      await transport.send(ledgerCLA, this.commands.SEND_TX, 2, 0);
    }
  }
}

const instance = new Ledger();

module.exports = {
  instance
}
