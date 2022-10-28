/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Redux actions
 * @module ReduxActions
 */

export const types = {
  TOKEN_FETCH_METADATA_REQUESTED: 'TOKEN_FETCH_METADATA_REQUESTED',
  TOKEN_FETCH_METADATA_SUCCESS: 'TOKEN_FETCH_METADATA_SUCCESS',
  TOKEN_FETCH_METADATA_FAILED: 'TOKEN_FETCH_METADATA_FAILED',
  TOKEN_FETCH_BALANCE_REQUESTED: 'TOKEN_FETCH_BALANCE_REQUESTED',
  TOKEN_FETCH_BALANCE_SUCCESS: 'TOKEN_FETCH_BALANCE_SUCCESS',
  TOKEN_FETCH_BALANCE_FAILED: 'TOKEN_FETCH_BALANCE_FAILED',
  TOKEN_INVALIDATE_BALANCE: 'TOKEN_INVALIDATE_BALANCE',
  TOKEN_FETCH_HISTORY_REQUESTED: 'TOKEN_FETCH_HISTORY_REQUESTED',
  TOKEN_FETCH_HISTORY_SUCCESS: 'TOKEN_FETCH_HISTORY_SUCCESS',
  TOKEN_FETCH_HISTORY_FAILED: 'TOKEN_FETCH_HISTORY_FAILED',
  TOKEN_INVALIDATE_HISTORY: 'TOKEN_INVALIDATE_HISTORY',
  ON_START_WALLET_LOCK: 'ON_START_WALLET_LOCK',
  START_WALLET_REQUESTED: 'START_WALLET_REQUESTED',
  START_WALLET_SUCCESS: 'START_WALLET_SUCCESS',
  START_WALLET_FAILED: 'START_WALLET_FAILED',
  WALLET_STATE_READY: 'WALLET_STATE_READY',
  WALLET_STATE_ERROR: 'WALLET_STATE_ERROR',
  WALLET_RELOAD_DATA: 'WALLET_RELOAD_DATA',
  SET_SERVER_INFO: 'SET_SERVER_INFO',
  STORE_ROUTER_HISTORY: 'STORE_ROUTER_HISTORY',
  WALLET_RELOADING: 'WALLET_RELOADING',
};

/**
 * Update transaction history
 */
export const historyUpdate = (data) => ({ type: "history_update", payload: data });

/**
 * Reload data from localStorage to Redux
 */
export const reloadData = data => ({ type: "reload_data", payload: data });

/**
 * Clean redux data and set as initialState
 */
export const cleanData = () => ({ type: "clean_data" });

/**
 * Update address that must be shared with user
 */
export const sharedAddressUpdate = data => ({ type: "shared_address", payload: data });

/**
 * Set if API version is allowed
 */
export const isVersionAllowedUpdate = data => ({ type: "is_version_allowed_update", payload: data });

/**
 * Set if websocket is connected
 */
export const isOnlineUpdate = data => ({ type: "is_online_update", payload: data });

/**
 * Update the network that you are connected
 */
export const networkUpdate = data => ({ type: "network_update", payload: data });

/**
 * Save last request that failed
 */
export const lastFailedRequest = data => ({ type: "last_failed_request", payload: data });

/**
 * Save written password in Redux (it's always cleaned after the use)
 */
export const updatePassword = data => ({ type: "update_password", payload: data });

/**
 * Save written pin in Redux (it's always cleaned after the use)
 */
export const updatePin = data => ({ type: "update_pin", payload: data });

/**
 * Save words in Redux (it's always cleaned after the use)
 */
export const updateWords = data => ({ type: "update_words", payload: data });

/**
 * Update token that is selected in the wallet
 */
export const selectToken = data => ({ type: "select_token", payload: data });

/**
 * Update selected token and all known tokens in the wallet
 */
export const newTokens = data => ({ type: "new_tokens", payload: data });

/**
 * Set if addresses are being loaded
 */
export const loadingAddresses = data => ({ type: "loading_addresses_update", payload: data });

/**
 * Set quantity of addresses and transactions already loaded
 */
export const updateLoadedData = data => ({ type: "update_loaded_data", payload: data });

/**
 * Update status code of the last request that failed
 */
export const updateRequestErrorStatusCode = data => ({ type: "update_request_error_status_code", payload: data });

/**
 * Set height
 * height {number} new network height
 * htrUpdatedBalance {Object} balance of HTR
 */
export const updateHeight = (height, htrUpdatedBalance) => ({ type: "update_height", payload: { height, htrUpdatedBalance } });

/**
 * wallet {HathorWallet} wallet object
 */
export const setWallet = (wallet) => ({ type: "set_wallet", payload: wallet });

/**
 * Stop and clean wallet redux state
 */
export const resetWallet = () => ({ type: "reset_wallet" });

/**
 * tokens {Array} array of token uids the the wallet has
 */
export const loadWalletSuccess = (tokens) => ({ type: "load_wallet_success", payload: { tokens } });

/**
 * tx {Object} the new transaction
 * updatedBalanceMap {Object} balance updated of each token in this tx
 * balances {Object} balance of each token in this tx for this wallet including authorities
 */
export const updateTx = (tx, updatedBalanceMap, balances) => ({ type: "update_tx", payload: { tx, updatedBalanceMap, balances } });

/**
 * token {String} token of the updated history
 * newHistory {Array} array with the new fetched history
 */
export const updateTokenHistory = (token, newHistory) => ({ type: "update_token_history", payload: { token, newHistory } });

/**
 * data {Object} object with token metadata
 */
export const tokenMetadataUpdated = (data, errors) => ({ type: "token_metadata_updated", payload: { data, errors } });

/**
 * Set if metadata was already loaded from the lib
 */
export const metadataLoaded = data => ({ type: "metadata_loaded", payload: data });

/**
 * Remove token metadata after unregister token
 */
export const removeTokenMetadata = data => ({ type: "remove_token_metadata", payload: data });

/**
 * Partially update history and balance
 */
export const partiallyUpdateHistoryAndBalance = (data) => ({ type: "partially_update_history_and_balance", payload: data });

/**
 * Flag indicating if we are using the wallet service facade
 */
export const setUseWalletService = (useWalletService) => ({ type: "set_use_wallet_service", payload: useWalletService });

/**
 * Action to display the locked wallet screen and resolve the passed promise after the user typed his PIN
 */
export const lockWalletForResult = (promise) => ({ type: "lock_wallet_for_result", payload: promise });

/**
 * This will resolve the promise and reset the lockWalletPromise state
 */
export const resolveLockWalletPromise = (pin) => ({ type: "resolve_lock_wallet_promise", payload: pin });

/**
 * This will reset the selected token if the one selected has been hidden because of zero balance
 */
export const resetSelectedTokenIfNeeded = () => ({ type: "reset_selected_token_if_needed" });

/**
 * This will be used when the Ledger app closes and after the user is notified.
 *
 * @param {boolean} data If the Ledger device has disconnected.
 */
export const updateLedgerClosed = data => ({ type: "set_ledger_was_closed", payload: data });

/**
 * tokenId: The tokenId to request history from
 * force: Should we ignore the stored data?
 */
export const tokenFetchHistoryRequested = (tokenId, force) => ({
  type: types.TOKEN_FETCH_HISTORY_REQUESTED,
  tokenId,
  force,
});

/**
 * tokenId: The tokenId to store history data
 * data: The downloaded history data
 */
export const tokenFetchHistorySuccess = (tokenId, data) => ({
  type: types.TOKEN_FETCH_HISTORY_SUCCESS,
  tokenId,
  data,
});

/**
 * tokenId: The tokenId of the history request
 */
export const tokenFetchHistoryFailed = (tokenId) => ({
  type: types.TOKEN_FETCH_HISTORY_FAILED,
  tokenId,
});

/**
 * tokenId: The tokenId of the invalidate history request
 */
export const tokenInvalidateHistory = (tokenId) => ({
  type: types.TOKEN_INVALIDATE_HISTORY,
  tokenId,
});

/**
 * tokenId: The tokenId to request balance from
 * force: Should we ignore the stored data?
 */
export const tokenFetchBalanceRequested = (tokenId, force) => ({
  type: types.TOKEN_FETCH_BALANCE_REQUESTED,
  tokenId,
  force,
});

/**
 * tokenId: The tokenId to store balance data
 * data: The downloaded history data
 */
export const tokenFetchBalanceSuccess = (tokenId, data) => ({
  type: types.TOKEN_FETCH_BALANCE_SUCCESS,
  tokenId,
  data,
});

/**
 * tokenId: The tokenId of the balance request
 */
export const tokenFetchBalanceFailed = (tokenId) => ({
  type: types.TOKEN_FETCH_BALANCE_FAILED,
  tokenId,
});

export const tokenInvalidateBalance = (tokenId) => ({
  type: types.TOKEN_INVALIDATE_BALANCE,
  tokenId,
});

export const startWalletRequested = (payload) => ({
  type: types.START_WALLET_REQUESTED,
  payload,
});

export const startWalletFailed = () => ({
  type: types.START_WALLET_FAILED,
});

export const startWalletSuccess = () => ({
  type: types.START_WALLET_SUCCESS,
});

export const onStartWalletLock = () => ({
  type: types.ON_START_WALLET_LOCK,
});

export const walletStateError = () => ({
  type: types.WALLET_STATE_ERROR,
});

export const walletStateReady = () => ({
  type: types.WALLET_STATE_READY,
});

export const walletReloadData = () => ({
  type: types.WALLET_RELOAD_DATA,
});

export const reloadingWallet = () => ({
  type: types.WALLET_RELOADING,
});

/**
 * @param {RouterHistory} routerHistory History object from react-dom-navigation
 */
export const storeRouterHistory = (routerHistory) => ({
  type: types.STORE_ROUTER_HISTORY,
  routerHistory,
});

/**
 * version {str} version of the connected server (e.g., 0.26.0-beta)
 * network {str} network of the connected server (e.g., mainnet, testnet)
 * */
export const setServerInfo = ({ version, network }) => (
  { type: types.SET_SERVER_INFO, payload: { version, network } }
);

