import { OP_GREATERTHAN_TIMESTAMP, OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG, OP_PUSHDATA1 } from '../opcodes';
import { DECIMAL_PLACES, DEFAULT_TX_VERSION, MAX_OUTPUT_VALUE_32 } from '../constants';
import { HDPrivateKey, crypto, encoding, util } from 'bitcore-lib';
import AddressError from './errors';
import dateFormatter from './date';
import wallet from './wallet';
import buffer from 'buffer';
import Long from 'long';

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
    return encoding.Base58.decode(address);
  },

  /**
   * Validate if the address is valid
   * 
   * 1. Address must have 25 bytes
   * 2. Address checksum must be valid
   *
   * @param {Buffer} addressBytes Address in bytes
   *
   * @throws {AddressError} Will throw an error if address is not valid
   *
   * @return {boolean}
   * @memberof Transaction
   * @inner
   */
  validateAddress(addressBytes) {
    // Validate address length
    if (addressBytes.length !== 25) {
      throw new AddressError('Address should have 25 bytes');
    }

    // Validate address checksum
    let checksum = addressBytes.slice(-4);
    let addressSlice = addressBytes.slice(0, -4);
    let correctChecksum = this.getAddressChecksum(addressSlice);
    if (!util.buffer.equals(checksum, correctChecksum)) {
      throw new AddressError('Invalid checksum for address');
    }
    return true;
  },
  
  /**
   * Return the checksum of the address
   * 
   * @param {Buffer} addressSlice Part of the address in bytes to calculate the checksum
   *
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  getAddressChecksum(addressSlice) {
    return crypto.Hash.sha256sha256(addressSlice).slice(0, 4);
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
    if (this.validateAddress(addressBytes)) {
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
   * @param {Object} txData Object with inputs and outputs {'inputs': [{'tx_id', 'index'}], 'outputs': ['address', 'value', 'timelock']}
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
    // XXX For now we will have only Hathor token, so tokens array will be empty
    arr.push(this.intToBytes(0, 1))

    for (let inputTx of txData.inputs) {
      arr.push(util.buffer.hexToBuffer(inputTx.tx_id));
      arr.push(this.intToBytes(inputTx.index, 1));
      // Input data will be fixed to 0 for now
      arr.push(this.intToBytes(0, 2));
    }

    for (let outputTx of txData.outputs) {
      arr.push(this.outputValueToBytes(outputTx.value));
      // Token data for now will be always 0
      arr.push(this.intToBytes(0, 1));

      let outputScript = this.createOutputScript(outputTx.address, outputTx.timelock);
      arr.push(this.intToBytes(outputScript.length, 2));
      arr.push(outputScript);
    }
    return util.buffer.concat(arr);
  },

  /*
   * Add input data to each input of tx data
   *
   * @param {Object} data Object with inputs and outputs {'inputs': [{'tx_id', 'index'}], 'outputs': ['address', 'value', 'timelock']}
   * @param {Buffer} dataToSign data to sign the transaction in bytes
   * @param {string} tokenUID UID of the token to check existence
   * @param {string} pin PIN to decrypt the private key
   *
   * @return {Object} data
   *
   * @memberof Transaction
   * @inner
   */
  updateInputData(data, dataToSign, tokenUID, pin) {
    let hashbuf = crypto.Hash.sha256sha256(dataToSign);
    hashbuf = new encoding.BufferReader(hashbuf).readReverse();

    let savedData = JSON.parse(localStorage.getItem('wallet:data'));
    let unspentTxs = savedData.unspentTxs;
    for (let input of data.inputs) {
      let objectKey = [input.tx_id, input.index];
      if (!wallet.checkUnspentTxExists(objectKey, tokenUID)) {
        // Input does not exist in unspent txs
        return data;
      }
      let addressTarget = unspentTxs[tokenUID][objectKey].address;
      let encryptedPrivateKey = savedData.keys[addressTarget].privkey;
      let privateKeyStr = wallet.decryptData(encryptedPrivateKey, pin);
      let key = HDPrivateKey(privateKeyStr)
      let privateKey = key.privateKey;

      let sig = crypto.ECDSA.sign(hashbuf, privateKey, 'little').set({
        nhashtype: crypto.Signature.SIGHASH_ALL
      });
      let inputData = this.createInputData(sig.toDER(), key.publicKey.toBuffer());
      input['data'] = inputData;
    }
    return data;
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

    let minWeight = parseFloat(localStorage.getItem('wallet:txMinWeight'));
    let minWeightCoefficient = parseFloat(localStorage.getItem('wallet:txWeightCoefficient'));

    // We need to remove the decimal places because it is in the amount
    // If you want to transfer 20 hathors, the amount will be 2000, that's why we reduce the log of decimal places
    let weight = (minWeightCoefficient * Math.log2(txSize) + Math.log2(sumOutputs) - DECIMAL_PLACES * Math.log2(10) + 0.5);

    // Make sure the calculated weight is at least the minimum
    weight = Math.max(weight, minWeight)
    return weight
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
    incompleteTxData['timestamp'] = dateFormatter.dateToTimestamp(new Date());
    let minimumWeight = this.calculateTxWeight(incompleteTxData);
    incompleteTxData['weight'] = minimumWeight;
  },

  /**
   * Serialize tx to bytes
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
   * @return {Buffer}
   * @memberof Transaction
   * @inner
   */
  txToBytes(txData) {
    let arr = []
    // Serialize first the funds part
    //
    // Tx version
    arr.push(this.intToBytes(DEFAULT_TX_VERSION, 2))
    // Len tokens
    // XXX For now we will have only Hathor token, so tokens array will be empty
    arr.push(this.intToBytes(0, 1))
    // Len inputs
    arr.push(this.intToBytes(txData.inputs.length, 1))
    // Len outputs
    arr.push(this.intToBytes(txData.outputs.length, 1))

    // TODO Add tokens serialization here

    for (let inputTx of txData.inputs) {
      arr.push(util.buffer.hexToBuffer(inputTx.tx_id));
      arr.push(this.intToBytes(inputTx.index, 1));
      arr.push(this.intToBytes(inputTx.data.length, 2));
      arr.push(inputTx.data);
    }

    for (let outputTx of txData.outputs) {
      arr.push(this.outputValueToBytes(outputTx.value));
      // Token data for now will be always 0
      arr.push(this.intToBytes(0, 1));

      let outputScript = this.createOutputScript(outputTx.address, outputTx.timelock);
      arr.push(this.intToBytes(outputScript.length, 2));
      arr.push(outputScript);
    }

    // Now serialize the graph part
    //
    // Weight is a float with 8 bytes
    arr.push(this.floatToBytes(txData.weight, 8));
    // Timestamp
    arr.push(this.intToBytes(txData.timestamp, 4))
    // Len parents (parents will be calculated in the backend)
    arr.push(this.intToBytes(0, 1))

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
  updateTransactionWeightConstants(txMinWeight, txWeightCoefficient) {
    localStorage.setItem('wallet:txMinWeight', txMinWeight);
    localStorage.setItem('wallet:txWeightCoefficient', txWeightCoefficient);
  }
}

export default transaction;
