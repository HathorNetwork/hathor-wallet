/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Constants defined for the Hathor Wallet
 * @module Constants
 */

import { t } from 'ttag';
import scssColors from './index.module.scss';
import packageInfo from '../package.json';

/**
 * Quantity of elements to show in the wallet history
 */
export const WALLET_HISTORY_COUNT = 10;

/**
 * Wallet version
 */
export const VERSION = packageInfo.version;

/**
 * Before this version the data in localStorage from the wallet is not compatible
 * So we must reset the wallet to continue using it
 */
export const FIRST_WALLET_COMPATIBLE_VERSION = '0.11.0';

/**
 * Max level of the graph generated by the full node in the transaction detail screen
 */
export const MAX_GRAPH_LEVEL = 1;

/**
 * How many words will be used to validate the backup
 */
export const WORDS_VALIDATION = 5;

/**
 * Message to be written when user wants to reset all wallet data
 */
export const CONFIRM_RESET_MESSAGE = t`I want to reset my wallet`;

/**
 * Password regex pattern for validation
 * - The string must contain at least 1 lowercase alphabetical character
 * - The string must contain at least 1 uppercase alphabetical character
 * - The string must contain at least 1 numeric character
 * - The string must contain at least one special character (not alphanumeric)
 * - The string must be eight characters or longer
 */
export const PASSWORD_PATTERN = "(?=^.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^0-9a-zA-Z]).*$"

/**
 * Local storage data useful for debugging purposes.
 * WARNING: we cannot include any arbitrarily large fields (e.g. wallet:data) on Sentry request.
 * WARNING: the request has a max size of 200kb and if it is bigger than this it'll be denied by Sentry.
 */
export const DEBUG_LOCAL_DATA_KEYS = [
  `wallet:server`,
  `wallet:tokens`,
  `wallet:started`,
  `wallet:backup`,
  `wallet:locked`,
  `wallet:closed`,
  `wallet:lastSharedIndex`,
  `wallet:lastGeneratedIndex`,
  `wallet:lastUsedIndex`,
  `wallet:lastUsedAddress`,
  `wallet:address`
];

/**
 * Sentry connection DSN
 */
export const SENTRY_DSN = process.env.SENTRY_DSN || 'https://69c067d1587c465cac836eaf25467ce1@sentry.io/1410476';

/**
 * URL of token deposit RFC
 */
export const TOKEN_DEPOSIT_RFC_URL = "https://gitlab.com/HathorNetwork/rfcs/blob/master/text/0011-token-deposit.md";

/**
 * URL of NFT standard
 */
export const NFT_STANDARD_RFC_URL = "https://github.com/HathorNetwork/rfcs/blob/master/text/0032-nft-standard.md";

export const HATHOR_WEBSITE_URL = "https://hathor.network/";

/**
 * Minimum job estimation to show to the user in seconds when mining a tx
 */
export const MIN_JOB_ESTIMATION = 1;

let ipcRenderer = null;

if (window.require) {
  // Requiring electron outside main thread must be done like that
  // https://github.com/electron/electron/issues/7300
  const electron = window.require('electron');
  ipcRenderer = electron.ipcRenderer;
}

/**
 * IPC renderer to communicate with electron main process
 */
export const IPC_RENDERER = ipcRenderer;

/**
 * Flag to hide/show create NFT button
 */
export const NFT_ENABLED = true;

/**
 * Maximum size of NFT data length
 */
export const NFT_DATA_MAX_SIZE = 150;

/**
 * Number of NFT elements per page in the NFT list screen
 */
export const NFT_LIST_PER_PAGE = 6;

/**
 * Allowed media types for NFT
 */
export const NFT_MEDIA_TYPES = {
  image: 'IMAGE',
  video: 'VIDEO',
  audio: 'AUDIO',
  pdf: 'PDF',
}

/**
 * Map of video file extensions to media types in html
 */
export const VIDEO_MEDIA_TYPES_BY_EXTENSION = {
  mp4: 'video/mp4',
  ogg: 'video/ogg',
  webm: 'video/webm'
}

/**
 * Map of audio file extensions to media types in html
 */
export const AUDIO_MEDIA_TYPES_BY_EXTENSION = {
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav'
}

/**
 * URL for the ledger guide
 */
export const LEDGER_GUIDE_URL = 'https://hathor.network/ledger-guide';

/**
 * URL for the NFT guide
 */
export const NFT_GUIDE_URL = 'https://hathor.network/nft-guide';

/**
 * URL for the Terms of Service
 */
export const TERMS_OF_SERVICE_URL = 'https://hathor.network/terms-and-conditions/';

/**
 * URL for the Privacy Policy
 */
export const PRIVACY_POLICY_URL = 'https://hathor.network/privacy-policy/';

/**
 * How many token meta we are downloading concurrently
 */
export const METADATA_CONCURRENT_DOWNLOAD = 10;

/**
 * Ledger token version to use when sending a token to ledger
 */
export const LEDGER_TOKEN_VERSION = 1;

/**
 * How many custom tokens a tx can have when signing with Ledger
 */
export const LEDGER_TX_CUSTOM_TOKEN_LIMIT = 10;

/**
 * Min Ledger app version supported by this wallet
 */
export const LEDGER_MIN_VERSION = '1.0.0';

/**
 * Max Ledger app version supported by this wallet
 * Obs: max not inclusive, so we do NOT support this version
 */
export const LEDGER_MAX_VERSION = '2.0.0';

/**
 * First Ledger version with support for custom tokens
 */
export const LEDGER_FIRST_CUSTOM_TOKEN_COMPATIBLE_VERSION = '1.1.0'

/**
 * Unleash constants
 */
export const UNLEASH_URL = 'https://unleash-proxy.b7e6a7f52ee9fefaf0c53e300cfcb014.hathor.network/proxy';
export const UNLEASH_CLIENT_KEY = 'wKNhpEXKa39aTRgIjcNsO4Im618bRGTq';
export const UNLEASH_POLLING_INTERVAL = 12 * 1000; // 12s

/**
 * Flag name stored in localStorage to ignore the FeatureToggle for wallet service
 */
export const IGNORE_WS_TOGGLE_FLAG = 'featureFlags:ignoreWalletServiceFlag';

/**
 * The feature toggle configured in Unleash
 */
export const WALLET_SERVICE_FEATURE_TOGGLE = 'wallet-service-desktop.rollout';
export const ATOMIC_SWAP_SERVICE_FEATURE_TOGGLE = 'atomic-swap-service-desktop.rollout';
export const NANO_CONTRACTS_FEATURE_TOGGLE = 'nano-contracts-desktop.rollout';
export const REOWN_FEATURE_TOGGLE = 'wallet-desktop-reown.rollout';

export const FEATURE_TOGGLE_DEFAULTS = {
  [WALLET_SERVICE_FEATURE_TOGGLE]: false,
  [ATOMIC_SWAP_SERVICE_FEATURE_TOGGLE]: false,
  [NANO_CONTRACTS_FEATURE_TOGGLE]: false,
  [REOWN_FEATURE_TOGGLE]: false,
};

/**
 * This property filters the full exported scss properties and exposes only the ones
 * relevant to the javascript context.
 * @type {object}
 */
export const colors = {
  purpleHathor: scssColors.purpleHathor,
}

/**
 * Number of elements in the list of addresses
 * when changing the address of a nano contract
 */
export const NANO_UPDATE_ADDRESS_LIST_COUNT = 5;

/**
 * Number of elements in the list of transactions of a nano contract
 */
export const NANO_CONTRACT_HISTORY_COUNT = 5;

/**
 * Pre settings for mainnet, testnet, and nano testnet
 * We define the values for network, node, txMining, explorer, explorer service, wallet service and its ws
 */
export const NETWORK_SETTINGS = {
  mainnet: {
    network: 'mainnet',
    node: 'https://node1.mainnet.hathor.network/v1a/',
    txMining: 'https://txmining.mainnet.hathor.network/',
    explorer: 'https://explorer.hathor.network',
    explorerService: 'https://explorer-service.hathor.network/',
    walletService: 'https://wallet-service.hathor.network/',
    walletServiceWS: 'wss://ws.wallet-service.hathor.network/',
  },
  testnet: {
    network: 'testnet',
    node: 'https://node1.testnet.hathor.network/v1a/',
    txMining: 'https://txmining.testnet.hathor.network/',
    explorer: 'https://explorer.testnet.hathor.network',
    explorerService: 'https://explorer-service.testnet.hathor.network/',
    walletService: 'https://wallet-service.testnet.hathor.network/',
    walletServiceWS: 'wss://ws.wallet-service.testnet.hathor.network/',
  },
  nanoTestnet: {
    network: 'testnet',
    node: 'https://node1.bravo.nano-testnet.hathor.network/v1a/',
    txMining: 'https://txmining.bravo.nano-testnet.hathor.network/',
    explorer: 'https://explorer.bravo.alpha.nano-testnet.hathor.network/',
    explorerService: 'https://explorer-service.bravo.nano-testnet.hathor.network/',
    walletService: 'https://wallet-service.bravo.nano-testnet.hathor.network/',
    walletServiceWS: 'wss://ws.wallet-service.bravo.nano-testnet.hathor.network/',
  }
}

/**
 * Base statuses for saga reducer handlers
 * Used by all other statuses objects
 */
export const BASE_STATUS = {
  READY: 'ready',
  ERROR: 'error',
  LOADING: 'loading',
  SUCCESS: 'success',
}

/**
 * Nano contract detail load data statuses for saga reducer handlers
 */
export const NANO_CONTRACT_DETAIL_STATUS = {
  ...BASE_STATUS,
  WAITING_TX_CONFIRMATION: 'waitingTxConfirmation',
}

/**
 * Network settings statuses for saga reducer handlers
 */
export const NETWORK_SETTINGS_STATUS = {
  ...BASE_STATUS,
  WAITING_NETWORK_CONFIRMATION: 'waitingNetworkConfirmation',
  NETWORK_CONFIRMED: 'networkConfirmed'
}

// Reown constants
export const REOWN_PROJECT_ID = '8264fff563181da658ce64ee80e80458';

/**
 * Reown connection states
 */
export const REOWN_CONNECTION_STATE = {
  IDLE: 'idle',             // Initial state, no connection attempt in progress
  CONNECTING: 'connecting', // Connection attempt in progress
  SUCCESS: 'success',       // Connection successful
  FAILED: 'failed',         // Connection failed
};
