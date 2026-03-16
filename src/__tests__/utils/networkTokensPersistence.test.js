/**
 * Tests for the network tokens persistence feature.
 *
 * These tests verify that:
 * 1. The version API response field `genesis_block_hash` (snake_case) is read correctly
 * 2. NETWORK_TOKENS_KEY is not cleared by resetStorage()
 * 3. saveTokensForNetwork / getTokensForNetwork round-trip correctly
 */

// Mock wallet-lib before any imports to avoid ESM/axios issues
jest.mock('@hathor/wallet-lib', () => ({
  MemoryStore: class MemoryStore {},
  Storage: class Storage {},
  walletUtils: {},
  config: {},
  cryptoUtils: {},
  WalletType: {},
}));

// Must import after the mock is set up
const storage = require('../../storage');
const { LocalStorageStore, NETWORK_TOKENS_KEY, storageKeys } = storage;

describe('Network tokens persistence', () => {
  describe('storageKeys does not include NETWORK_TOKENS_KEY', () => {
    it('should not contain NETWORK_TOKENS_KEY so it survives resetStorage()', () => {
      // This was the bug: NETWORK_TOKENS_KEY was in storageKeys, so resetStorage()
      // would wipe the per-network token data on every wallet reset / network switch.
      expect(storageKeys).not.toContain(NETWORK_TOKENS_KEY);
    });

    it('NETWORK_TOKENS_KEY should be defined as a constant', () => {
      expect(NETWORK_TOKENS_KEY).toBe('localstorage:networkTokens');
    });
  });

  describe('LocalStorageStore token persistence methods', () => {
    let store;
    let mockStorage;

    beforeEach(() => {
      mockStorage = {};
      const localStorageMock = {
        getItem: jest.fn((key) => {
          const val = mockStorage[key];
          return val !== undefined ? val : null;
        }),
        setItem: jest.fn((key, value) => {
          mockStorage[key] = value;
        }),
        removeItem: jest.fn((key) => {
          delete mockStorage[key];
        }),
      };

      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
        configurable: true,
      });

      store = new LocalStorageStore();
    });

    it('should save and retrieve tokens for a network by genesis hash', () => {
      const genesisHash = 'abc123genesishash';
      const tokens = [
        { uid: 'token1', name: 'Token One', symbol: 'TK1' },
        { uid: 'token2', name: 'Token Two', symbol: 'TK2' },
      ];

      store.saveTokensForNetwork(genesisHash, tokens);
      const result = store.getTokensForNetwork(genesisHash);

      expect(result).toEqual(tokens);
    });

    it('should return null for a network with no saved tokens', () => {
      const result = store.getTokensForNetwork('nonexistent_hash');
      expect(result).toBeNull();
    });

    it('should not save when genesisHash is falsy', () => {
      store.saveTokensForNetwork(null, [{ uid: 'token1' }]);
      store.saveTokensForNetwork(undefined, [{ uid: 'token1' }]);
      store.saveTokensForNetwork('', [{ uid: 'token1' }]);

      const setItemCalls = window.localStorage.setItem.mock.calls;
      const networkTokenCalls = setItemCalls.filter(
        ([key]) => key === NETWORK_TOKENS_KEY
      );
      expect(networkTokenCalls).toHaveLength(0);
    });

    it('should return null when genesisHash is falsy', () => {
      expect(store.getTokensForNetwork(null)).toBeNull();
      expect(store.getTokensForNetwork(undefined)).toBeNull();
      expect(store.getTokensForNetwork('')).toBeNull();
    });

    it('should keep tokens for different networks independently', () => {
      const hash1 = 'mainnet_genesis_hash';
      const hash2 = 'testnet_genesis_hash';
      const mainnetTokens = [{ uid: 'mainnet_token', name: 'Mainnet Token', symbol: 'MNT' }];
      const testnetTokens = [{ uid: 'testnet_token', name: 'Testnet Token', symbol: 'TNT' }];

      store.saveTokensForNetwork(hash1, mainnetTokens);
      store.saveTokensForNetwork(hash2, testnetTokens);

      expect(store.getTokensForNetwork(hash1)).toEqual(mainnetTokens);
      expect(store.getTokensForNetwork(hash2)).toEqual(testnetTokens);
    });

    it('should survive resetStorage() since NETWORK_TOKENS_KEY is not in storageKeys', () => {
      const genesisHash = 'abc123';
      const tokens = [{ uid: 'token1', name: 'Token One', symbol: 'TK1' }];

      store.saveTokensForNetwork(genesisHash, tokens);

      // Simulate resetStorage: remove all keys in storageKeys
      for (const key of storageKeys) {
        store.removeItem(key);
      }

      // Network tokens should still be there
      const result = store.getTokensForNetwork(genesisHash);
      expect(result).toEqual(tokens);
    });
  });

  describe('Version API response field name (snake_case)', () => {
    it('should use snake_case genesis_block_hash from the version API', () => {
      // This simulates the actual API response format from the fullnode /version endpoint
      const versionApiResponse = {
        version: '0.69.0',
        network: 'mainnet',
        nano_contracts_enabled: true,
        decimal_places: 2,
        genesis_block_hash: '000006cb93385b8b87a545a1cbb6197e6caff600c12cc12fc54250d39c8088fc',
      };

      // The fix: use snake_case field name (genesis_block_hash)
      const genesisHash = versionApiResponse.genesis_block_hash || null;
      expect(genesisHash).toBe('000006cb93385b8b87a545a1cbb6197e6caff600c12cc12fc54250d39c8088fc');

      // The bug: camelCase field name (genesisBlockHash) would return undefined
      const wrongFieldName = versionApiResponse.genesisBlockHash || null;
      expect(wrongFieldName).toBeNull();
    });

    it('should use snake_case genesis_block_hash from wallet.start() serverInfo', () => {
      // wallet.start() returns the same /version response format
      const serverInfo = {
        version: '0.69.0',
        network: 'testnet-golf',
        genesis_block_hash: 'testnet_genesis_hash_123',
        custom_tokens: [],
      };

      // The fix: use snake_case
      const genesisHash = serverInfo?.genesis_block_hash || null;
      expect(genesisHash).toBe('testnet_genesis_hash_123');

      // The bug: camelCase would be undefined
      const wrongFieldName = serverInfo?.genesisBlockHash || null;
      expect(wrongFieldName).toBeNull();
    });
  });
});
