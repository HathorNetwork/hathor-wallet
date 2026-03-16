jest.mock('@hathor/wallet-lib', () => ({
  MemoryStore: class MemoryStore {},
  Storage: class Storage {},
  walletUtils: {},
  config: {},
  cryptoUtils: {},
  WalletType: {},
}));

// Must require after mock setup
const { LocalStorageStore, NETWORK_TOKENS_KEY, storageKeys } = require('../../storage');

describe('Network tokens persistence', () => {
  describe('storageKeys', () => {
    it('should not include NETWORK_TOKENS_KEY', () => {
      expect(storageKeys).not.toContain(NETWORK_TOKENS_KEY);
    });
  });

  describe('saveTokensForNetwork / getTokensForNetwork', () => {
    let store;

    beforeEach(() => {
      const data = {};
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => data[key] ?? null),
          setItem: jest.fn((key, value) => { data[key] = value; }),
          removeItem: jest.fn((key) => { delete data[key]; }),
        },
        writable: true,
        configurable: true,
      });
      store = new LocalStorageStore();
    });

    it('round-trips tokens by genesis hash', () => {
      const tokens = [
        { uid: 'token1', name: 'Token One', symbol: 'TK1' },
        { uid: 'token2', name: 'Token Two', symbol: 'TK2' },
      ];

      store.saveTokensForNetwork('hash_a', tokens);
      expect(store.getTokensForNetwork('hash_a')).toEqual(tokens);
    });

    it('returns null for unknown genesis hash', () => {
      expect(store.getTokensForNetwork('nonexistent')).toBeNull();
    });

    it('no-ops on falsy genesis hash', () => {
      store.saveTokensForNetwork(null, [{ uid: 'x' }]);
      store.saveTokensForNetwork('', [{ uid: 'x' }]);
      expect(window.localStorage.setItem).not.toHaveBeenCalled();

      expect(store.getTokensForNetwork(null)).toBeNull();
      expect(store.getTokensForNetwork('')).toBeNull();
    });

    it('keeps tokens for different networks independent', () => {
      const mainnetTokens = [{ uid: 'mt', name: 'Mainnet Token', symbol: 'MNT' }];
      const testnetTokens = [{ uid: 'tt', name: 'Testnet Token', symbol: 'TNT' }];

      store.saveTokensForNetwork('mainnet_hash', mainnetTokens);
      store.saveTokensForNetwork('testnet_hash', testnetTokens);

      expect(store.getTokensForNetwork('mainnet_hash')).toEqual(mainnetTokens);
      expect(store.getTokensForNetwork('testnet_hash')).toEqual(testnetTokens);
    });

    it('survives resetStorage()', () => {
      const tokens = [{ uid: 'token1', name: 'Token One', symbol: 'TK1' }];
      store.saveTokensForNetwork('hash_a', tokens);

      // resetStorage() iterates storageKeys and removes each one
      for (const key of storageKeys) {
        store.removeItem(key);
      }

      expect(store.getTokensForNetwork('hash_a')).toEqual(tokens);
    });
  });
});
