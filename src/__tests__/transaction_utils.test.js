import transaction from '../utils/transaction';
import wallet from '../utils/wallet';
import AddressError from '../utils/errors';
import buffer from 'buffer';
import { OP_PUSHDATA1 } from '../opcodes';
import { DEFAULT_TX_VERSION } from '../constants';

test('Tx weight constants', () => {
  transaction.updateTransactionWeightConstants(10, 1.5, 8);
  expect(parseFloat(localStorage.getItem('wallet:txMinWeight'))).toBe(10);
  expect(parseFloat(localStorage.getItem('wallet:txWeightCoefficient'))).toBe(1.5);
  expect(parseFloat(localStorage.getItem('wallet:txMinWeightK'))).toBe(8);

  transaction.updateTransactionWeightConstants(15, 1.2, 10);
  expect(parseFloat(localStorage.getItem('wallet:txMinWeight'))).toBe(15);
  expect(parseFloat(localStorage.getItem('wallet:txWeightCoefficient'))).toBe(1.2);
  expect(parseFloat(localStorage.getItem('wallet:txMinWeightK'))).toBe(10);
});

test('Unsigned int to bytes', () => {
  let number1 = 10;
  let buf1 = transaction.intToBytes(number1, 1);
  expect(buf1.readUInt8(0)).toBe(number1);

  let number2 = 300;
  let buf2 = transaction.intToBytes(number2, 2);
  expect(buf2.readUInt16BE(0)).toBe(number2);

  let number3 = 70000;
  let buf3 = transaction.intToBytes(number3, 4);
  expect(buf3.readUInt32BE(0)).toBe(number3);
});

test('Signed int to bytes', () => {
  let number1 = 10;
  let buf1 = transaction.signedIntToBytes(number1, 1);
  expect(buf1.readInt8(0)).toBe(number1);

  let number2 = 300;
  let buf2 = transaction.signedIntToBytes(number2, 2);
  expect(buf2.readInt16BE(0)).toBe(number2);

  let number3 = 70000;
  let buf3 = transaction.signedIntToBytes(number3, 4);
  expect(buf3.readInt32BE(0)).toBe(number3);

  let number4 = 2**33;
  let buf4 = transaction.signedIntToBytes(number4, 8);
  expect(buf4.readIntBE(0, 8)).toBe(number4);
});

test('Float to bytes', () => {
  let number = 10.5;
  let buffer = transaction.floatToBytes(number, 8);
  expect(buffer.readDoubleBE(0)).toBe(number);
});

test('Output value to bytes', () => {
  let bytes1 = transaction.outputValueToBytes(100);
  expect(bytes1.length).toBe(4);
  expect(bytes1.readIntBE(0, 4)).toBe(100);

  let bytes2 = transaction.outputValueToBytes(2**31-1);
  expect(bytes2.length).toBe(4);
  expect(bytes2.readIntBE(0, 4)).toBe(2**31-1);

  let bytes3 = transaction.outputValueToBytes(2**31);
  expect(bytes3.length).toBe(8);
  expect(bytes3.readIntBE(0, 8)).toBe(-(2**31));

  let bytes4 = transaction.outputValueToBytes(2**33);
  expect(bytes4.length).toBe(8);
  expect(bytes4.readIntBE(0, 8)).toBe(-(2**33));
});

test('Decode address', () => {
  let addressB58 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let expectedHex = '000ad2c15b8afe6598da1d327951043cf7ad057bcfc03c8936';
  let decoded = transaction.decodeAddress(addressB58);
  expect(expectedHex).toBe(decoded.toString('hex'));
});

test('Validate address', () => {
  let addressB58 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let decoded = transaction.decodeAddress(addressB58);
  expect(transaction.validateAddress(decoded)).toBeTruthy();

  let wrongAddressB58 = 'EETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let decodedWrong = transaction.decodeAddress(wrongAddressB58);
  // https://jestjs.io/docs/en/expect#tothrowerror
  // Note: You must wrap the code in a function, otherwise the error will not be caught and the assertion will fail.
  const validateAddressWrong = () => {
    transaction.validateAddress(decodedWrong);
  }
  expect(validateAddressWrong).toThrowError(AddressError);

  let wrong2AddressB58 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR77';
  let decodedWrong2 = transaction.decodeAddress(wrong2AddressB58);
  const validateAddressWrong2 = () => {
    transaction.validateAddress(decodedWrong2);
  }
  expect(validateAddressWrong2).toThrowError(AddressError);
});

test('Push data', () => {
  let stack = [];
  let buf = buffer.Buffer(5);
  transaction.pushDataToStack(stack, buf);
  expect(stack.length).toBe(2);
  expect(stack[0].readUInt8(0)).toBe(5);
  expect(stack[1]).toBe(buf);

  let newStack = [];
  let newBuf = buffer.Buffer(100);
  transaction.pushDataToStack(newStack, newBuf);
  expect(newStack.length).toBe(3);
  expect(newStack[0]).toBe(OP_PUSHDATA1);
  expect(newStack[1].readUInt8(0)).toBe(100);
  expect(newStack[2]).toBe(newBuf);
});

test('Create output script', () => {
  let address = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let expectedHex = '76a9140ad2c15b8afe6598da1d327951043cf7ad057bcf88ac';
  expect(transaction.createOutputScript(address).toString('hex')).toBe(expectedHex);

  let timestamp = 1550249803;
  let expectedHex2 = '045c66ef4b6f76a9140ad2c15b8afe6598da1d327951043cf7ad057bcf88ac';
  expect(transaction.createOutputScript(address, timestamp).toString('hex')).toBe(expectedHex2);
});

test('Create input data', () => {
  let signature = buffer.Buffer(20);
  let pubkeyBytes = buffer.Buffer(30);
  expect(transaction.createInputData(signature, pubkeyBytes).length).toBe(52);

  // Pubkey bytes now needs the OP_PUSHDATA1 to be pushed
  let pubkeyBytes2 = buffer.Buffer(100);
  expect(transaction.createInputData(signature, pubkeyBytes2).length).toBe(123);
});

test('Prepare data to send tokens', () => {
  // First get data to sign
  let tx_id = '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e';
  let txData = {
    'inputs': [
      {
        'tx_id': tx_id,
        'index': 0,
        'token': '00',
      }
    ],
    'outputs': [
      {
        'address': '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j',
        'value': 1000,
        'timelock': null
      },
      {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 1000,
        'timelock': 1550249803
      }
    ],
    'tokens': ['123'],
  }
  let expectedDataToSignHex = '00010102011200034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e000000000003e800001976a9140ad2c15b8afe6598da1d327951043cf7ad057bcf88ac000003e800001f045c66ef4b6f76a91441f267e9a6fbff734fb8f062fc35d231f33ff8d588ac';
  let dataToSign = transaction.dataToSign(txData);
  expect(dataToSign.toString('hex')).toBe(expectedDataToSignHex);

  // Now we will update the data in the inputs
  let words = 'purse orchard camera cloud piece joke hospital mechanic timber horror shoulder rebuild you decrease garlic derive rebuild random naive elbow depart okay parrot cliff';
  // Generate new wallet and save data in localStorage
  wallet.generateWallet(words, '', '123456', 'password', true);
  // Adding data to localStorage to be used in the signing process
  let savedData = JSON.parse(localStorage.getItem('wallet:data'));
  let addr = localStorage.getItem('wallet:address');
  savedData['unspentTxs'] = {'00': {'00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': {'address': addr}}};
  localStorage.setItem('wallet:data', JSON.stringify(savedData));

  // First trying with input that does not exist in localStorage
  txData['inputs'][0].index = 1;
  txData = transaction.signTx(txData, dataToSign, '123456');
  expect(txData['inputs'][0].data).toBe(undefined);

  // Now fixing and trying again
  txData['inputs'][0].index = 0;
  txData = transaction.signTx(txData, dataToSign, '123456');
  expect(txData['inputs'][0].data).not.toBe(undefined);
  expect(txData['inputs'][0].data.length > 0).toBeTruthy();

  transaction.completeTx(txData);
  expect(txData['nonce']).toBe(0);
  expect(txData['version']).toBe(DEFAULT_TX_VERSION);
  expect(txData['timestamp'] > 0).toBeTruthy();
  expect(txData['weight'] > 0).toBeTruthy();

  // Fixing timestamp to compare the serialization
  txData['timestamp'] = 1550249810;
  let expectedTxHex = '00010101021200034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e00006946304402202278ecdfc92d814710a4dd7236a2fd7a9f2e81056a36872daad89bb840db01ea02204e7f99e026c04988af55e7cb831fc7b0e4ad32bd3bee5e73dfce5f7e6ae199d2210346cddff43dffab8e13398633ab7a7caf0d634551e89ae6fd563e282f6744b983000003e800001976a9140ad2c15b8afe6598da1d327951043cf7ad057bcf88ac000003e800001f045c66ef4b6f76a91441f267e9a6fbff734fb8f062fc35d231f33ff8d588ac4030861b12dcee1a5c66ef520000000000';
  expect(transaction.txToBytes(txData).toString('hex')).toBe(expectedTxHex);
});