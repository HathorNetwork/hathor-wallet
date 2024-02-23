/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';
import { FEATURE_TOGGLE_DEFAULTS, VERSION } from '../constants';
import { types } from '../actions';
import { get } from 'lodash';
import { TOKEN_DOWNLOAD_STATUS } from '../sagas/tokens';
import { WALLET_STATUS } from '../sagas/wallet';
import { PROPOSAL_DOWNLOAD_STATUS } from '../utils/atomicSwap';
import { HATHOR_TOKEN_CONFIG } from "@hathor/wallet-lib/lib/constants";
import helpersUtils from '../utils/helpers';
import LOCAL_STORE from '../storage';

/**
 * @typedef TokenHistory
 * Stores the history for a token
 * @property {string} status
 * @property {string} oldStatus
 * @property {number} updatedAt
 * @property {TxHistory[]} data
 */

/**
 * @typedef TokenBalance
 * Stores the balance for a token
 * @property {string} status
 * @property {string} oldStatus
 * @property {number} updatedAt
 * @property data
 * @property {number} data.available
 * @property {number} data.locked
 */

const initialState = {
  /**
   * Stores the history for each token
   * @type Record<string, TokenHistory>
   */
  tokensHistory: {},
  /**
   * Stores the balance for each token
   * @type Record<string, TokenBalance>
   */
  tokensBalance: {},
  // Address to be used and is shown in the screen
  lastSharedAddress: null,
  // Index of the address to be used
  lastSharedIndex: null,
  // If the backend API version is allowed for this admin (boolean)
  isVersionAllowed: undefined,
  // If the connection with the server is online
  isOnline: false,
  // Network that you are connected
  network: undefined,
  // Config of the last request that failed
  lastFailedRequest: undefined,
  // Status code of last failed response
  requestErrorStatusCode: undefined,
  // Wallet password
  password: undefined,
  // Wallet pin
  pin: undefined,
  // Wallet words
  words: undefined,
  // Tokens already saved: array of objects
  // {'name', 'symbol', 'uid'}
  tokens: [hathorLib.constants.HATHOR_TOKEN_CONFIG],
  // Token selected (by default is HATHOR)
  selectedToken: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid,
  // List of all tokens seen in transactions
  allTokens: new Set(),
  // If is in the proccess of loading addresses transactions from the full node
  // When the request to load addresses fails this variable can continue true
  loadingAddresses: false,
  loadedData: { transactions: 0, addresses: 0 },
  // Height of the best chain of the network arrived from ws data
  height: 0,
  wallet: null,
  walletState: null,
  // Metadata of tokens
  tokenMetadata: {},
  // Token list of uids that had errors when loading metadata
  tokenMetadataErrors: [],
  // When metadata is loaded from the lib
  metadataLoaded: false,
  // Should we use the wallet service facade?
  useWalletService: false,
  // Promise to be resolved when the user inputs his PIN correctly on the LockedWallet screen
  lockWalletPromise: null,
  // Track if the Ledger device app was closed while the wallet was loaded.
  ledgerWasClosed: false,
  serverInfo: {
    network: null,
    version: null,
  },
  // This should store the last action dispatched to the START_WALLET_REQUESTED so we can retry
  // in case the START_WALLET saga fails
  startWalletAction: null,
  // RouterHistory object
  routerHistory: null,
  /**
   * Indicates if the Atomic Swap feature is available for use
   * @type {boolean}
   */
  useAtomicSwap: false,
  /**
   * A map of proposals being listened to and/or manipulated by this wallet
   * @type {Record<string,ReduxProposalData>}
   */
  proposals: {},
  /**
   * A local cache of the minimum token identifying data from all sources:
   * - Those that were registered by the user
   * - Those that have at least one transaction on this wallet
   * - Those that were present in at least one proposal in which this wallet participated
   * @type {Record<string,{ tokenUid: string, symbol: string, name: string, status: string, oldStatus?: string }>}
   */
  tokensCache: {
    '00': {
      tokenUid: HATHOR_TOKEN_CONFIG.uid,
      symbol: HATHOR_TOKEN_CONFIG.symbol,
      name: HATHOR_TOKEN_CONFIG.name,
      status: TOKEN_DOWNLOAD_STATUS.READY
    }
  },
  unleashClient: null,
  featureTogglesInitialized: false,
  featureToggles: {
    ...FEATURE_TOGGLE_DEFAULTS,
  },
  // Registered nano contracts in the wallet
  // { id: string, address: string, history: Array[Object] }
  nanoContracts: {},
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'history_update':
      return Object.assign({}, state, {
        allTokens: action.payload.allTokens,
        lastSharedIndex: action.payload.lastSharedIndex,
        lastSharedAddress: action.payload.lastSharedAddress,
        addressesFound: action.payload.addressesFound,
        transactionsFound: action.payload.transactionsFound
      });

    case 'shared_address':
      return Object.assign({}, state, {lastSharedAddress: action.payload.lastSharedAddress, lastSharedIndex: action.payload.lastSharedIndex});
    case 'is_version_allowed_update':
      return Object.assign({}, state, {isVersionAllowed: action.payload.allowed});
    case 'is_online_update':
      return Object.assign({}, state, {isOnline: action.payload.isOnline});
    case 'network_update':
      return Object.assign({}, state, {network: action.payload.network});
    case 'reload_data':
      return Object.assign({}, state, action.payload);
    case 'clean_data':
      return onCleanData(state, action);
    case 'last_failed_request':
      return Object.assign({}, state, {lastFailedRequest: action.payload});
    case 'update_password':
      return Object.assign({}, state, {password: action.payload});
    case 'update_pin':
      return Object.assign({}, state, {pin: action.payload});
    case 'update_words':
      return Object.assign({}, state, {words: action.payload});
    case 'select_token':
      return Object.assign({}, state, {selectedToken: action.payload});
    case 'new_tokens':
      return onNewTokens(state, action);
    case 'loading_addresses_update':
      return Object.assign({}, state, {loadingAddresses: action.payload});
    case 'update_loaded_data':
      return onUpdateLoadedData(state, action);
    case 'update_request_error_status_code':
      return Object.assign({}, state, {requestErrorStatusCode: action.payload});
    case 'update_height':
      return onUpdateHeight(state, action);
    case 'set_wallet':
      return onSetWallet(state, action);
    case 'reset_wallet':
      return onResetWallet(state, action);
    case 'load_wallet_success':
      return onLoadWalletSuccess(state, action);
    case 'update_tx':
      return onUpdateTx(state, action);
    case 'update_token_history':
      return onUpdateTokenHistory(state, action);
    case 'token_metadata_updated':
      return tokenMetadataUpdated(state, action);
    case 'metadata_loaded':
      return Object.assign({}, state, {metadataLoaded: action.payload});
    case 'remove_token_metadata':
      return removeTokenMetadata(state, action);
    case 'partially_update_history_and_balance':
      return partiallyUpdateHistoryAndBalance(state, action);
    case 'set_use_wallet_service':
      return onSetUseWalletService(state, action);
    case 'lock_wallet_for_result':
      return onLockWalletForResult(state, action);
    case 'resolve_lock_wallet_promise':
      return onResolveLockWalletPromise(state, action);
    case 'reset_selected_token_if_needed':
      return resetSelectedTokenIfNeeded(state, action);
    case 'set_ledger_was_closed':
      return Object.assign({}, state, { ledgerWasClosed: action.payload });
    case 'save_nano_contract':
      return onSaveNanoContract(state, action);
    case 'save_nano_contract_history':
      return onSaveNanoContractHistory(state, action);
    case 'edit_address_nano_contract':
      return onEditAddressNanoContract(state, action);
    // TODO: Refactor all the above to use `types.` syntax
    case types.SET_SERVER_INFO:
      return onSetServerInfo(state, action);
    case types.TOKEN_FETCH_BALANCE_REQUESTED:
      return onTokenFetchBalanceRequested(state, action);
    case types.TOKEN_FETCH_BALANCE_SUCCESS:
      return onTokenFetchBalanceSuccess(state, action);
    case types.TOKEN_FETCH_BALANCE_FAILED:
      return onTokenFetchBalanceFailed(state, action);
    case types.TOKEN_FETCH_HISTORY_REQUESTED:
      return onTokenFetchHistoryRequested(state, action);
    case types.TOKEN_FETCH_HISTORY_SUCCESS:
      return onTokenFetchHistorySuccess(state, action);
    case types.TOKEN_FETCH_HISTORY_FAILED:
      return onTokenFetchHistoryFailed(state, action);
    case types.SET_ENABLE_ATOMIC_SWAP:
      return onSetUseAtomicSwap(state, action);
    case types.PROPOSAL_LIST_UPDATED:
      return onProposalListUpdated(state, action);
    case types.PROPOSAL_FETCH_REQUESTED:
      return onProposalFetchRequested(state, action);
    case types.PROPOSAL_FETCH_SUCCESS:
      return onProposalFetchSuccess(state, action);
    case types.PROPOSAL_FETCH_FAILED:
      return onProposalFetchFailed(state, action);
    case types.PROPOSAL_UPDATED:
      return onProposalUpdate(state, action);
    case types.PROPOSAL_TOKEN_FETCH_REQUESTED:
      return onProposalTokenFetchRequested(state, action);
    case types.PROPOSAL_TOKEN_FETCH_SUCCESS:
      return onProposalTokenFetchSuccess(state, action);
    case types.PROPOSAL_TOKEN_FETCH_FAILED:
      return onProposalTokenFetchFailed(state, action);
    case types.PROPOSAL_REMOVED:
      return onProposalRemoved(state, action);
    case types.PROPOSAL_IMPORTED:
      return onProposalImported(state, action);
    case types.TOKEN_INVALIDATE_HISTORY:
      return onTokenInvalidateHistory(state, action);
    case types.TOKEN_INVALIDATE_BALANCE:
      return onTokenInvalidateBalance(state, action);
    case types.ON_START_WALLET_LOCK:
      return onStartWalletLock(state);
    case types.START_WALLET_REQUESTED:
      return onStartWalletRequested(state, action);
    case types.START_WALLET_SUCCESS:
      return onStartWalletSuccess(state);
    case types.START_WALLET_FAILED:
      return onStartWalletFailed(state);
    case types.WALLET_BEST_BLOCK_UPDATE:
      return onWalletBestBlockUpdate(state, action);
    case types.STORE_ROUTER_HISTORY:
      return onStoreRouterHistory(state, action);
    case types.SET_UNLEASH_CLIENT:
      return onSetUnleashClient(state, action);
    case types.SET_FEATURE_TOGGLES:
      return onSetFeatureToggles(state, action);
    case types.FEATURE_TOGGLE_INITIALIZED:
      return onFeatureToggleInitialized(state);
    case types.WALLET_RESET_SUCCESS:
      return onWalletResetSuccess(state);
    case types.UPDATE_TX_HISTORY:
      return onUpdateTxHistory(state, action);
    case types.WALLET_CHANGE_STATE:
      return onWalletStateChanged(state, action);
    default:
      return state;
  }
};

const onSetWallet = (state, action) => {
  if (state.wallet && state.wallet.state !== hathorLib.HathorWallet.CLOSED) {
    // Wallet was not closed
    state.wallet.stop({ cleanStorage: false });
  }

  return {
    ...state,
    wallet: action.payload
  };
};

const onResetWallet = (state, action) => {
  if (state.wallet) {
    // Stop wallet
    state.wallet.stop();
  }

  return {
    ...state,
    wallet: null,
  };
};

const getTxHistoryFromWSTx = (tx, tokenUid, tokenTxBalance) => {
  return {
    tx_id: tx.tx_id,
    timestamp: tx.timestamp,
    tokenUid,
    balance: tokenTxBalance,
    is_voided: tx.is_voided,
    version: tx.version,
    isAllAuthority: helpersUtils.isAllAuthority(tx),
  }
};


/**
 * Got wallet history. Update wallet data on redux
 */
const onLoadWalletSuccess = (state, action) => {
  // Update the version of the wallet that the data was loaded
  LOCAL_STORE.setWalletVersion(VERSION);
  const { tokens, registeredTokens, currentAddress } = action.payload;
  const allTokens = new Set(tokens);

  return {
    ...state,
    loadingAddresses: false,
    lastSharedAddress: currentAddress.address,
    lastSharedIndex: currentAddress.index,
    allTokens,
    tokens: registeredTokens,
  };
};

/**
 * Updates the balance and history data when a tx is updated
 * because it might have been voided
 */
const onUpdateTx = (state, action) => {
  const { tx, updatedBalanceMap, balances } = action.payload;

  const updatedHistoryMap = {};

  for (const [tokenUid, tokenTxBalance] of Object.entries(balances)) {
    // The only tx information that might have changed is the 'isVoided'
    // so we double check it has changed and in positive case we update the history
    // data and the balance, otherwise everything is fine

    const currentHistory = state.tokensHistory[tokenUid] || [];
    const txIndex = currentHistory.findIndex((el) => {
      return el.tx_id === tx.tx_id;
    });

    const newHistory = [...currentHistory];
    newHistory[txIndex] = getTxHistoryFromWSTx(tx, tokenUid, tokenTxBalance)
    updatedHistoryMap[tokenUid] = newHistory;
  }

  const newTokensHistory = Object.assign({}, state.tokensHistory, updatedHistoryMap);
  const newTokensBalance = Object.assign({}, state.tokensBalance, updatedBalanceMap);

  return Object.assign({}, state, {
    tokensHistory: newTokensHistory,
    tokensBalance: newTokensBalance,
  });
};

const onUpdateLoadedData = (state, action) => ({
  ...state,
  loadedData: action.payload,
});

const onCleanData = (state) => {
  return Object.assign({}, initialState, {
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
    ledgerWasClosed: state.ledgerWasClosed,
    // Keep the unleashClient as it should continue running
    unleashClient: state.unleashClient,
    featureTogglesInitialized: state.featureTogglesInitialized,
  });
};

/**
 * Update token history after fetching more data in pagination
 */
const onUpdateTokenHistory = (state, action) => {
  const { token, newHistory } = action.payload;

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      [token]: {
        ...state.tokensHistory[token],
        data: [
          ...get(state.tokensHistory, `${token}.data`, []),
          ...newHistory,
        ]
      }
    },
  };
};

/**
 * Update height value on redux
 * If value is different from last value we also update HTR balance
 */
const onUpdateHeight = (state, action) => {
  if (action.payload.height !== state.height) {
    const tokensBalance = {};
    const { uid } = hathorLib.constants.HATHOR_TOKEN_CONFIG;
    tokensBalance[uid] = action.payload.htrUpdatedBalance;
    const newTokensBalance = Object.assign({}, state.tokensBalance, tokensBalance);
    return {
      ...state,
      tokensBalance: newTokensBalance,
      height: action.payload.height,
    };
  }

  return state;
};

/**
 * Update token metadata
 */
const tokenMetadataUpdated = (state, action) => {
  const { data, errors } = action.payload;
  const newMeta = Object.assign({}, state.tokenMetadata, data);
  const newErrors = [...state.tokenMetadataErrors, ...errors]

  return {
    ...state,
    metadataLoaded: true,
    tokenMetadata: newMeta,
    tokenMetadataErrors: newErrors,
  };
};

/**
 * Remove token metadata
 */
const removeTokenMetadata = (state, action) => {
  const uid = action.payload;

  const newMeta = Object.assign({}, state.tokenMetadata);
  if (uid in newMeta) {
    delete newMeta[uid];
  }

  // If the token has zero balance we should remove the balance data
  const newBalance = Object.assign({}, state.tokensBalance);
  if (uid in newBalance && (!!newBalance[uid].data)) {
    const balance = newBalance[uid].data;
    if ((balance.unlocked + balance.locked) === 0) {
      delete newBalance[uid];
    }
  }

  return {
    ...state,
    tokenMetadata: newMeta,
  };
};

/**
 * Partially update the token history and balance
 */
export const partiallyUpdateHistoryAndBalance = (state, action) => {
  const { tokensHistory, tokensBalance } = action.payload;

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      ...tokensHistory,
    },
    tokensBalance: {
      ...state.tokensBalance,
      ...tokensBalance,
    },
  };
};

/**
 * Are we using the wallet service facade?
 */
export const onSetUseWalletService = (state, action) => {
  const useWalletService = action.payload;

  return {
    ...state,
    useWalletService,
  };
};

/**
 * Sets the promise to be resolved after the user typed his PIN on lock screen
 */
export const onLockWalletForResult = (state, action) => {
  return {
    ...state,
    lockWalletPromise: action.payload,
  };
};

export const onResolveLockWalletPromise = (state, action) => {
  // Resolve the promise with the result
  // TODO: I don't like this, but we don't have in this project a way to use middlewares in our
  // actions (like redux-thunk, or redux-saga). We should refactor this if we ever start using
  // this kind of mechanism.
  state.lockWalletPromise(action.payload);

  return {
    ...state,
    lockWalletPromise: null,
  }
};

/*
 * Used When we select to hide zero balance tokens and a token with zero balance is selected
 * In that case we must select HTR
*/
export const resetSelectedTokenIfNeeded = (state, action) => {
  const tokensBalance = state.tokensBalance;
  const selectedToken = state.selectedToken;

  const balance = tokensBalance[selectedToken] || { available: 0, locked: 0 };
  const hasZeroBalance = (balance.available + balance.locked) === 0;

  if (hasZeroBalance) {
    return {
      ...state,
      selectedToken: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid
    };
  }

  return state;
};

/*
 * Used when registering or creating tokens to update the wallet token list.
*/
export const onNewTokens = (state, action) => {
  // Add new created token to the all tokens set
  state.allTokens.add(action.payload.uid);

  return {
    ...state,
    selectedToken: action.payload.uid,
    tokens: action.payload.tokens,
  };
};

/**
 * @param {String} action.tokenId - The tokenId to mark as loading
 */
export const onTokenFetchBalanceRequested = (state, action) => {
  const { tokenId } = action;
  const oldState = get(state.tokensBalance, tokenId, {});

  return {
    ...state,
    tokensBalance: {
      ...state.tokensBalance,
      [tokenId]: {
        ...oldState,
        status: TOKEN_DOWNLOAD_STATUS.LOADING,
        oldStatus: oldState.status,
      },
    },
  };
};

/*
 * Used when saving a new Nano Contract
*/
export const onSaveNanoContract = (state, action) => {
  const nc = action.payload;

  if (nc.id in state.nanoContracts) {
    // A NC with this id already exist in Redux. This should've been validated before
    return state;
  }

  return {
    ...state,
    nanoContracts: {
      ...state.nanoContracts,
      [nc.id]: {
        ...nc,
        history: []
      },
    },
  };
};

/**
 * @param {String} action.tokenId - The tokenId to mark as success
 * @param {Object} action.data - The token balance information to store on redux
 */
export const onTokenFetchBalanceSuccess = (state, action) => {
  const { tokenId, data } = action;
  const oldState = get(state.tokensBalance, tokenId, {});

  return {
    ...state,
    tokensBalance: {
      ...state.tokensBalance,
      [tokenId]: {
        status: TOKEN_DOWNLOAD_STATUS.READY,
        updatedAt: new Date().getTime(),
        data,
        oldStatus: oldState.status,
      },
    },
  };
};

/*
 * Used when saving a history of a Nano Contract
*/
export const onSaveNanoContractHistory = (state, action) => {
  const { id, history } = action.payload;

  if (!(id in state.nanoContracts)) {
    // We can't add history to a NC that does not exist
    return state;
  }

  return {
    ...state,
    nanoContracts: {
      ...state.nanoContracts,
      [id]: {
        ...state.nanoContracts[id],
        history: [
          ...state.nanoContracts[id].history,
          ...history
        ],
      },
    },
  };
};

/**
 * @param {String} action.tokenId - The tokenId to mark as failure
 */
export const onTokenFetchBalanceFailed = (state, action) => {
  const { tokenId } = action;
  const oldState = get(state.tokensBalance, tokenId, {});

  return {
    ...state,
    tokensBalance: {
      ...state.tokensBalance,
      [tokenId]: {
        status: TOKEN_DOWNLOAD_STATUS.FAILED,
        oldStatus: oldState.status,
      },
    },
  };
};

/*
 * Used when editing the address of a Nano Contract
*/
export const onEditAddressNanoContract = (state, action) => {
  const { id, address } = action.payload;

  if (!(id in state.nanoContracts)) {
    // We can't edit address of a NC that does not exist
    return state;
  }

  return {
    ...state,
    nanoContracts: {
      ...state.nanoContracts,
      [id]: {
        ...state.nanoContracts[id],
        address,
      },
    },
  };
};

/**
 * @param {String} action.tokenId - The tokenId to mark as success
 * @param {Object} action.data - The token history information to store on redux
 */
export const onTokenFetchHistorySuccess = (state, action) => {
  const { tokenId, data } = action;
  const oldState = get(state.tokensHistory, tokenId, {});

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      [tokenId]: {
        status: TOKEN_DOWNLOAD_STATUS.READY,
        updatedAt: new Date().getTime(),
        data,
        oldStatus: oldState.status,
      },
    },
  };
};

/**
 * @param {String} action.tokenId - The tokenId to mark as failed
 */
export const onTokenFetchHistoryFailed = (state, action) => {
  const { tokenId } = action;
  const oldState = get(state.tokensHistory, tokenId, {});

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      [tokenId]: {
        status: TOKEN_DOWNLOAD_STATUS.FAILED,
        data: [],
        oldStatus: oldState.status,
      },
    },
  };
};

/**
 * @param {String} action.tokenId - The tokenId to fetch history
 */
export const onTokenFetchHistoryRequested = (state, action) => {
  const { tokenId } = action;

  const oldState = get(state.tokensHistory, tokenId, {});

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      [tokenId]: {
        ...oldState,
        status: TOKEN_DOWNLOAD_STATUS.LOADING,
        oldStatus: oldState.status,
      },
    },
  };
};

/**
 * Are we using the atomic swap feature?
 */
export const onSetUseAtomicSwap = (state, action) => {
  const useAtomicSwap = action.payload;

  return {
    ...state,
    useAtomicSwap,
  };
};

/**
 * @param {Record<string,{id:string,password:string}>} action.listenedProposalsMap
*                                                      A map of listened proposals
 */
export const onProposalListUpdated = (state, action) => {
  return {
    ...state,
    proposals: action.listenedProposalsMap
  }
}

/**
 * @param {String} action.proposalId The proposal id to fetch from the backend
 */
export const onProposalFetchRequested = (state, action) => {
  const { proposalId } = action

  const oldState = get(state.proposals, proposalId, { id: proposalId })

  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: {
        ...oldState,
        status: PROPOSAL_DOWNLOAD_STATUS.LOADING,
        oldStatus: oldState.status,
      }
    }
  }
}

/**
 * @param {String} action.proposalId - The proposalId to mark as success
 * @param {Object} action.data - The proposal history information to store on redux
 */
export const onProposalFetchSuccess = (state, action) => {
  const { proposalId, data } = action;

  const oldState = get(state.proposals, proposalId, { id: proposalId })

  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: {
        ...oldState,
        status: PROPOSAL_DOWNLOAD_STATUS.READY,
        updatedAt: new Date().getTime(),
        data,
      },
    },
  };
};

/**
 * @param {String} action.proposalId - The proposalId to mark as failed
 * @param {String} action.errorMessage - Error message
 */
export const onProposalFetchFailed = (state, action) => {
  const { proposalId, errorMessage } = action;

  const { password } = get(state.proposals, proposalId, { id: proposalId })

  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: {
        id: proposalId,
        password,
        status: PROPOSAL_DOWNLOAD_STATUS.FAILED,
        errorMessage: errorMessage,
        updatedAt: new Date().getTime(),
      },
    },
  };
};

/**
 * @param {String} action.proposalId - The proposalId to mark as success
 * @param {Object} action.data - The proposal history information to store on redux
 */
export const onProposalUpdate = (state, action) => {
  const { proposalId, data } = action;

  const oldState = get(state.proposals, proposalId, { id: proposalId })

  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: {
        ...oldState,
        updatedAt: new Date().getTime(),
        data,
      },
    },
  };
};

/**
 * @param {String} action.tokenUid The token identifier to fetch
 */
export const onProposalTokenFetchRequested = (state, action) => {
  const { tokenUid } = action

  const oldState = get(state.tokensCache, tokenUid, {
    tokenUid,
    symbol: '',
    name: '',
    status: TOKEN_DOWNLOAD_STATUS.LOADING,
  })

  return {
    ...state,
    tokensCache: {
      ...state.tokensCache,
      [tokenUid]: {
        ...oldState,
        status: TOKEN_DOWNLOAD_STATUS.LOADING,
        oldStatus: oldState.status,
      }
    }
  }
}

/**
 * @param {String} action.tokenUid - The tokenUid to mark as success
 * @param {Object} action.data - The token information to store on redux
 */
export const onProposalTokenFetchSuccess = (state, action) => {
  const { tokenUid, data } = action;

  return {
    ...state,
    tokensCache: {
      ...state.tokensCache,
      [tokenUid]: {
        tokenUid,
        symbol: data.symbol,
        name: data.name,
        status: TOKEN_DOWNLOAD_STATUS.READY,
      },
    },
  };
};

/**
 * @param {String} action.tokenUid - The tokenUid to mark as failed
 * @param {String} action.errorMessage - Error message
 */
export const onProposalTokenFetchFailed = (state, action) => {
  const { tokenUid, errorMessage } = action;

  return {
    ...state,
    tokensCache: {
      ...state.tokensCache,
      [tokenUid]: {
        id: tokenUid,
        symbol: '',
        name: '',
        status: TOKEN_DOWNLOAD_STATUS.FAILED,
        errorMessage: errorMessage,
      },
    },
  };
};

/**
 * @param {String} action.proposalId - The new proposalId to store
 * @param {String} action.password - The proposal's password
 */
export const onProposalImported = (state, action) => {
  const { proposalId, password } = action;
  return {
    ...state,
    proposals: {
      ...state.proposals,
      [proposalId]: {
        id: proposalId,
        password,
        status: PROPOSAL_DOWNLOAD_STATUS.INVALIDATED
      }
    },
  };
};

/**
 * @param {String} action.proposalId - The new proposalId to store
 */
export const onProposalRemoved = (state, action) => {
  const { proposalId } = action;

  const newProposals = {
    ...state.proposals,
  };
  delete newProposals[proposalId];

  return {
    ...state,
    proposals: newProposals,
  };
};

export const onStartWalletLock = (state) => ({
  ...state,
  walletStartState: WALLET_STATUS.LOADING,
});

/**
 * @param {String} action.words - The wallet's words
 * @param {String} action.pin - The wallet's pinCode
 */
export const onStartWalletRequested = (state, action) => ({
  ...state,
  walletStartState: WALLET_STATUS.LOADING,
  startWalletAction: action,
});

export const onStartWalletSuccess = (state) => ({
  ...state,
  walletStartState: WALLET_STATUS.READY,
  startWalletAction: null, // Remove the action (that contains private data) from memory
});

export const onStartWalletFailed = (state) => ({
  ...state,
  walletStartState: WALLET_STATUS.FAILED,
});

/**
 * @param {String} action.tokenId - The tokenId to invalidate
 */
export const onTokenInvalidateBalance = (state, action) => {
  const { tokenId } = action;

  return {
    ...state,
    tokensBalance: {
      ...state.tokensBalance,
      [tokenId]: {
        status: TOKEN_DOWNLOAD_STATUS.INVALIDATED,
      },
    },
  };
};

/**
 * @param {String} action.tokenId - The tokenId to invalidate
 */
export const onTokenInvalidateHistory = (state, action) => {
  const { tokenId } = action;

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      [tokenId]: {
        status: TOKEN_DOWNLOAD_STATUS.INVALIDATED,
      },
    },
  };
};

/**
 * @param {Number} action.data Best block height
 */
export const onWalletBestBlockUpdate = (state, action) => {
  const { data } = action;

  return {
    ...state,
    height: data,
  };
};

/**
 * @param {RouterHistory} action.routerHistory History object from react-dom-navigation
 */
export const onStoreRouterHistory = (state, action) => {
  const { routerHistory } = action;

  return {
    ...state,
    routerHistory,
  };
};

const onSetServerInfo = (state, action) => {
  return {
    ...state,
    serverInfo: {
      network: action.payload.network,
      version: action.payload.version,
    },
  }
};

const onFeatureToggleInitialized = (state) => ({
  ...state,
  featureTogglesInitialized: true,
});

/**
 * @param {Object} action.payload The key->value object with feature toggles
 */
const onSetFeatureToggles = (state, { payload }) => ({
  ...state,
  featureToggles: payload,
});

/**
 * @param {Object} action.payload The unleash client to store
 */
const onSetUnleashClient = (state, { payload }) => ({
  ...state,
  unleashClient: payload,
});

const onWalletResetSuccess = (state) => ({
  ...state,
  // Keep the unleashClient as it should continue running
  unleashClient: state.unleashClient,
});

export const onUpdateTxHistory = (state, action) => {
  const { tx, tokenId, balance } = action.payload;
  const tokenHistory = state.tokensHistory[tokenId];

  if (!tokenHistory) {
    return state;
  }

  for (const [index, histTx] of tokenHistory.data.entries()) {
    if (histTx.tx_id === tx.tx_id) {
      tokenHistory.data[index] = getTxHistoryFromWSTx(tx, tokenId, balance);
      break;
    }
  }

  return {
    ...state,
    tokensHistory: {
      ...state.tokensHistory,
      [tokenId]: {
        ...tokenHistory,
      }
    },
  };
};

export const onWalletStateChanged = (state, { payload }) => ({
  ...state,
  walletState: payload,
});

export default rootReducer;
