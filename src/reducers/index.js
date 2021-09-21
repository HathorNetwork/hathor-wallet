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
  isOnline: undefined,
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
  // When metadata is loaded from the lib
  metadataLoaded: false,
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
      return Object.assign({}, state, {selectedToken: action.payload.uid, tokens: action.payload.tokens});
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
    case 'new_tx':
      return onNewTx(state, action);
    case 'update_tx':
      return onUpdateTx(state, action);
    case 'update_token_history':
      return onUpdateTokenHistory(state, action);
    case 'token_metadata_updated':
      return tokenMetadataUpdated(state, action);
    case 'metadata_loaded':
      return Object.assign({}, state, {metadataLoaded: action.payload});
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
  const address = state.wallet.getCurrentAddress().address;
  const addressIndex = state.wallet.getAddressIndex(address);

  return {
    ...state,
    tokensHistory,
    tokensBalance,
    loadingAddresses: false,
    lastSharedAddress: address,
    lastSharedIndex: addressIndex,
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
  const { tx, updatedBalanceMap } = action.payload;

  const updatedHistoryMap = {};
  const balances = state.wallet.getTxBalance(tx, { includeAuthorities: true });

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

/**
 * Updates the history and balance when a new tx arrives
 */
const onNewTx = (state, action) => {
  const { tx, updatedBalanceMap } = action.payload;

  const allTokens = state.allTokens;
  const updatedHistoryMap = {};
  const balances = state.wallet.getTxBalance(tx, { includeAuthorities: true });

  // we now loop through all tokens present in the new tx to get the new history and balance
  for (const [tokenUid, tokenTxBalance] of Object.entries(balances)) {
    allTokens.add(tokenUid);
    // we may not have this token yet, so state.tokensHistory[tokenUid] would return undefined
    const currentHistory = state.tokensHistory[tokenUid] || [];
    const newTokenHistory = addTxToSortedList(tokenUid, tx, tokenTxBalance, currentHistory);
    updatedHistoryMap[tokenUid] = newTokenHistory;
  }
  const newTokensHistory = Object.assign({}, state.tokensHistory, updatedHistoryMap);
  const newTokensBalance = Object.assign({}, state.tokensBalance, updatedBalanceMap);

  const address = state.wallet.getCurrentAddress().address;
  const addressIndex = state.wallet.getAddressIndex(address);

  return Object.assign({}, state, {
    tokensHistory: newTokensHistory,
    tokensBalance: newTokensBalance,
    lastSharedAddress: address,
    lastSharedIndex: addressIndex,
    allTokens,
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
  const { data } = action.payload;

  return {
    ...state,
    metadataLoaded: true,
    tokenMetadata: data,
  };
};

export default rootReducer;
