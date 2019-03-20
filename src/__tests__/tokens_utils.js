import tokens from '../utils/tokens';
import { GAP_LIMIT, HATHOR_TOKEN_CONFIG } from '../constants';
import { HDPrivateKey } from 'bitcore-lib';
import wallet from '../utils/wallet';
import { util } from 'bitcore-lib';
import WebSocketHandler from '../WebSocketHandler';

const createdTxHash = '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e';
const createdToken = util.buffer.bufferToHex(tokens.getTokenUID(createdTxHash, 0));

beforeEach(() => {
  WebSocketHandler.started = true;
});

// Mock any POST request to /thin_wallet/send_tokens
// arguments for reply are (status, data, headers)
mock.onPost('thin_wallet/send_tokens').reply((config) => {
  const ret = {
    'success': true,
    'tx': {
      'hash': createdTxHash,
      'tokens': [createdToken],
    }
  }
  return [200, ret];
});

test('Token UID', () => {
  const txID = '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e';
  const txID2 = '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295c';
  const uid1 = util.buffer.bufferToHex(tokens.getTokenUID(txID, 0));
  const uid2 = util.buffer.bufferToHex(tokens.getTokenUID(txID, 1));
  const uid3 = util.buffer.bufferToHex(tokens.getTokenUID(txID2, 0));

  expect(uid1.length).toBe(64);
  expect(uid1).not.toBe(uid2);
  expect(uid1).not.toBe(uid3);
});

const readyLoadHistory = (pin) => {
  const encrypted = JSON.parse(localStorage.getItem('wallet:accessData')).mainKey;
  const privKeyStr = wallet.decryptData(encrypted, pin);
  const privKey = HDPrivateKey(privKeyStr)
  return wallet.loadAddressHistory(0, GAP_LIMIT, privKey, pin);
}

test('New token', (done) => {
  const words = 'connect sunny silent cabin leopard start turtle tortoise dial timber woman genre pave tuna rice indicate gown draft palm collect retreat meadow assume spray';
  const pin = '123456';
  // Generate new wallet and save data in localStorage
  wallet.generateWallet(words, '', pin, 'password', false);
  const promise = readyLoadHistory(pin);
  const address = localStorage.getItem('wallet:address');
  promise.then(() => {
    // Adding data to localStorage to be used in the signing process
    const savedData = JSON.parse(localStorage.getItem('wallet:data'));
    const createdKey = `${createdTxHash},0`;
    savedData['historyTransactions'] = {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e': {
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
        'outputs': [
          {
            'decoded': {
              'address': address
            },
            'value': 1000,
          },
        ]
      }
    };
    localStorage.setItem('wallet:data', JSON.stringify(savedData));
    const input = {'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e', 'index': '0', 'token': '00', 'address': address};
    const output = {'address': address, 'value': 100, 'tokenData': 0};
    const tokenName = 'TestCoin';
    const tokenSymbol = 'TTC';
    const promise2 = tokens.createToken(input, output, address, tokenName, tokenSymbol, 200, pin, null, null);
    promise2.then(() => {
      const savedTokens = tokens.getTokens();
      expect(savedTokens.length).toBe(2);
      expect(savedTokens[1].uid).toBe(createdToken);
      expect(savedTokens[1].name).toBe(tokenName);
      expect(savedTokens[1].symbol).toBe(tokenSymbol);
      expect(tokens.tokenExists(createdToken)).toEqual({'uid': createdToken, 'name': tokenName, 'symbol': tokenSymbol});
      expect(tokens.tokenExists(createdTxHash)).toBe(null);
      const config = tokens.getConfigurationString(createdToken, tokenName, tokenSymbol);
      const receivedToken = tokens.getTokenFromConfigurationString(config);
      expect(receivedToken.uid).toBe(createdToken);
      expect(receivedToken.name).toBe(tokenName);
      expect(receivedToken.symbol).toBe(tokenSymbol);
      done();
    }, (e) => {
      done.fail('Error creating token');
    });
  }, (e) => {
    done.fail('Error creating token');
  })
}, 15000);

test('Tokens handling', () => {
  const token1 = {'name': '1234', 'uid': '1234'};
  const token2 = {'name': 'abcd', 'uid': 'abcd'};
  const token3 = {'name': HATHOR_TOKEN_CONFIG.name, 'uid': HATHOR_TOKEN_CONFIG.uid};
  const myTokens = [token1, token2, token3];
  const filteredTokens = tokens.filterTokens(myTokens, HATHOR_TOKEN_CONFIG);

  expect(filteredTokens.length).toBe(2);
  expect(filteredTokens[0].uid).toBe('1234');
  expect(filteredTokens[1].uid).toBe('abcd');

  expect(tokens.getTokenIndex(myTokens, HATHOR_TOKEN_CONFIG.uid)).toBe(0);
  expect(tokens.getTokenIndex(myTokens, '1234')).toBe(1);
  expect(tokens.getTokenIndex(myTokens, 'abcd')).toBe(2);
});
