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

/**
 * Quantity of elements to show in the wallet history
 */
export const WALLET_HISTORY_COUNT = 10;

/**
 * Wallet version
 */
export const VERSION = '0.20.1';

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
 * Server options for the user to choose which one to connect
 */
export const DEFAULT_SERVERS = [
  'https://node1.mainnet.hathor.network/v1a/',
  'https://node2.mainnet.hathor.network/v1a/',
];

/**
 * Default server user will connect when none has been chosen
 */
export const DEFAULT_SERVER = DEFAULT_SERVERS[0];

/**
 * Explorer base url
 */
export const EXPLORER_BASE_URL = "https://explorer.hathor.network";

/**
 * Testnet explorer base url
 */
export const TESTNET_EXPLORER_BASE_URL = "https://explorer.testnet.hathor.network";

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
 * Flag to hide/show elements after ledger integration is done
 */
export const LEDGER_ENABLED = true;

/**
 * Flag to hide/show create NFT button
 */
export const NFT_ENABLED = false;

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
 * Limit of retries when downloading token metadata
 */
export const METADATA_RETRY_LIMIT = 5;

/**
 * Interval between metadata download retries in milliseconds
 */
export const DOWNLOAD_METADATA_RETRY_INTERVAL = 5000;
