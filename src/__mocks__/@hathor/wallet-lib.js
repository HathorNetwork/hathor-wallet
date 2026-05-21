/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Centralized mock for @hathor/wallet-lib.
 *
 * The real wallet-lib transitively imports axios, which is ESM-only since v1
 * and breaks Jest's default Babel transform pipeline. Mocking the package at
 * its public surface dissolves the entire import chain — Jest never has to
 * parse axios, web crypto, websockets, or any other ESM dependency the lib
 * pulls in for runtime use.
 *
 * What this mock provides:
 *   - Constants the wallet's reducers and utils read at module-load time.
 *     These MUST have realistic values (string UIDs, numeric DECIMAL_PLACES)
 *     because reducer initial-state computation depends on them.
 *   - Stubbed instances/classes (HathorWallet, Network, Address) so module-load
 *     succeeds. Tests that need behavior override per-file via jest.spyOn or
 *     jest.mock with a custom factory.
 *
 * Updating this mock:
 *   When wallet-lib changes a public export shape, add it here. The goal is
 *   "import-time satisfies all callers," not "behaviorally complete." Behavior
 *   is owned by the calling tests via per-test overrides.
 */

const NATIVE_TOKEN_UID = '00';

const constants = {
  NATIVE_TOKEN_UID,
  DEFAULT_NATIVE_TOKEN_CONFIG: { name: 'Hathor', symbol: 'HTR', uid: NATIVE_TOKEN_UID },
  HATHOR_TOKEN_CONFIG: { name: 'Hathor', symbol: 'HTR', uid: NATIVE_TOKEN_UID },
  HATHOR_TOKEN_INDEX: 0,
  DECIMAL_PLACES: 2,
  TOKEN_DEPOSIT_PERCENTAGE: 0.01,
  TOKEN_INFO_VERSION: 1,
  TOKEN_DEFAULT_VERSION: 1,
  TOKEN_MINT_MASK: 0b00000001,
  TOKEN_MELT_MASK: 0b00000010,
  TOKEN_INDEX_MASK: 0b01111111,
  TOKEN_AUTHORITY_MASK: 0b10000000,
  HATHOR_BIP44_CODE: 280,
  HD_WALLET_ENTROPY: 256,
  P2PKH_ACCT_PATH: "m/44'/280'/0'",
  WALLET_SERVICE_AUTH_DERIVATION_PATH: "m/280'/280'",
  GAP_LIMIT: 20,
  MAX_INPUTS: 255,
  MAX_OUTPUTS: 255,
  MAX_OUTPUT_VALUE: 9223372036854775807n,
  FEE_PER_OUTPUT: 1n,
  MIN_API_VERSION: '0.39.0',
  CREATE_TOKEN_TX_VERSION: 2,
  DEFAULT_TX_VERSION: 1,
  TOKEN_AUTHORITY_VERSION: 0,
  TOKEN_FEE_VERSION: 2,
  NANO_CONTRACTS_VERSION: 4,
  NANO_CONTRACTS_INITIALIZE_METHOD: 'initialize',
};

const numberUtils = {
  prettyValue: jest.fn((value) => {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'bigint' ? Number(value) : Number(value);
    return (num / 100).toFixed(2);
  }),
  bigIntCoercibleSchema: jest.fn(),
};

const tokensUtils = {
  getDepositAmount: jest.fn(() => 0n),
  getMaximumAmount: jest.fn(() => 0n),
  isValidTokenSymbol: jest.fn(() => true),
  isValidTokenName: jest.fn(() => true),
  isTokenConfigMatched: jest.fn(() => true),
  isAuthorityOutput: jest.fn(() => false),
};

const walletUtils = {
  generateWalletWords: jest.fn(() => 'word '.repeat(24).trim()),
  wordsValid: jest.fn(() => ({ valid: true, words: 'word '.repeat(24).trim() })),
  getMultiSigXPubFromWords: jest.fn(),
  isXpubKeyValid: jest.fn(() => true),
};

const transaction = {
  getTokenIndex: jest.fn(() => 0),
};

const swapService = {
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const metadataApi = {
  getDagMetadata: jest.fn().mockResolvedValue({}),
};

const errors = {
  WalletError: class WalletError extends Error {},
  SendTxError: class SendTxError extends Error {},
  WalletFromXPubGuard: class WalletFromXPubGuard extends Error {},
  PinRequiredError: class PinRequiredError extends Error {},
  LedgerError: class LedgerError extends Error {},
};

const HathorWallet = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  getBalance: jest.fn().mockResolvedValue([]),
  getTxHistory: jest.fn().mockResolvedValue([]),
  getAddressAtIndex: jest.fn().mockResolvedValue('Wabc'),
  getCurrentAddress: jest.fn().mockResolvedValue({ address: 'Wabc', index: 0 }),
  isReady: jest.fn(() => true),
  state: 'ready',
  conn: { network: 'testnet', state: 'CONNECTED' },
  storage: {
    getRegisteredTokens: jest.fn().mockReturnValue({
      next: jest.fn().mockResolvedValue({ done: true, value: null }),
    }),
    registerToken: jest.fn().mockResolvedValue(undefined),
    unregisteredToken: jest.fn().mockResolvedValue(undefined),
    unregisterToken: jest.fn().mockResolvedValue(undefined),
    getAccessData: jest.fn().mockResolvedValue({}),
  },
}));

const Network = jest.fn().mockImplementation((name) => ({ name }));
const Address = jest.fn().mockImplementation((value) => ({
  base58: value,
  toString: () => value,
}));
const Transaction = jest.fn();
const SendTransaction = jest.fn();
const Fee = jest.fn();

const PartialTxProposal = {
  fromPartialTx: jest.fn(),
};
const PartialTx = jest.fn();

const ErrorMessages = {
  UNEXPECTED_PUSH_TX_ERROR: 'UNEXPECTED_PUSH_TX_ERROR',
  NO_UTXOS_AVAILABLE: 'NO_UTXOS_AVAILABLE',
  TOKEN_ERROR: 'TOKEN_ERROR',
  NANO_CONTRACT_ERROR: 'NANO_CONTRACT_ERROR',
};

class MemoryStore {
  constructor() { this.data = {}; }
  getItem(k) { return this.data[k]; }
  setItem(k, v) { this.data[k] = v; }
  removeItem(k) { delete this.data[k]; }
  saveAccessData() { return Promise.resolve(); }
  getAccessData() { return Promise.resolve({}); }
}
const Storage = jest.fn();

const TokenVersion = { DEPOSIT: 1, FEE: 2 };
const WalletType = { P2PKH: 'P2PKH', MULTISIG: 'MULTISIG' };
const OutputType = { P2PKH: 'P2PKH', P2SH: 'P2SH', DATA: 'DATA' };
const NanoContractActionType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  GRANT_AUTHORITY: 'grant_authority',
  ACQUIRE_AUTHORITY: 'acquire_authority',
};

const cryptoUtils = {
  hashData: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn(),
};
const dateUtils = {
  prettyDate: jest.fn((d) => String(d)),
};
const scriptsUtils = {
  parseScript: jest.fn(),
};
const bufferUtils = {
  hexToBuffer: jest.fn((hex) => Buffer.from(hex, 'hex')),
  bufferToHex: jest.fn((buf) => buf.toString('hex')),
};
const bigIntUtils = {
  JSONBigInt: { stringify: JSON.stringify, parse: JSON.parse },
};

const hathorLib = {
  constants,
  numberUtils,
  tokensUtils,
  walletUtils,
  transaction,
  swapService,
  metadataApi,
  errors,
  HathorWallet,
  Network,
  Address,
  Transaction,
  SendTransaction,
  Fee,
  PartialTxProposal,
  PartialTx,
  ErrorMessages,
  MemoryStore,
  Storage,
  TokenVersion,
  WalletType,
  OutputType,
  NanoContractActionType,
  cryptoUtils,
  dateUtils,
  scriptsUtils,
  bufferUtils,
  bigIntUtils,
  network: { Network },
  storage: {},
  config: {
    setNetwork: jest.fn(),
    setServerUrl: jest.fn(),
    getServerUrl: jest.fn(() => 'https://mock-fullnode.example/'),
    getNetwork: jest.fn(() => ({ name: 'testnet' })),
  },
  // wallet helpers used by saga files
  wallet: {
    isAddressMine: jest.fn(() => false),
    getAddressIndex: jest.fn(() => 0),
  },
};

module.exports = {
  __esModule: true,
  default: hathorLib,
  ...hathorLib,
};
