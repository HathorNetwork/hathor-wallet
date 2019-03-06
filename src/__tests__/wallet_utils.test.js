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
  let sortedHistory = [{'tx_id': 1}, {'tx_id': 2}];
  let unspentTxs = {'00': {'1,0': {'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r', 'value': 2000}}};
  let spentTxs = {'2,0': {'address': '1knH3y5dZuC8DQBaLhgJP33fGBr6vstr8'}};
  let voidedSpentTxs = {};
  let voidedUnspentTxs = {};
  wallet.saveAddressHistory(sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs);

  let data = JSON.parse(localStorage.getItem('wallet:data'));
  expect(data.sortedHistory).toEqual(expect.arrayContaining(sortedHistory));
  expect(data.unspentTxs).toEqual(expect.objectContaining(unspentTxs));
  expect(data.spentTxs).toEqual(expect.objectContaining(spentTxs));
  expect(data.voidedSpentTxs).toEqual(expect.objectContaining(voidedSpentTxs));
  expect(data.voidedUnspentTxs).toEqual(expect.objectContaining(voidedUnspentTxs));
});

test('Update address history', () => {
  let addressHistory = [
    {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
      'index': 0,
      'is_output': true,
      'token_uid': '00',
      'value': 100,
      'timestamp': 1548990444,
      'timelock': null,
      'voided': false

    },
    {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f',
      'index': 0,
      'is_output': false,
      'token_uid': '00',
      'value': 100,
      'voided': false,
      'timestamp': 1548990446,
      'timelock': null,
      'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e'

    },
    {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
      'index': 0,
      'is_output': true,
      'token_uid': '00',
      'value': 200,
      'timestamp': 1548990448,
      'timelock': null,
      'voided': false

    }
  ]
  let history = [
    {
      'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
      'history': addressHistory,
    }
  ]

  let unspentTxs = {};
  let spentTxs = {};
  let sortedHistory = wallet.historyUpdate(history, unspentTxs, spentTxs);

  let expectedUnspent = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 200,
        'timelock': null,
        'timestamp': 1548990448
      }
    }
  }

  let expectedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f',
        'timestamp': 1548990446,
        'value': 100,
        'timelock': null,
      }
    ]
  }

  expect(sortedHistory).toEqual(expect.arrayContaining(addressHistory));
  expect(unspentTxs).toEqual(expect.objectContaining(expectedUnspent));
  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
});

test('Valid words', () => {
  expect(wallet.wordsValid('less than 24 words').valid).toBe(false);
  expect(wallet.wordsValid(123).valid).toBe(false);
  expect(wallet.wordsValid(256).valid).toBe(false);
  expect(wallet.generateWallet({})).toBe(null);
  const words = wallet.generateWalletWords(256);
  expect(wallet.wordsValid(words).valid).toBe(true);
});

test('Inputs from amount', () => {
  let unspentTxs = {
    '00':
    {
      '1,0':
      {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 2000
      },
      '1,1':
      {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 2000
      }
    }
  };
  localStorage.setItem('wallet:data', JSON.stringify({'unspentTxs': unspentTxs}));

  let ret1 = wallet.getInputsFromAmount(10, '01');
  expect(ret1.inputs.length).toBe(0);
  expect(ret1.inputsAmount).toBe(0);

  let ret2 = wallet.getInputsFromAmount(200, '00');
  expect(ret2.inputs.length).toBe(1);
  expect(ret2.inputsAmount).toBe(2000);
});

test('Can use unspent txs', () => {
  let unspentTx1 = {'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r', 'value': 2000, 'timelock': null};
  let timestamp = dateFormatter.dateToTimestamp(new Date());
  let unspentTx2 = {'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r', 'value': 2000, 'timelock': timestamp - 1};
  let unspentTx3 = {'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r', 'value': 2000, 'timelock': timestamp + 1000};

  expect(wallet.canUseUnspentTx(unspentTx1)).toBeTruthy();
  expect(wallet.canUseUnspentTx(unspentTx2)).toBeTruthy();
  expect(wallet.canUseUnspentTx(unspentTx3)).toBeFalsy();
});

test('Output change', () => {
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  let lastSharedIndex = parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10);
  let address = localStorage.getItem('wallet:address');
  let change = wallet.getOutputChange(1000, '123456');

  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(lastSharedIndex+1);
  expect(change.address).toBe(address);
  expect(change.value).toBe(1000);
  expect(localStorage.getItem('wallet:address')).not.toBe(address);

  localStorage.setItem('wallet:lastSharedIndex', localStorage.getItem('wallet:lastGeneratedIndex'));
  wallet.getOutputChange(1000, '123456');
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10));
});

test('Unspent txs exist', () => {
  let unspentTxs = {
    '00':
    {
      '1,0':
      {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 2000
      },
      '1,1':
      {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 2000
      }
    }
  };
  localStorage.setItem('wallet:data', JSON.stringify({'unspentTxs': unspentTxs}));

  expect(wallet.checkUnspentTxExists('0,0', '00')).toBeFalsy();
  expect(wallet.checkUnspentTxExists('0,0', '01')).toBeFalsy();
  expect(wallet.checkUnspentTxExists('1,0', '00')).toBeTruthy();
  expect(wallet.checkUnspentTxExists('1,1', '00')).toBeTruthy();
  expect(wallet.checkUnspentTxExists('0,1', '00')).toBeFalsy();
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

  wallet.reloadData('123456');

  expect(JSON.parse(localStorage.getItem('wallet:accessData'))).toEqual(accessData);
});

test('Started', () => {
  expect(wallet.started()).toBe(false);
  localStorage.setItem('wallet:started', true);
  expect(wallet.started()).toBe(true);
});

test('Reset all data', () => {
  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  localStorage.setItem('wallet:started', true);
  localStorage.setItem('wallet:server', 'http://server');
  localStorage.setItem('wallet:locked', true);

  wallet.resetAllData();

  expect(localStorage.getItem('wallet:started')).toBeNull();
  expect(localStorage.getItem('wallet:server')).toBeNull();
  expect(localStorage.getItem('wallet:locked')).toBeNull();
  expect(localStorage.getItem('wallet:accessData')).toBeNull();
  expect(localStorage.getItem('wallet:data')).toBeNull();
});