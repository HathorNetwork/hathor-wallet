/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import wallet from '../utils/wallet';
import dateFormatter from '../utils/date';
import ReactDOMServer from 'react-dom/server';

beforeEach(() => {
  wallet.cleanLocalStorage();
});

test('Loaded', () => {
  expect(wallet.loaded()).toBeFalsy();
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', false);
  expect(wallet.loaded()).toBeTruthy();
});

test('Clean local storage', () => {
  localStorage.setItem('wallet:accessData', '{}');
  localStorage.setItem('wallet:data', '{}');
  localStorage.setItem('wallet:address', '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r');
  localStorage.setItem('wallet:lastSharedIndex', 1);
  localStorage.setItem('wallet:lastGeneratedIndex', 19);
  localStorage.setItem('wallet:lastUsedIndex', 0);
  localStorage.setItem('wallet:lastUsedAddress', '1knH3y5dZuC8DQBaLhgJP33fGBr6vstr8');

  wallet.cleanLocalStorage();

  expect(localStorage.getItem('wallet:accessData')).toBeNull();
  expect(localStorage.getItem('wallet:data')).toBeNull();
  expect(localStorage.getItem('wallet:address')).toBeNull();
  expect(localStorage.getItem('wallet:lastSharedIndex')).toBeNull();
  expect(localStorage.getItem('wallet:lastGeneratedIndex')).toBeNull();
  expect(localStorage.getItem('wallet:lastUsedIndex')).toBeNull();
  expect(localStorage.getItem('wallet:lastUsedAddress')).toBeNull();
});

test('Save address history to localStorage', () => {
  expect(localStorage.getItem('wallet:data')).toBeNull();
  localStorage.setItem('wallet:data', '{}');
  const historyTransactions = {'id': {'tx_id': 'id'}}
  const allTokens = new Set(['00']);
  wallet.saveAddressHistory(historyTransactions, allTokens);

  let data = JSON.parse(localStorage.getItem('wallet:data'));
  expect(data.historyTransactions).toEqual(expect.objectContaining(historyTransactions));
  expect(data.allTokens).toEqual(expect.objectContaining(allTokens));
});

test('Valid words', () => {
  expect(wallet.wordsValid('less than 24 words').valid).toBe(false);
  expect(wallet.wordsValid('a a a a a a a a a a a a a a a a a a a a a a a a').valid).toBe(false);
  expect(wallet.wordsValid(123).valid).toBe(false);
  expect(wallet.wordsValid(256).valid).toBe(false);
  expect(wallet.generateWallet({})).toBe(null);
  const words = wallet.generateWalletWords(256);
  expect(wallet.wordsValid(words).valid).toBe(true);
});

test('Inputs from amount', () => {
  const historyTransactionts = {
    '1': {
      'tx_id': '1',
      'outputs': [
        {
          'decoded': {
            'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
          },
          'value': 2000,
          'token': '00',
          'spent_by': null
        },
        {
          'decoded': {
            'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
          },
          'value': 2000,
          'token': '00',
          'spent_by': null
        },
      ],
      'inputs': [],
    },
  }
  localStorage.setItem('wallet:data', JSON.stringify({'keys': {'171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r': {}}}));

  const ret1 = wallet.getInputsFromAmount(historyTransactionts, 10, '01');
  expect(ret1.inputs.length).toBe(0);
  expect(ret1.inputsAmount).toBe(0);

  const ret2 = wallet.getInputsFromAmount(historyTransactionts, 200, '00');
  expect(ret2.inputs.length).toBe(1);
  expect(ret2.inputsAmount).toBe(2000);
});

test('Can use unspent txs', () => {
  const unspentTx1 = {
    'decoded': {
      'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
      'timelock': null,
    },
    'value': 2000,
    'spent_by': null,
  };
  const timestamp = dateFormatter.dateToTimestamp(new Date());
  const unspentTx2 = {
    'decoded': {
      'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
      'timelock': timestamp - 1,
    },
    'value': 2000,
    'spent_by': null,
  };
  const unspentTx3 = {
    'decoded': {
      'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
      'timelock': timestamp + 1000,
    },
    'value': 2000,
    'spent_by': null,
  };

  expect(wallet.canUseUnspentTx(unspentTx1)).toBe(true);
  expect(wallet.canUseUnspentTx(unspentTx2)).toBe(true);
  expect(wallet.canUseUnspentTx(unspentTx3)).toBe(false);
});

test('Output change', () => {
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  let lastSharedIndex = parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10);
  let address = localStorage.getItem('wallet:address');
  let change = wallet.getOutputChange(1000, '00');

  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(lastSharedIndex+1);
  expect(change.address).toBe(address);
  expect(change.value).toBe(1000);
  expect(localStorage.getItem('wallet:address')).not.toBe(address);

  localStorage.setItem('wallet:lastSharedIndex', localStorage.getItem('wallet:lastGeneratedIndex'));
  wallet.getOutputChange(1000, '00');
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10));
});

test('Unspent txs exist', () => {
  const historyTransactionts = {
    '1': {
      'tx_id': '1',
      'outputs': [
        {
          'decoded': {
            'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
          },
          'value': 2000,
          'token': '00',
          'spent_by': null
        },
        {
          'decoded': {
            'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
          },
          'value': 2000,
          'token': '00',
          'spent_by': null
        },
      ],
      'inputs': [],
    },
  }

  localStorage.setItem('wallet:data', JSON.stringify({'keys': {'171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r': {}}}));

  expect(wallet.checkUnspentTxExists(historyTransactionts, '0', '0', '00').exists).toBe(false);
  expect(wallet.checkUnspentTxExists(historyTransactionts, '0', '0', '01').exists).toBe(false);
  expect(wallet.checkUnspentTxExists(historyTransactionts, '1', '0', '00').exists).toBe(true);
  expect(wallet.checkUnspentTxExists(historyTransactionts, '1', '1', '00').exists).toBe(true);
  expect(wallet.checkUnspentTxExists(historyTransactionts, '0', '1', '00').exists).toBe(false);
});

test('Wallet locked', () => {
  expect(wallet.isLocked()).toBe(false);
  wallet.lock();
  expect(wallet.isLocked()).toBe(true);
  wallet.unlock();
  expect(wallet.isLocked()).toBe(false);
});

test('Wallet backup', () => {
  expect(wallet.isBackupDone()).toBe(false);
  wallet.markBackupAsDone();
  expect(wallet.isBackupDone()).toBe(true);
  wallet.markBackupAsNotDone();
  expect(wallet.isBackupDone()).toBe(false);
});

test('Get wallet words', () => {
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(0)

  const sharedAddress = localStorage.getItem('wallet:address');
  const key = JSON.parse(localStorage.getItem('wallet:data')).keys[sharedAddress];
  expect(wallet.getWalletWords('password')).toBe(words);

  wallet.addPassphrase('passphrase', '123456', 'password');
  expect(wallet.getWalletWords('password')).toBe(words);
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(0)

  const newSharedAddress = localStorage.getItem('wallet:address');
  expect(sharedAddress).not.toBe(newSharedAddress);
  expect(key.index).toBe(JSON.parse(localStorage.getItem('wallet:data')).keys[newSharedAddress].index);
});

test('Change server', () => {
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  const accessData = JSON.parse(localStorage.getItem('wallet:accessData'));
  const keys = JSON.parse(localStorage.getItem('wallet:data')).keys;

  wallet.reloadData();

  expect(JSON.parse(localStorage.getItem('wallet:accessData'))).toEqual(accessData);
});

test('Started', () => {
  expect(wallet.started()).toBe(false);
  wallet.markWalletAsStarted();
  expect(wallet.started()).toBe(true);
});

test('Reset all data', () => {
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  wallet.markWalletAsStarted();
  const server = 'http://server';
  wallet.changeServer(server);
  expect(localStorage.getItem('wallet:server')).toBe(server);
  wallet.lock();

  wallet.resetAllData();

  expect(localStorage.getItem('wallet:started')).toBeNull();
  expect(localStorage.getItem('wallet:server')).toBeNull();
  expect(localStorage.getItem('wallet:locked')).toBeNull();
  expect(localStorage.getItem('wallet:accessData')).toBeNull();
  expect(localStorage.getItem('wallet:data')).toBeNull();
});

test('Closed', () => {
  expect(wallet.wasClosed()).toBe(false);
  wallet.close()
  expect(wallet.wasClosed()).toBe(true);
});
