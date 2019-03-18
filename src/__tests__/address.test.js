import wallet from '../utils/wallet';
import { GAP_LIMIT } from '../constants';
import WebSocketHandler from '../WebSocketHandler';

beforeEach(() => {
  WebSocketHandler.connected = false;
  wallet.cleanLocalStorage();
});

test('Update address', () => {
  let address1 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let index1 = 10;
  wallet.updateAddress(address1, index1, false);
  expect(localStorage.getItem('wallet:address')).toBe(address1);
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(index1);

  let address2 = '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r';
  let index2 = 20;
  wallet.updateAddress(address2, index2, false);
  expect(localStorage.getItem('wallet:address')).toBe(address2);
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(index2);
})

test('Has a new address already generated', () => {
  localStorage.setItem('wallet:lastGeneratedIndex', 10);
  localStorage.setItem('wallet:lastSharedIndex', 9);

  expect(wallet.hasNewAddress()).toBe(true);

  localStorage.setItem('wallet:lastSharedIndex', 10);
  expect(wallet.hasNewAddress()).toBe(false);

  localStorage.setItem('wallet:lastSharedIndex', 11);
  expect(wallet.hasNewAddress()).toBe(false);
});

test('Get next address already generated', () => {
  localStorage.setItem('wallet:lastSharedIndex', 9);
  localStorage.setItem('wallet:data', JSON.stringify({keys: {'1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j': {index: 9}, '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r': {index: 10}}}));

  wallet.getNextAddress()

  expect(localStorage.getItem('wallet:address')).toBe('171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r');
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(10);
});

test('Can generate new address', () => {
  localStorage.setItem('wallet:lastUsedIndex', 2);
  localStorage.setItem('wallet:lastGeneratedIndex', 30);

  expect(wallet.canGenerateNewAddress()).toBe(false);

  localStorage.setItem('wallet:lastUsedIndex', 10);
  expect(wallet.canGenerateNewAddress()).toBe(false);

  localStorage.setItem('wallet:lastUsedIndex', 11);
  expect(wallet.canGenerateNewAddress()).toBe(true);

  localStorage.setItem('wallet:lastUsedIndex', 17);
  expect(wallet.canGenerateNewAddress()).toBe(true);
});

test('Generate new address', () => {
  WebSocketHandler.connected = true;
  let words = 'purse orchard camera cloud piece joke hospital mechanic timber horror shoulder rebuild you decrease garlic derive rebuild random naive elbow depart okay parrot cliff';
  let pin = '123456';
  wallet.generateWallet(words, '', pin, 'password', true);

  let data = JSON.parse(localStorage.getItem('wallet:data'));
  expect(Object.keys(data.keys).length).toBe(GAP_LIMIT);
  expect(parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10)).toBe(GAP_LIMIT - 1);
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(0);

  for (let address in data.keys) {
    if (data.keys[address].index === 0) {
      expect(localStorage.getItem('wallet:address')).toBe(address);
      break;
    }
  }

  // Set last shared index as last generated also
  localStorage.setItem('wallet:lastSharedIndex', GAP_LIMIT - 1);

  wallet.generateNewAddress();
  
  let newData = JSON.parse(localStorage.getItem('wallet:data'));
  expect(Object.keys(newData.keys).length).toBe(GAP_LIMIT + 1);
  expect(parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10)).toBe(GAP_LIMIT);
  for (let address in newData.keys) {
    if (newData.keys[address].index === GAP_LIMIT) {
      expect(localStorage.getItem('wallet:address')).toBe(address);
      break;
    }
  }
});

test('Last used index', () => {
  WebSocketHandler.connected = true;
  let words = 'purse orchard camera cloud piece joke hospital mechanic timber horror shoulder rebuild you decrease garlic derive rebuild random naive elbow depart okay parrot cliff';
  let pin = '123456';
  wallet.generateWallet(words, '', pin, 'password', true);

  let data = JSON.parse(localStorage.getItem('wallet:data'));
  for (let address in data.keys) {
    if (data.keys[address].index === 12) {
      wallet.setLastUsedIndex(address);
      expect(parseInt(localStorage.getItem('wallet:lastUsedIndex'), 10)).toBe(12);
      expect(localStorage.getItem('wallet:lastUsedAddress')).toBe(address);
      break;
    }
  }
});

test('Subscribe address to websocket', (done) => {
  let address = '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r';
  WebSocketHandler.connected = true;
  WebSocketHandler.on('subscribe_success', (wsData) => {
    if (wsData.address === address) {
      // If got here test was successful, so ending it
      done();
    }
  });
  wallet.subscribeAddress(address);
});

test('Subscribe all addresses to websocket', (done) => {
  let addresses = [
    '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
    '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
    '1PtH3rBmiYDiUuomQyoxMREicrxjg3LA5q',
    '17JqwHofr3rjYApvSa91duvcmsLai7mTHp',
    '134dPXThGpkrQ932LNQV1seVCcaABqjfVW',
    '14KxvBJtsNuPrQci2Ecd5LD5En9ntab71u',
    '12J24268HH8FhdMQM59GUToe4pKsG42Tm6',
    '12z9DLQKU3xahC1zFFRdo6VpzyupxMtvoF',
    '1HDxnAmhqS6VvT1h5D7QtooEdnw9cwPQP2',
    '1CdKN9tYzanCobigUKU2caqkuYSDXr4Qas'
  ];
  let keys = {};
  for (let address of addresses) {
    keys[address] = {};
  }
  localStorage.setItem('wallet:data', JSON.stringify({keys: keys}));
  WebSocketHandler.connected = true;
  WebSocketHandler.on('subscribe_success', (wsData) => {
    let foundIndex = -1;
    for (let [idx, address] of addresses.entries()) {
      if (address === wsData.address) {
        foundIndex = idx;
        break;
      }
    }

    if (foundIndex > -1) {
      addresses.splice(foundIndex, 1);
    }

    if (addresses.length === 0) {
      // If got here test was successful, so ending it
      done();
    }
  });
  wallet.subscribeAllAddresses();
});