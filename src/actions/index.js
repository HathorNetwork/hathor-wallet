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
 * tokensHistory {Object} history for each token
 * tokensBalance {Object} balance for each token
 * tokens {Array} array of token uids the the wallet has
 */
export const loadWalletSuccess = (tokensHistory, tokensBalance, tokens) => ({ type: "load_wallet_success", payload: { tokensHistory, tokensBalance, tokens } });

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
 * Set the current wallet prefix
 */
export const setWalletPrefix = prefix => ({type: "set_wallet_prefix", payload: prefix});

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
