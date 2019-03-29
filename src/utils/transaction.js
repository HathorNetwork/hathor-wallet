import { OP_GREATERTHAN_TIMESTAMP, OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG, OP_PUSHDATA1 } from '../opcodes';
import { DECIMAL_PLACES, DEFAULT_TX_VERSION, MAX_OUTPUT_VALUE_32, P2PKH_BYTE, P2SH_BYTE, MAX_NONCE } from '../constants';
import { HDPrivateKey, crypto, encoding, util } from 'bitcore-lib';
import { createHash } from 'crypto';
import AddressError from './errors';
import dateFormatter from './date';
import wallet from './wallet';
import walletApi from '../api/wallet';
import txApi from '../api/txApi';
import buffer from 'buffer';
import Long from 'long';
import _ from 'lodash';
import PowWorker from "./PowWorker.worker.js";

/**
 * Transaction utils with methods to serialize, create and handle transactions
 *
 * @namespace Transaction
 */

const transaction = {
  /**
   * Transform int to bytes
   *
   * @param {number} number Integer to be transformed to bytes
   * @param {number} bytes How many bytes this number uses
   *
   * @return {Buffer} number in bytes
   * @memberof Transaction
   * @inner
   */
  intToBytes(number, bytes) {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    if (bytes === 1) {
      // byteOffset = 0; isLittleEndian = false
      view.setUint8(0, number, false);
    } else if (bytes === 2) {
      // byteOffset = 0; isLittleEndian = false
      view.setUint16(0, number, false);
    } else if (bytes === 4) {
      view.setUint32(0, number, false);
    }
    return buffer.Buffer.from(arr);
  },

  /**
   * Transform signed int to bytes (1, 2, or 4 bytes)
   *
   * @param {number} number Integer to be transformed to bytes
   * @param {number} bytes How many bytes this number uses
   *
   * @return {Buffer} number in bytes
   * @memberof Transaction
   * @inner
   */
  signedIntToBytes(number, bytes) {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    if (bytes === 1) {
      // byteOffset = 0; isLittleEndian = false
      view.setInt8(0, number, false);
    } else if (bytes === 2) {
      // byteOffset = 0; isLittleEndian = false
      view.setInt16(0, number, false);
    } else if (bytes === 4) {
      view.setInt32(0, number, false);
    } else if (bytes === 8) {
      // In case of 8 bytes I need to handle the int with a Long lib
      let long = Long.fromNumber(number, false);
      arr = long.toBytesBE();
    }
    return buffer.Buffer.from(arr);
  },

  /**
   * Transform float to bytes
   *
   * @param {number} number Integer to be transformed to bytes
   * @param {number} bytes How many bytes this number uses
   *
   * @return {Buffer} number in bytes
   * @memberof Transaction
   * @inner
   */
  floatToBytes(number, bytes) {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    if (bytes === 8) {
      // byteOffset = 0; isLitteEndian = false
      view.setFloat64(0, number, false);
    }
    return buffer.Buffer.from(arr);
  },

  /**
   * Decode address in base58 to bytes
   *
   * @param {string} address Address in base58
   *
   * @return {Buffer} address in bytes
   * @memberof Transaction
   * @inner
   */
  decodeAddress(address) {
    try {
      return encoding.Base58.decode(address);
    } catch (e) {
      throw new AddressError('Invalid base58 address');
    }
  },

  /**
   * Validate if the address is valid
   * 
   * 1. Address must have 25 bytes
   * 2. Address checksum must be valid
   * 3. Address first byte must match one of the options for P2PKH or P2SH
   *
   * @param {string} address Address in base58
   * @param {Buffer} addressBytes Address in bytes
   *
   * @throws {AddressError} Will throw an error if address is not valid
   *
   * @return {boolean}
   * @memberof Transaction
   * @inner
   */
  validateAddress(address, addressBytes) {
    const errorMessage = `Invalid address: ${address}`;
    // Validate address length
    if (addressBytes.length !== 25) {
      throw new AddressError(errorMessage);
    }

    // Validate address checksum
    const checksum = addressBytes.slice(-4);
    const addressSlice = addressBytes.slice(0, -4);
    const correctChecksum = this.getChecksum(addressSlice);
    if (!util.buffer.equals(checksum, correctChecksum)) {
      throw new AddressError(errorMessage);
    }

    // Validate version byte. Should be the p2pkh or p2sh
    const firstByte = addressBytes[0];
    if (firstByte !== P2PKH_BYTE && firstByte !== P2SH_BYTE) {
      throw new AddressError(errorMessage);
    }
    return true;
  },
  
  /**
   * Return the checksum of the bytes passed
   * Checksum is calculated as the 4 first bytes of the double sha256
   * 
   * @param {Buffer} bytes Data from where the checksum is calculated
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  getChecksum(bytes) {
    return crypto.Hash.sha256sha256(bytes).slice(0, 4);
  },

  /**
   * Push data to the stack checking if need to add the OP_PUSHDATA1 opcode
   * We push the length of data and the data
   * In case the data has length > 75, we need to push the OP_PUSHDATA1 before the length
   * We always push bytes
   * 
   * @param {Array} stack Stack of bytes from the script
   * @param {Buffer} data Data to be pushed to stack
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  pushDataToStack(stack, data) {
    // In case data has length bigger than 75, we need to add a pushdata opcode
    if (data.length > 75) {
      stack.push(OP_PUSHDATA1);
    }
    stack.push(this.intToBytes(data.length, 1));
    stack.push(data);
  },

  /**
   * Create output script
   * 
   * @param {string} address Address in base58
   * @param {number} [timelock] Timelock in timestamp
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  createOutputScript(address, timelock) {
    let arr = [];
    let addressBytes = this.decodeAddress(address);
    if (this.validateAddress(address, addressBytes)) {
      let addressHash = addressBytes.slice(1, -4);
      if (timelock) {
        let timelockBytes = this.intToBytes(timelock, 4);
        this.pushDataToStack(arr, timelockBytes);
        arr.push(OP_GREATERTHAN_TIMESTAMP);
      }
      arr.push(OP_DUP);
      arr.push(OP_HASH160);
      // addressHash has a fixed size of 20 bytes, so no need to push OP_PUSHDATA1
      arr.push(this.intToBytes(addressHash.length, 1));
      arr.push(addressHash);
      arr.push(OP_EQUALVERIFY);
      arr.push(OP_CHECKSIG);
      return util.buffer.concat(arr);
    }
  },

  /**
   * Create input data
   * 
   * @param {Buffer} signature Input signature
   * @param {Buffer} publicKey Input public key
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  createInputData(signature, publicKey) {
    let arr = [];
    this.pushDataToStack(arr, signature);
    this.pushDataToStack(arr, publicKey);
    return util.buffer.concat(arr);
  },

  /**
   * Return transaction data to sign in inputs
   * 
   * @param {Object} txData Object with inputs and outputs {'inputs': [{'tx_id', 'index', 'token'}], 'outputs': ['address', 'value', 'timelock', 'tokenData'], 'tokens': [uid, uid2]}
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  dataToSign(txData) {
    let arr = []
    // Tx version
    arr.push(this.intToBytes(DEFAULT_TX_VERSION, 2))
    // Len inputs
    arr.push(this.intToBytes(txData.inputs.length, 1))
    // Len outputs
    arr.push(this.intToBytes(txData.outputs.length, 1))
    // Len tokens
    arr.push(this.intToBytes(txData.tokens.length, 1))

    for (const token of txData.tokens) {
      arr.push(new encoding.BufferReader(token).buf);
    }

    for (let inputTx of txData.inputs) {
      arr.push(util.buffer.hexToBuffer(inputTx.tx_id));
      arr.push(this.intToBytes(inputTx.index, 1));
      // Input data will be fixed to 0 for now
      arr.push(this.intToBytes(0, 2));
    }

    for (let outputTx of txData.outputs) {
      arr.push(this.outputValueToBytes(outputTx.value));
      // Token data
      arr.push(this.intToBytes(outputTx.tokenData, 1));

      let outputScript = this.createOutputScript(outputTx.address, outputTx.timelock);
      arr.push(this.intToBytes(outputScript.length, 2));
      arr.push(outputScript);
    }
    return util.buffer.concat(arr);
  },

  /*
   * Add input data to each input of tx data
   *
   * @param {Object} data Object with inputs and outputs {'inputs': [{'tx_id', 'index', 'token'}], 'outputs': ['address', 'value', 'timelock']}
   * @param {Buffer} dataToSign data to sign the transaction in bytes
   * @param {string} pin PIN to decrypt the private key
   *
   * @return {Object} data
   *
   * @memberof Transaction
   * @inner
   */
  signTx(data, dataToSign, pin) {
    const hashbuf = this.getDataToSignHash(dataToSign);

    const walletData = wallet.getWalletData();
    if (walletData === null) {
      return data;
    }
    const keys = walletData.keys;
    for (const input of data.inputs) {
      const index = keys[input.address].index;
      input['data'] = this.getSignature(index, hashbuf, pin);
    }
    return data;
  },

  /*
   * Get signature of an input based in the private key
   *
   * @param {number} index Index of the address to get the private key
   * @param {Buffer} hash hashed data to sign the transaction
   * @param {string} pin PIN to decrypt the private key
   *
   * @return {Buffer} input data
   *
   * @memberof Transaction
   * @inner
   */
  getSignature(index, hash, pin) {
    const encryptedPrivateKey = JSON.parse(localStorage.getItem('wallet:accessData')).mainKey;
    const privateKeyStr = wallet.decryptData(encryptedPrivateKey, pin);
    const key = HDPrivateKey(privateKeyStr)
    const derivedKey = key.derive(index);
    const privateKey = derivedKey.privateKey;

    const sig = crypto.ECDSA.sign(hash, privateKey, 'little').set({
      nhashtype: crypto.Signature.SIGHASH_ALL
    });
    return this.createInputData(sig.toDER(), derivedKey.publicKey.toBuffer());
  },

  /*
   * Execute hash of the data to sign
   *
   * @param {Buffer} dataToSign data to sign the transaction in bytes
   *
   * @return {Buffer} data to sign hashed
   *
   * @memberof Transaction
   * @inner
   */
  getDataToSignHash(dataToSign) {
    const hashbuf = crypto.Hash.sha256sha256(dataToSign);
    return new encoding.BufferReader(hashbuf).readReverse();
  },

  /**
   * Calculate the minimum tx weight
   * 
   * @param {Object} txData Object with inputs and outputs
   * {
   *  'inputs': [{'tx_id', 'index'}],
   *  'outputs': ['address', 'value', 'timelock'],
   *  'version': 1,
   *  'weight': 0,
   *  'nonce': 0,
   *  'timestamp': 1,
   * }
   *
   * @return {number} Minimum weight calculated (float)
   * @memberof Transaction
   * @inner
   */
  calculateTxWeight(txData) {
    let txSize = this.txToBytes(txData).length;

    // XXX Parents are calculated only in the server but we need to consider them here
    // Parents are always two and have 32 bytes each
    txSize += 64

    let sumOutputs = 0;
    for (let output of txData.outputs) {
      sumOutputs += output.value;
    }

    // We need to take into consideration the decimal places because it is inside the amount.
    // For instance, if one wants to transfer 20 HTRs, the amount will be 2000.
    const amount = sumOutputs / (10 ** DECIMAL_PLACES);

    const txWeightConstants = this.getTransactionWeightConstants();

    let weight = (txWeightConstants.txWeightCoefficient * Math.log2(txSize) + 4 / (1 + txWeightConstants.txMinWeightK / amount) + 4);

    // Make sure the calculated weight is at least the minimum
    weight = Math.max(weight, txWeightConstants.txMinWeight)
    // FIXME precision difference between backend and frontend (weight (17.76246721531992) is smaller than the minimum weight (17.762467215319923))
    return weight + 1e-6;
  },

  /**
   * Complete the txData
   *
   * Add weight, nonce, version, and timestamp to the txData
   * 
   * @param {Object} txData Object with inputs and outputs
   * {
   *  'inputs': [{'tx_id', 'index'}],
   *  'outputs': ['address', 'value', 'timelock'],
   * }
   *
   * @memberof Transaction
   * @inner
   */
  completeTx(incompleteTxData) {
    incompleteTxData['weight'] = 0;
    incompleteTxData['nonce'] = 0;
    incompleteTxData['version'] = DEFAULT_TX_VERSION;
    incompleteTxData['timestamp'] = dateFormatter.now();
    let minimumWeight = this.calculateTxWeight(incompleteTxData);
    incompleteTxData['weight'] = minimumWeight;
  },

  txToFundsBytes(txData) {
    let arr = []
    // Serialize first the funds part
    //
    // Tx version
    arr.push(this.intToBytes(DEFAULT_TX_VERSION, 2))
    // Len tokens
    arr.push(this.intToBytes(txData.tokens.length, 1))
    // Len inputs
    arr.push(this.intToBytes(txData.inputs.length, 1))
    // Len outputs
    arr.push(this.intToBytes(txData.outputs.length, 1))

    for (const token of txData.tokens) {
      arr.push(new encoding.BufferReader(token).buf);
    }

    for (let inputTx of txData.inputs) {
      arr.push(util.buffer.hexToBuffer(inputTx.tx_id));
      arr.push(this.intToBytes(inputTx.index, 1));
      arr.push(this.intToBytes(inputTx.data.length, 2));
      arr.push(inputTx.data);
    }

    for (let outputTx of txData.outputs) {
      arr.push(this.outputValueToBytes(outputTx.value));
      // Token data
      arr.push(this.intToBytes(outputTx.tokenData, 1));

      let outputScript = this.createOutputScript(outputTx.address, outputTx.timelock);
      arr.push(this.intToBytes(outputScript.length, 2));
      arr.push(outputScript);
    }

    return arr;
  },

  txToGraphBytes(txData) {
    let arr = [];
    // Weight is a float with 8 bytes
    arr.push(this.floatToBytes(txData.weight, 8));
    // Timestamp
    arr.push(this.intToBytes(txData.timestamp, 4))
    // Len parents
    if (txData.parents) {
      arr.push(this.intToBytes(txData.parents.length, 1))
      for (const parent of txData.parents) {
        arr.push(util.buffer.hexToBuffer(parent));
      }
    } else {
      // Parents are calculated in the backend
      arr.push(this.intToBytes(0, 1))
    }
    return arr;
  },

  /**
   * Serialize tx to bytes
   *
   * @param {Object} txData Object with inputs and outputs
   * {
   *  'inputs': [{'tx_id', 'index', 'token'}],
   *  'outputs': ['address', 'value', 'timelock', 'tokenData'],
   *  'tokens': [uid, uid2],
   *  'version': 1,
   *  'weight': 0,
   *  'nonce': 0,
   *  'timestamp': 1,
   * }
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  txToBytes(txData) {
    const fundsArr = this.txToFundsBytes(txData);
    const graphArr = this.txToGraphBytes(txData);

    let arr = [...fundsArr, ...graphArr];

    // Add nonce in the end
    arr.push(this.intToBytes(txData.nonce, 4));
    return util.buffer.concat(arr);
  },

  /**
   * Get the bytes from the output value
   * If value is above the maximum for 32 bits we get from 8 bytes, otherwise only 4 bytes
   *
   * @param {number} value Output value
   *
   * @return {Buffer}
   *
   * @memberof Transaction
   * @inner
   */
  outputValueToBytes(value) {
    if (value > MAX_OUTPUT_VALUE_32) {
      return this.signedIntToBytes(-value, 8);
    } else {
      return this.signedIntToBytes(value, 4);
    }
  },

  /**
   * Save txMinWeight and txWeightCoefficient to localStorage
   *
   * @param {number} txMinWeight Minimum allowed weight for a tx (float)
   * @param {number} txWeightCoefficient Coefficient to be used when calculating tx weight (float)
   *
   * @memberof Transaction
   * @inner
   */
  updateTransactionWeightConstants(txMinWeight, txWeightCoefficient, txMinWeightK) {
    localStorage.setItem('wallet:txMinWeight', txMinWeight);
    localStorage.setItem('wallet:txWeightCoefficient', txWeightCoefficient);
    localStorage.setItem('wallet:txMinWeightK', txMinWeightK);
  },

  /**
   * Return the transaction weight constants that was saved using a response from the backend
   *
   * @return {Object} Object with the parameters {'txMinWeight', 'txWeightCoefficient', 'txMinWeightK'}
   *
   * @memberof Transaction
   * @inner
   */
  getTransactionWeightConstants() {
    return {'txMinWeight': parseFloat(localStorage.getItem('wallet:txMinWeight')),
            'txWeightCoefficient': parseFloat(localStorage.getItem('wallet:txWeightCoefficient')),
            'txMinWeightK': parseFloat(localStorage.getItem('wallet:txMinWeightK'))}
  },

  getTarget(txData) {
    return 2**(256 - txData.weight) - 1;
  },

  getFundsHash(txData) {
    let fundsHash = createHash('sha256');
    const fundsBytes = util.buffer.concat(this.txToFundsBytes(txData));
    return fundsHash.update(fundsBytes).digest();
  },

  getGraphHash(txData) {
    let graphHash = createHash('sha256');
    const graphBytes = util.buffer.concat(this.txToGraphBytes(txData));
    return graphHash.update(graphBytes).digest();
  },

  /**
   * Creates a new ArrayBuffer from concatenating two existing ones
   *
   * @param {ArrayBuffer | null} buffer1 The first buffer.
   * @param {ArrayBuffer | null} buffer2 The second buffer.
   * @return {ArrayBuffer | null} The new ArrayBuffer created out of the two.
   */
  concatArrayBuffers(buffer1, buffer2) {
    if (!buffer1) {
      return buffer2;
    } else if (!buffer2) {
      return buffer1;
    }

    let tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
  },

  getHeaderWithoutNonce(txData) {
    const graphHash = this.getGraphHash(txData);
    const fundsHash = this.getFundsHash(txData);
    return this.concatArrayBuffers(graphHash, fundsHash);
  },

  getPowPart1(txData) {
    let hash = createHash('sha256');
    hash.update(this.getHeaderWithoutNonce(txData));
    return hash;
  },

  getPowPart2(pow1, nonce) {
    const digest = pow1.update(this.intToBytes(nonce, 4)).digest();
    const hash = createHash('sha256');
    const finalDigest = hash.update(digest).digest();
    // SHA256D gets the hash in little-endian format. Reverse the bytes to get the big-endian representation.
    _.reverse(finalDigest);
    return finalDigest;
  },

  calculatePow(txData, powPart1, lastTime, target) {
    const now = dateFormatter.now();
    if ((now - lastTime) > 2) {
      txData.timestamp = now;
      powPart1 = this.getPowPart1(txData);
      lastTime = now;
      txData.nonce = 0;
    }

    const result = this.getPowPart2(_.cloneDeep(powPart1), txData.nonce);
    console.log(txData.nonce, txData.timestamp);
    console.log(parseInt(util.buffer.bufferToHex(result), 16), target);
    if (parseInt(util.buffer.bufferToHex(result), 16) < target) {
      return { result, lastTime, txData, powPart1 };
    }
    txData.nonce += 1;
    return { result: null, lastTime, txData, powPart1 };
  },

  callCalculatePow(txData, powPart1, resolve, lastTime, target) {
    setTimeout(() => {
      const result = this.calculatePow(txData, powPart1, lastTime, target);
      if (result.result === null && txData.nonce < MAX_NONCE) {
        this.callCalculatePow(result.txData, result.powPart1, resolve, result.lastTime, target);
      } else {
        resolve(result.result);
      }
    }, 0);
  },

  resolve(txData) {
    let powPart1 = this.getPowPart1(txData);
    let lastTime = txData.timestamp;
    txData.nonce = 0;
    const target = this.getTarget(txData);
    const promise = new Promise((resolve, reject) => {
      this.callCalculatePow(txData, powPart1, resolve, lastTime, target);
    });
    return promise;
  },

  resolveWebWorker(txData) {
    const promise = new Promise((resolve, reject) => {
      console.log('Calling web worker');
      const worker = new PowWorker();
      worker.addEventListener('message', event => {
        console.log('Web worker replied', event);
        resolve(event.data);
      });
      console.log('Posting message to web worker');
      worker.postMessage(txData);
    });
    return promise;
  },

  resolvePowAndSend(data) {
    const txBytes = transaction.txToBytes(data);
    const txHex = util.buffer.bufferToHex(txBytes);
    const promise = new Promise((resolve, reject) => {
      walletApi.getParents(txHex, (response) => {
        if (response.success) {
          data.parents = response.parents.split(',')
          const promise = this.resolveWebWorker(data);
          promise.then((result) => {
            if (result === null) {
              reject('Failed to resolve pow');
            }
            console.log('Worker', result);
            console.log('Data', data);
            data.nonce = result.nonce;
            data.timestamp = result.timestamp;
            const newTxBytes = transaction.txToBytes(data);
            const newTxHex = util.buffer.bufferToHex(newTxBytes);
            txApi.pushTx(newTxHex, false, (response) => {
              if (response.success) {
                resolve();
              } else {
                reject(response.message);
              }
            }, (e) => {
              // Error in request
              reject(e.message);
            });
          });
        } else {
          reject(response.message);
        }
      }, (e) => {
        // Error in request
        reject(e.message);
      });
    });
    return promise;
  },

  sendTx(data) {
    const txBytes = transaction.txToBytes(data);
    const txHex = util.buffer.bufferToHex(txBytes);
    const promise = new Promise((resolve, reject) => {
      walletApi.sendTokens(txHex, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(response.message);
        }
      }, (e) => {
        // Error in request
        reject(e.message);
      });
    });
    return promise;
  },
}

export default transaction;
