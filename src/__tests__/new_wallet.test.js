/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GAP_LIMIT, HATHOR_TOKEN_CONFIG } from '../constants';
import wallet from '../utils/wallet';
import { HDPrivateKey } from 'bitcore-lib';
import CryptoJS from 'crypto-js';
import { cleanData } from '../actions/index';
import WebSocketHandler from '../WebSocketHandler';
import store from '../store/index';

var addressUsed = '';
var addressShared = '';
var txId = '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e';
var pin = '123456';
var doneCb = null;

// Mock any GET request to /thin_wallet/address_history
// arguments for reply are (status, data, headers)
mock.onGet('thin_wallet/address_history').reply((config) => {
  if (config.params.addresses.length === GAP_LIMIT) {
    if (addressUsed === '') {
      addressUsed = config.params.addresses[0];
      addressShared = config.params.addresses[1];
    }
    let ret = {
      'history': [
        {
          'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
          'timestamp': 1548892556,
          'is_voided': false,
          'inputs': [],
          'outputs': [
            {
              'decoded': {
                'timelock': null,
                'address': config.params.addresses[0],
              },
              'token': '00',
              'value': 2000,
              'voided': false
            }
          ],
        }
      ]
    }
    return [200, ret];
  } else {
    return [200, {'history': []}];
  }
});

const checkData = () => {
  check(localStorage.getItem('wallet:address'), addressShared, doneCb);
  check(localStorage.getItem('wallet:lastUsedAddress'), addressUsed, doneCb);
  check(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10), 1, doneCb);
  check(parseInt(localStorage.getItem('wallet:lastUsedIndex'), 10), 0, doneCb);
  check(parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10), 20, doneCb);
  let accessData = localStorage.getItem('wallet:accessData');
  checkNot(accessData, null, doneCb);
  let accessDataJson = JSON.parse(accessData);
  check('mainKey' in accessDataJson, true, doneCb);
  check(typeof accessDataJson['mainKey'], 'string', doneCb);
  check('hash' in accessDataJson, true, doneCb);
  check(accessDataJson['hash'], CryptoJS.SHA256(CryptoJS.SHA256(pin)).toString(), doneCb);

  let walletData = localStorage.getItem('wallet:data');
  checkNot(walletData, null, doneCb);
  let walletDataJson = JSON.parse(walletData);
  check('historyTransactions' in walletDataJson, true, doneCb);
  check(typeof walletDataJson['historyTransactions'], 'object', doneCb);
  check('00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e' in walletDataJson['historyTransactions'], true, doneCb);

  doneCb();
}

const readyLoadHistory = (pin) => {
  const encrypted = JSON.parse(localStorage.getItem('wallet:accessData')).mainKey;
  const privKeyStr = wallet.decryptData(encrypted, pin);
  const privKey = HDPrivateKey(privKeyStr)
  return wallet.loadAddressHistory(0, GAP_LIMIT, privKey, pin);
}

beforeEach(() => {
  wallet.cleanLocalStorage();
  store.dispatch(cleanData());
  addressUsed = '';
  addressShared = '';
  WebSocketHandler.started = true;
  doneCb = null;
});

test('Generate new HD wallet', (done) => {
  doneCb = done;

  // Generate new wallet and save data in localStorage
  const words = wallet.generateWalletWords(256);
  check(wallet.wordsValid(words).valid, true, done);
  wallet.executeGenerateWallet(words, '', pin, 'password', false);

  const promise = readyLoadHistory(pin);

  promise.then(() => {
    checkData();
  }, (e) => {
    done.fail('Error loading history from addresses');
  });
}, 15000); // 15s to timeout in case done() is not called

test('Generate HD wallet from predefined words', (done) => {
  doneCb = done;
  let words = 'purse orchard camera cloud piece joke hospital mechanic timber horror shoulder rebuild you decrease garlic derive rebuild random naive elbow depart okay parrot cliff';
  addressUsed = 'H8rodtbo5TcfUkRBs6ujQTg2u1Re3xVZ11';
  addressShared = 'HQHv7d72jeby3hqAozUbh9Knhe8TCiTKnp';


  // Generate new wallet and save data in localStorage
  let retWords = wallet.generateWallet(words, '', pin, 'password', false);
  check(retWords, words);

  const promise = readyLoadHistory(pin);

  promise.then(() => {
    checkData();
  }, (e) => {
    done.fail('Error loading history from addresses');
  });
}, 15000); // 15s to timeout in case done() is not called
