import { GAP_LIMIT, HATHOR_TOKEN_UID } from '../constants';
import wallet from '../utils/wallet';
import CryptoJS from 'crypto-js';
import { cleanData } from '../actions/index';
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
          'address': config.params.addresses[0],
          'history': [
            {
              'tx_id': txId,
              'index': 0,
              'is_output': true,
              'timelock': null,
              'timestamp': 1548892556,
              'token_uid': '00',
              'value': 2000,
              'voided': false
            }
          ]
        },
        {
          'address': config.params.addresses[1],
          'history': []
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
  check('sortedHistory' in walletDataJson, true, doneCb);
  check(typeof walletDataJson['sortedHistory'], 'object', doneCb);
  check(walletDataJson['sortedHistory'].length, 1, doneCb);
  check(walletDataJson['sortedHistory'][0].tx_id, txId, doneCb);

  check('unspentTxs' in walletDataJson, true, doneCb);
  check(typeof walletDataJson['unspentTxs'], 'object', doneCb);
  let key = [txId, 0];
  check(key in walletDataJson['unspentTxs'][HATHOR_TOKEN_UID], true, doneCb);
  check(walletDataJson['unspentTxs'][HATHOR_TOKEN_UID][key].value, 2000, doneCb);
  check(walletDataJson['unspentTxs'][HATHOR_TOKEN_UID][key].address, addressUsed, doneCb);

  check('spentTxs' in walletDataJson, true, doneCb);
  check(typeof walletDataJson['spentTxs'], 'object', doneCb);
  check(isObjectEmpty(walletDataJson['spentTxs']), true, doneCb);

  check('voidedUnspentTxs' in walletDataJson, true, doneCb);
  check(typeof walletDataJson['voidedUnspentTxs'], 'object', doneCb);
  check(isObjectEmpty(walletDataJson['voidedUnspentTxs']), true, doneCb);

  check('voidedSpentTxs' in walletDataJson, true, doneCb);
  check(typeof walletDataJson['voidedSpentTxs'], 'object', doneCb);
  check(isObjectEmpty(walletDataJson['voidedSpentTxs']), true, doneCb);

  doneCb();
}

const startCheckLocalStorage = () => {
  // Saving data history to localStorage is asyncronous but should be fast
  var count = 0;
  const checkLocalStorage = () => {
    let lastGeneratedIndex = localStorage.getItem('wallet:lastGeneratedIndex');
    if (lastGeneratedIndex !== null && parseInt(lastGeneratedIndex, 10) === GAP_LIMIT) {
      checkData();
    } else {
      setTimeout(() => {
        count++;
        if (count < 10) {
          checkLocalStorage();
        }
      }, 1000)
    }
  }
  checkLocalStorage();
}

beforeEach(() => {
  wallet.cleanLocalStorage();
  store.dispatch(cleanData());
  addressUsed = '';
  addressShared = '';
  doneCb = null;
});

test('Generate new HD wallet', (done) => {
  doneCb = done;

  // Generate new wallet and save data in localStorage
  let words = wallet.executeGenerateWallet(256, '', pin);
  check(words.split(' ').length, 24, done);

  startCheckLocalStorage();
}, 15000); // 15s to timeout in case done() is not called

test('Generate HD wallet from predefined words', (done) => {
  doneCb = done;
  let words = 'purse orchard camera cloud piece joke hospital mechanic timber horror shoulder rebuild you decrease garlic derive rebuild random naive elbow depart okay parrot cliff';
  addressUsed = '13LgFYgGgF5cmQqitKaz1SnZiq7uXRUAoU';
  addressShared = '1JmnjHBWLS4vLNFhqD9rJ8SKXTpig5XS3G';


  // Generate new wallet and save data in localStorage
  let retWords = wallet.generateWallet(words, '', pin);
  check(retWords, words);

  startCheckLocalStorage();
}, 15000); // 15s to timeout in case done() is not called