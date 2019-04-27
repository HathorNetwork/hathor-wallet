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
export const dataLoaded = data => ({ type: "data_loaded_update", payload: data });

/**
 * Update message to be shown in request error modal
 */
export const updateRequestErrorMessage = data => ({ type: "update_request_error_message", payload: data });
