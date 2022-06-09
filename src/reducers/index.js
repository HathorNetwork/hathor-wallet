/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';
import { VERSION } from '../constants';

const initialState = {
  tokensHistory: {},
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
    isAllAuthority: isAllAuthority(tx),
  }
};

/**
 * Check if the tx has only inputs and outputs that are authorities
 *
 * @param {Object} tx Transaction data
 *
 * @return {boolean} If the tx has only authority
 */
const isAllAuthority = (tx) => {
  for (let txin of tx.inputs) {
    if (!hathorLib.wallet.isAuthorityOutput(txin)) {
      return false;
    }
  }

  for (let txout of tx.outputs) {
    if (!hathorLib.wallet.isAuthorityOutput(txout)) {
      return false;
    }
  }

  return true;
}

/**
 * Got wallet history. Update wallet data on redux
 */
const onLoadWalletSuccess = (state, action) => {
  // Update the version of the wallet that the data was loaded
  hathorLib.storage.setItem('wallet:version', VERSION);
  const { tokensHistory, tokensBalance, tokens } = action.payload;
  const allTokens = new Set(tokens);
  const currentAddress = state.wallet.getCurrentAddress();

  return {
    ...state,
    tokensHistory,
    tokensBalance,
    loadingAddresses: false,
    lastSharedAddress: currentAddress.address,
    lastSharedIndex: currentAddress.index,
    allTokens,
  };
};

/**
 * This method adds a new tx to the history of a token (we have one history per token)
 *
 * tokenUid {string} uid of the token being updated
 * tx {Object} the new transaction
 * tokenBalance {int} balance of this token in the new transaction
 * currentHistory {Array} currenty history of the token, sorted by timestamp descending
 */
const addTxToSortedList = (tokenUid, tx, txTokenBalance, currentHistory) => {
  let index = 0;
  for (let i = 0; i < currentHistory.length; i += 1) {
    if (tx.tx_id === currentHistory[i].txId) {
      // If is_voided changed, we update the tx in the history
      // otherwise we just return the currentHistory without change
      if (tx.is_voided !== currentHistory[i].isVoided) {
        const txHistory = getTxHistoryFromWSTx(tx, tokenUid, txTokenBalance);
        // return new object so redux triggers update
        const newHistory = [...currentHistory];
        newHistory[i] = txHistory;
        return newHistory;
      }
      return currentHistory;
    }
    if (tx.timestamp > currentHistory[i].timestamp) {
      // we're past the timestamp from this new tx, so stop the search
      break;
    } else if (currentHistory[i].timestamp > tx.timestamp) {
      // we only update the index in this situation beacause we want to add the new tx to the
      // beginning of the list if it has the same timestamp as others. We cannot break the
      // first time the timestamp matches because we gotta check if it's not a duplicate tx
      index = i + 1;
    }
  }
  const txHistory = getTxHistoryFromWSTx(tx, tokenUid, txTokenBalance);
  // return new object so redux triggers update
  const newHistory = [...currentHistory];
  newHistory.splice(index, 0, txHistory);
  return newHistory;
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

const onCleanData = (state, action) => {
  if (state.wallet) {
    state.wallet.stop();
  }

  return Object.assign({}, initialState, {
    isVersionAllowed: state.isVersionAllowed,
    loadingAddresses: state.loadingAddresses,
  });
};

/**
 * Update token history after fetching more data in pagination
 */
const onUpdateTokenHistory = (state, action) => {
  const { token, newHistory } = action.payload;
  const currentHistory = state.tokensHistory[token] || [];

  const updatedHistoryMap = {};
  updatedHistoryMap[token] = [...currentHistory, ...newHistory];
  const newTokensHistory = Object.assign({}, state.tokensHistory, updatedHistoryMap);
  return {
    ...state,
    tokensHistory: newTokensHistory,
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
  const selectedToken = state.selectedToken

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

export const onNewTokens = (state, action) => {
  // Add new created token to the all tokens set
  state.allTokens.add(action.payload.uid);

  return {
    ...state,
    selectedToken: action.payload.uid,
    tokens: action.payload.tokens,
  };
};

export default rootReducer;
