/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Control surface for the fake Sdk: each test sets the contract map the node
 * would answer with and what `resolve_name` returns.
 */
const mockSdkState = {
  /** Map collected by a discovery call */
  contractIds: {},
  /** address (string) or Error to throw */
  resolution: 'WSoSypkhE8i3iZxZvXCq91vWDwr8wKFVVq',
  /** Error thrown by a discovery call, when set */
  discoveryError: null,
  refreshCount: 0,
  resolveCount: 0,
  lastOptions: null,
};

jest.mock('thoth-id-sdk', () => ({
  ThothIdSDK: jest.fn().mockImplementation((opts = {}) => {
    mockSdkState.lastOptions = opts;
    // Mirrors the real Sdk: a seeded map is used as-is, otherwise the instance
    // starts empty and only a discovery call fills it in
    let contractIds = { ...(opts.contractIds || {}) };

    return {
      getContractIdForDomain: (suffix) => contractIds[suffix],
      getDomains: () => Object.keys(contractIds),
      exportContractIds: () => ({ ...contractIds }),
      refreshContractIds: async () => {
        mockSdkState.refreshCount += 1;
        if (mockSdkState.discoveryError) {
          throw mockSdkState.discoveryError;
        }
        contractIds = { ...mockSdkState.contractIds };
        return { ...contractIds };
      },
      resolveName: async () => {
        mockSdkState.resolveCount += 1;
        if (mockSdkState.resolution instanceof Error) {
          throw mockSdkState.resolution;
        }
        return mockSdkState.resolution;
      },
    };
  }),
}));

const mockStorage = {};
jest.mock('../../storage', () => ({
  __esModule: true,
  THOTH_ID_CONTRACTS_KEY: 'localstorage:thothIdContracts',
  default: {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, value) => { mockStorage[key] = value; },
    removeItem: (key) => { delete mockStorage[key]; },
  },
}));

const mockValidateAddress = jest.fn(() => true);
jest.mock('../../utils/wallet', () => ({
  __esModule: true,
  default: { validateAddress: (address) => mockValidateAddress(address) },
}));

jest.mock('@hathor/wallet-lib', () => ({
  __esModule: true,
  default: {
    config: {
      getNetwork: () => ({ name: 'testnet' }),
      getServerUrl: () => 'https://node1.testnet.hathor.network/v1a/',
    },
  },
}));

const TESTNET = { network: 'testnet', nodeUrl: 'https://node1.testnet.hathor.network/v1a/' };
const HTR_CONTRACT = '00001f87ed606c28465afac15fe3805736993f77d4cc83da026531e120469d73';
const ADDRESS = 'WSoSypkhE8i3iZxZvXCq91vWDwr8wKFVVq';

let thothId;

/**
 * The module keeps the Sdk instance and its caches in module scope, so each
 * test starts from a fresh copy of it.
 */
const loadModule = () => {
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    thothId = require('../../utils/thothId');
  });
};

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => { delete mockStorage[key]; });
  mockSdkState.contractIds = { htr: HTR_CONTRACT, tst: 'tst-contract' };
  mockSdkState.resolution = ADDRESS;
  mockSdkState.discoveryError = null;
  mockSdkState.refreshCount = 0;
  mockSdkState.resolveCount = 0;
  mockSdkState.lastOptions = null;
  mockValidateAddress.mockClear();
  mockValidateAddress.mockImplementation(() => true);
  loadModule();
});

describe('isThothIdName', () => {
  it('accepts a label plus a domain suffix', () => {
    expect(thothId.isThothIdName('alice.htr')).toBe(true);
    expect(thothId.isThothIdName('ALICE.HTR')).toBe(true);
    expect(thothId.isThothIdName('  alice.htr  ')).toBe(true);
    expect(thothId.isThothIdName('my-wallet_2.tst')).toBe(true);
  });

  it('rejects anything that is not a name', () => {
    expect(thothId.isThothIdName(ADDRESS)).toBe(false);
    expect(thothId.isThothIdName('alice')).toBe(false);
    expect(thothId.isThothIdName('alice.')).toBe(false);
    expect(thothId.isThothIdName('.htr')).toBe(false);
    expect(thothId.isThothIdName('alice htr.htr')).toBe(false);
    expect(thothId.isThothIdName('-alice.htr')).toBe(false);
    expect(thothId.isThothIdName('')).toBe(false);
    expect(thothId.isThothIdName(undefined)).toBe(false);
  });
});

describe('isThothIdEnabled', () => {
  it('is enabled on testnet only', () => {
    expect(thothId.isThothIdEnabled('testnet')).toBe(true);
    expect(thothId.isThothIdEnabled('mainnet')).toBe(false);
    expect(thothId.isThothIdEnabled('privatenet')).toBe(false);
  });

  it('falls back to the network the wallet is connected to', () => {
    expect(thothId.isThothIdEnabled()).toBe(true);
  });
});

describe('toThothNodeUrl', () => {
  it('strips the API path the Sdk appends itself', () => {
    expect(thothId.toThothNodeUrl('https://node1.testnet.hathor.network/v1a/'))
      .toBe('https://node1.testnet.hathor.network');
    expect(thothId.toThothNodeUrl('https://node1.testnet.hathor.network/v1a/nano_contract/state'))
      .toBe('https://node1.testnet.hathor.network');
    expect(thothId.toThothNodeUrl('https://node1.testnet.hathor.network'))
      .toBe('https://node1.testnet.hathor.network');
    expect(thothId.toThothNodeUrl('')).toBe('');
  });
});

describe('resolveThothName', () => {
  it('resolves a name to its address', async () => {
    await expect(thothId.resolveThothName('Alice.HTR', TESTNET))
      .resolves.toEqual({ name: 'alice.htr', address: ADDRESS });
  });

  it('refuses to resolve outside testnet', async () => {
    await expect(thothId.resolveThothName('alice.htr', { network: 'mainnet', nodeUrl: 'https://node' }))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.UNSUPPORTED_NETWORK });
    expect(mockSdkState.resolveCount).toBe(0);
  });

  it('rejects text that is not a name', async () => {
    await expect(thothId.resolveThothName(ADDRESS, TESTNET))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.INVALID_NAME });
  });

  it('reports a name nobody registered', async () => {
    mockSdkState.resolution = new Error('Nano contract error: NameNotFound()');
    await expect(thothId.resolveThothName('nobody.htr', TESTNET))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.NAME_NOT_FOUND });
  });

  it('reports a domain no registry answers for', async () => {
    await expect(thothId.resolveThothName('alice.nope', TESTNET))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.UNKNOWN_DOMAIN });
    expect(mockSdkState.resolveCount).toBe(0);
  });

  it('reports a node that could not be reached', async () => {
    mockSdkState.resolution = new Error('Request timed out after 15000ms');
    await expect(thothId.resolveThothName('alice.htr', TESTNET))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.REQUEST_FAILED });
  });

  it('rejects an address the wallet could not spend to', async () => {
    mockValidateAddress.mockImplementation(() => false);
    await expect(thothId.resolveThothName('alice.htr', TESTNET))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.INVALID_ADDRESS });
  });

  it('reuses a resolved name instead of asking the node again', async () => {
    await thothId.resolveThothName('alice.htr', TESTNET);
    await thothId.resolveThothName('alice.htr', TESTNET);
    expect(mockSdkState.resolveCount).toBe(1);
  });

  it('collects the contract map once and caches it for later sessions', async () => {
    await thothId.resolveThothName('alice.htr', TESTNET);
    await thothId.resolveThothName('bob.tst', TESTNET);
    expect(mockSdkState.refreshCount).toBe(1);

    const cache = mockStorage['localstorage:thothIdContracts'];
    const contextKey = 'testnet|https://node1.testnet.hathor.network';
    expect(cache[contextKey].contractIds).toEqual({ htr: HTR_CONTRACT, tst: 'tst-contract' });

    // A wallet started again reads the map from storage and skips discovery
    loadModule();
    mockSdkState.refreshCount = 0;
    await thothId.resolveThothName('alice.htr', TESTNET);
    expect(mockSdkState.lastOptions.contractIds).toEqual({ htr: HTR_CONTRACT, tst: 'tst-contract' });
    expect(mockSdkState.refreshCount).toBe(0);
  });

  it('does not re-collect the map for every unknown domain typed', async () => {
    await thothId.resolveThothName('alice.htr', TESTNET);
    expect(mockSdkState.refreshCount).toBe(1);

    await expect(thothId.resolveThothName('alice.nope', TESTNET)).rejects.toBeDefined();
    await expect(thothId.resolveThothName('alice.nope', TESTNET)).rejects.toBeDefined();
    expect(mockSdkState.refreshCount).toBe(1);
  });

  it('keeps maps of different networks apart', async () => {
    await thothId.resolveThothName('alice.htr', TESTNET);

    // Same network name, different chain: the map must not be reused
    mockSdkState.contractIds = { htr: 'other-chain-contract' };
    await thothId.resolveThothName('alice.htr', { network: 'testnet', nodeUrl: 'http://localhost:8080/v1a/' });

    const cache = mockStorage['localstorage:thothIdContracts'];
    expect(cache['testnet|https://node1.testnet.hathor.network'].contractIds)
      .toEqual({ htr: HTR_CONTRACT, tst: 'tst-contract' });
    expect(cache['testnet|http://localhost:8080'].contractIds)
      .toEqual({ htr: 'other-chain-contract' });
  });

  it('lets a failed collection be retried', async () => {
    mockSdkState.discoveryError = new Error('Node responded 503');
    await expect(thothId.resolveThothName('alice.htr', TESTNET))
      .rejects.toMatchObject({ code: thothId.THOTH_ID_ERROR.REQUEST_FAILED });

    mockSdkState.discoveryError = null;
    await expect(thothId.resolveThothName('alice.htr', TESTNET))
      .resolves.toEqual({ name: 'alice.htr', address: ADDRESS });
    expect(mockSdkState.refreshCount).toBe(2);
  });

  it('shares a single collection between simultaneous lookups', async () => {
    await Promise.all([
      thothId.resolveThothName('alice.htr', TESTNET),
      thothId.resolveThothName('bob.htr', TESTNET),
    ]);
    expect(mockSdkState.refreshCount).toBe(1);
  });
});
