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
  HISTORY_UPDATE: 'history_update',
  SHARED_ADDRESS: 'shared_address',
  IS_VERSION_ALLOWED_UPDATE: 'is_version_allowed_update',
  IS_ONLINE_UPDATE: 'is_online_update',
  NETWORK_UPDATE: 'network_update',
  RELOAD_DATA: 'reload_data',
  CLEAN_DATA: 'clean_data',
  LAST_FAILED_REQUEST: 'last_failed_request',
  SELECT_TOKEN: 'select_token',
  NEW_TOKENS: 'new_tokens',
  LOADING_ADDRESSES_UPDATE: 'loading_addresses_update',
  UPDATE_LOADED_DATA: 'update_loaded_data',
  UPDATE_REQUEST_ERROR_STATUS_CODE: 'update_request_error_status_code',
  UPDATE_HEIGHT: 'update_height',
  LOAD_WALLET_SUCCESS: 'load_wallet_success',
  UPDATE_TX: 'update_tx',
  UPDATE_TOKEN_HISTORY: 'update_token_history',
  TOKEN_METADATA_UPDATED: 'token_metadata_updated',
  METADATA_LOADED: 'metadata_loaded',
  REMOVE_TOKEN_METADATA: 'remove_token_metadata',
  PARTIALLY_UPDATE_HISTORY_AND_BALANCE: 'partially_update_history_and_balance',
  SET_USE_WALLET_SERVICE: 'set_use_wallet_service',
  LOCK_WALLET_FOR_RESULT: 'lock_wallet_for_result',
  RESOLVE_LOCK_WALLET_PROMISE: 'resolve_lock_wallet_promise',
  RESET_SELECTED_TOKEN_IF_NEEDED: 'reset_selected_token_if_needed',
  SET_LEDGER_WAS_CLOSED: 'set_ledger_was_closed',
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
  SET_ENABLE_ATOMIC_SWAP: 'SET_ENABLE_ATOMIC_SWAP',
  PROPOSAL_LIST_UPDATED: 'PROPOSAL_LIST_UPDATED',
  PROPOSAL_FETCH_REQUESTED: 'PROPOSAL_FETCH_REQUESTED',
  PROPOSAL_FETCH_SUCCESS: 'PROPOSAL_FETCH_SUCCESS',
  PROPOSAL_FETCH_FAILED: 'PROPOSAL_FETCH_FAILED',
  PROPOSAL_UPDATED: 'PROPOSAL_UPDATED',
  PROPOSAL_TOKEN_FETCH_REQUESTED: 'PROPOSAL_TOKEN_FETCH_REQUESTED',
  PROPOSAL_TOKEN_FETCH_SUCCESS: 'PROPOSAL_TOKEN_FETCH_SUCCESS',
  PROPOSAL_TOKEN_FETCH_FAILED: 'PROPOSAL_TOKEN_FETCH_FAILED',
  PROPOSAL_CREATE_REQUESTED: 'PROPOSAL_CREATE_REQUESTED',
  PROPOSAL_REMOVED: 'PROPOSAL_REMOVED',
  PROPOSAL_IMPORTED: 'PROPOSAL_IMPORTED',
  TOKEN_INVALIDATE_HISTORY: 'TOKEN_INVALIDATE_HISTORY',
  ON_START_WALLET_LOCK: 'ON_START_WALLET_LOCK',
  RELOAD_WALLET_REQUESTED: 'RELOAD_WALLET_REQUESTED',
  START_WALLET_REQUESTED: 'START_WALLET_REQUESTED',
  START_WALLET_SUCCESS: 'START_WALLET_SUCCESS',
  START_WALLET_FAILED: 'START_WALLET_FAILED',
  START_WALLET_RESET: 'START_WALLET_RESET',
  WALLET_STATE_READY: 'WALLET_STATE_READY',
  WALLET_STATE_ERROR: 'WALLET_STATE_ERROR',
  WALLET_RELOAD_DATA: 'WALLET_RELOAD_DATA',
  WALLET_CHANGE_STATE: 'WALLET_CHANGE_STATE',
  WALLET_RESET: 'WALLET_RESET',
  WALLET_REFRESH_SHARED_ADDRESS: 'WALLET_REFRESH_SHARED_ADDRESS',
  SET_SERVER_INFO: 'SET_SERVER_INFO',
  SET_NAVIGATE_TO: 'SET_NAVIGATE_TO',
  WALLET_RELOADING: 'WALLET_RELOADING',
  FEATURE_TOGGLE_INITIALIZED: 'FEATURE_TOGGLE_INITIALIZED',
  SET_FEATURE_TOGGLES: 'SET_FEATURE_TOGGLES',
  SET_UNLEASH_CLIENT: 'SET_UNLEASH_CLIENT',
  UPDATE_TX_HISTORY: 'UPDATE_TX_HISTORY',
  SET_NATIVE_TOKEN_DATA: 'SET_NATIVE_TOKEN_DATA',
  ADD_REGISTERED_TOKENS: 'ADD_REGISTERED_TOKENS',
  NANOCONTRACT_REGISTER_REQUEST: 'NANOCONTRACT_REGISTER_REQUEST',
  NANOCONTRACT_REGISTER_ERROR: 'NANOCONTRACT_REGISTER_ERROR',
  NANOCONTRACT_REGISTER_SUCCESS: 'NANOCONTRACT_REGISTER_SUCCESS',
  NANOCONTRACT_CLEAN_REGISTER_METADATA: 'NANOCONTRACT_CLEAN_REGISTER_METADATA',
  NANOCONTRACT_EDIT_ADDRESS: 'NANOCONTRACT_EDIT_ADDRESS',
  NANOCONTRACT_UNREGISTER: 'NANOCONTRACT_UNREGISTER',
  BLUEPRINT_ADD_INFORMATION: 'BLUEPRINT_ADD_INFORMATION',
  BLUEPRINT_FETCH_REQUESTED: 'BLUEPRINT_FETCH_REQUESTED',
  NANOCONTRACT_LOAD_DETAILS_REQUESTED: 'NANOCONTRACT_LOAD_DETAILS_REQUESTED',
  NANOCONTRACT_LOAD_DETAILS_STATUS_UPDATE: 'NANOCONTRACT_LOAD_DETAILS_STATUS_UPDATE',
  NANOCONTRACT_LOAD_DETAILS_SUCCESS: 'NANOCONTRACT_LOAD_DETAILS_SUCCESS',
  NETWORKSETTINGS_UPDATE_REQUESTED: 'NETWORKSETTINGS_UPDATE_REQUESTED',
  NETWORKSETTINGS_UPDATED: 'NETWORKSETTINGS_UPDATED',
  NETWORKSETTINGS_UPDATE_SUCCESS: 'NETWORKSETTINGS_UPDATE_SUCCESS',
  NETWORKSETTINGS_SET_STATUS: 'NETWORKSETTINGS_SET_STATUS',
  REOWN_SET_CLIENT: 'REOWN_SET_CLIENT',
  REOWN_SET_MODAL: 'REOWN_SET_MODAL',
  REOWN_SET_SESSIONS: 'REOWN_SET_SESSIONS',
  REOWN_SET_CONNECTION_STATE: 'REOWN_SET_CONNECTION_STATE',
  REOWN_SET_FIRST_ADDRESS: 'REOWN_SET_FIRST_ADDRESS',
  REOWN_NEW_NANOCONTRACT_STATUS_LOADING: 'REOWN_NEW_NANOCONTRACT_STATUS_LOADING',
  REOWN_NEW_NANOCONTRACT_STATUS_READY: 'REOWN_NEW_NANOCONTRACT_STATUS_READY',
  REOWN_NEW_NANOCONTRACT_STATUS_SUCCESS: 'REOWN_NEW_NANOCONTRACT_STATUS_SUCCESS',
  REOWN_NEW_NANOCONTRACT_STATUS_FAILED: 'REOWN_NEW_NANOCONTRACT_STATUS_FAILED',
  REOWN_NEW_NANOCONTRACT_RETRY: 'REOWN_NEW_NANOCONTRACT_RETRY',
  REOWN_NEW_NANOCONTRACT_RETRY_DISMISS: 'REOWN_NEW_NANOCONTRACT_RETRY_DISMISS',
  REOWN_CREATE_TOKEN_STATUS_LOADING: 'REOWN_CREATE_TOKEN_STATUS_LOADING',
  REOWN_CREATE_TOKEN_STATUS_READY: 'REOWN_CREATE_TOKEN_STATUS_READY',
  REOWN_CREATE_TOKEN_STATUS_SUCCESSFUL: 'REOWN_CREATE_TOKEN_STATUS_SUCCESSFUL',
  REOWN_CREATE_TOKEN_STATUS_FAILED: 'REOWN_CREATE_TOKEN_STATUS_FAILED',
  REOWN_CREATE_TOKEN_RETRY: 'REOWN_CREATE_TOKEN_RETRY',
  REOWN_CREATE_TOKEN_RETRY_DISMISS: 'REOWN_CREATE_TOKEN_RETRY_DISMISS',
  REOWN_SEND_TX_RETRY: 'REOWN_SEND_TX_RETRY',
  REOWN_SEND_TX_RETRY_DISMISS: 'REOWN_SEND_TX_RETRY_DISMISS',
  REOWN_SIGN_MESSAGE_RETRY: 'REOWN_SIGN_MESSAGE_RETRY',
  REOWN_SIGN_MESSAGE_RETRY_DISMISS: 'REOWN_SIGN_MESSAGE_RETRY_DISMISS',
  REOWN_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_RETRY: 'REOWN_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_RETRY',
  REOWN_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_RETRY_DISMISS: 'REOWN_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_RETRY_DISMISS',
  REOWN_ACCEPT: 'REOWN_ACCEPT',
  REOWN_REJECT: 'REOWN_REJECT',
  REOWN_URI_INPUTTED: 'REOWN_URI_INPUTTED',
  EXCEPTION_CAPTURED: 'EXCEPTION_CAPTURED',
  SHOW_SIGN_ORACLE_DATA_REQUEST_MODAL: 'SHOW_SIGN_ORACLE_DATA_REQUEST_MODAL',
  SHOW_CREATE_TOKEN_REQUEST_MODAL: 'SHOW_CREATE_TOKEN_REQUEST_MODAL',
  SHOW_SIGN_MESSAGE_REQUEST_MODAL: 'SHOW_SIGN_MESSAGE_REQUEST_MODAL',
  SHOW_GET_BALANCE_REQUEST_MODAL: 'SHOW_GET_BALANCE_REQUEST_MODAL',
  SHOW_NANO_CONTRACT_SEND_TX_MODAL: 'SHOW_NANO_CONTRACT_SEND_TX_MODAL',
  SHOW_SEND_TRANSACTION_REQUEST_MODAL: 'SHOW_SEND_TRANSACTION_REQUEST_MODAL',
  SHOW_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_MODAL: 'SHOW_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_MODAL',
  REOWN_SESSION_PROPOSAL: 'REOWN_SESSION_PROPOSAL',
  REOWN_SESSION_REQUEST: 'REOWN_SESSION_REQUEST',
  REOWN_SESSION_DELETE: 'REOWN_SESSION_DELETE',
  REOWN_CANCEL_SESSION: 'REOWN_CANCEL_SESSION',
  REOWN_SHUTDOWN: 'REOWN_SHUTDOWN',
  SHOW_GLOBAL_MODAL: 'SHOW_GLOBAL_MODAL',
  HIDE_GLOBAL_MODAL: 'HIDE_GLOBAL_MODAL',
  SERVER_INFO_UPDATED: 'SERVER_INFO_UPDATED',
  REOWN_SEND_TX_STATUS_LOADING: 'REOWN_SEND_TX_STATUS_LOADING',
  REOWN_SEND_TX_STATUS_READY: 'REOWN_SEND_TX_STATUS_READY',
  REOWN_SEND_TX_STATUS_SUCCESS: 'REOWN_SEND_TX_STATUS_SUCCESS',
  REOWN_SEND_TX_STATUS_FAILED: 'REOWN_SEND_TX_STATUS_FAILED',
  UNREGISTERED_TOKENS_STORE_SUCCESS: 'UNREGISTERED_TOKENS_STORE_SUCCESS',
  UNREGISTERED_TOKENS_CLEAN: 'UNREGISTERED_TOKENS_CLEAN',
  REOWN_SET_ERROR: 'REOWN_SET_ERROR',
};

/**
 * Update transaction history
 */
export const historyUpdate = (data) => ({ type: 'history_update', payload: data });

/**
 * Reload data from localStorage to Redux
 */
export const reloadData = data => ({ type: 'reload_data', payload: data });

/**
 * Clean redux data and set as initialState
 */
export const cleanData = () => ({ type: 'clean_data' });

/**
 * Update address that must be shared with user
 */
export const sharedAddressUpdate = data => ({ type: 'shared_address', payload: data });

/**
 * Set if API version is allowed
 */
export const isVersionAllowedUpdate = data => ({ type: 'is_version_allowed_update', payload: data });

/**
 * Set if websocket is connected
 */
export const isOnlineUpdate = data => ({ type: 'is_online_update', payload: data });

/**
 * Update the network that you are connected
 */
export const networkUpdate = data => ({ type: 'network_update', payload: data });

/**
 * Save last request that failed
 */
export const lastFailedRequest = data => ({ type: 'last_failed_request', payload: data });

/**
 * Update token that is selected in the wallet
 */
export const selectToken = data => ({ type: 'select_token', payload: data });

/**
 * Update selected token and all known tokens in the wallet
 */
export const newTokens = data => ({ type: 'new_tokens', payload: data });

/**
 * Set if addresses are being loaded
 */
export const loadingAddresses = data => ({ type: 'loading_addresses_update', payload: data });

/**
 * Set quantity of addresses and transactions already loaded
 */
export const updateLoadedData = data => ({ type: 'update_loaded_data', payload: data });

/**
 * Update status code of the last request that failed
 */
export const updateRequestErrorStatusCode = data => ({ type: 'update_request_error_status_code', payload: data });

/**
 * Set height
 * height {number} new network height
 * htrUpdatedBalance {Object} balance of HTR
 */
export const updateHeight = (height, htrUpdatedBalance) => ({ type: 'update_height', payload: { height, htrUpdatedBalance } });

/**
 * tokens {Array} array of token uids the the wallet has
 * registeredTokens {{uid:string, name:string, symbol:string}[]} The registered tokens from the storage
 * currentAddress {Object} The current unused address
 * registeredNanoContracts {NanoContractData} The registered nano contracts from the storage
 */
export const loadWalletSuccess = (tokens, registeredTokens, currentAddress, registeredNanoContracts) => ({ type: 'load_wallet_success', payload: { tokens, registeredTokens, currentAddress, registeredNanoContracts } });

/**
 * tx {Object} the new transaction
 * updatedBalanceMap {Object} balance updated of each token in this tx
 * balances {Object} balance of each token in this tx for this wallet including authorities
 */
export const updateTx = (tx, updatedBalanceMap, balances) => ({ type: 'update_tx', payload: { tx, updatedBalanceMap, balances } });

/**
 * token {String} token of the updated history
 * newHistory {Array} array with the new fetched history
 */
export const updateTokenHistory = (token, newHistory) => ({ type: 'update_token_history', payload: { token, newHistory } });

/**
 * data {Object} object with token metadata
 */
export const tokenMetadataUpdated = (data, errors) => ({ type: 'token_metadata_updated', payload: { data, errors } });

/**
 * Set if metadata was already loaded from the lib
 */
export const metadataLoaded = data => ({ type: 'metadata_loaded', payload: data });

/**
 * Remove token metadata after unregister token
 */
export const removeTokenMetadata = data => ({ type: 'remove_token_metadata', payload: data });

/**
 * Partially update history and balance
 */
export const partiallyUpdateHistoryAndBalance = (data) => ({ type: 'partially_update_history_and_balance', payload: data });

/**
 * Flag indicating if we are using the wallet service facade
 */
export const setUseWalletService = (useWalletService) => ({ type: 'set_use_wallet_service', payload: useWalletService });

/**
 * Action to display the locked wallet screen and resolve the passed promise after the user typed his PIN
 */
export const lockWalletForResult = (promise) => ({ type: 'lock_wallet_for_result', payload: promise });

/**
 * This will resolve the promise and reset the lockWalletPromise state
 */
export const resolveLockWalletPromise = (pin) => ({ type: 'resolve_lock_wallet_promise', payload: pin });

/**
 * This will reset the selected token if the one selected has been hidden because of zero balance
 */
export const resetSelectedTokenIfNeeded = () => ({ type: 'reset_selected_token_if_needed' });

/**
 * This will be used when the Ledger app closes and after the user is notified.
 *
 * @param {boolean} data If the Ledger device has disconnected.
 */
export const updateLedgerClosed = data => ({ type: 'set_ledger_was_closed', payload: data });

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

/**
 * tokenId: The tokenId to request metadata from
 */
export const tokenFetchMetadataRequested = (tokenId) => ({
  type: types.TOKEN_FETCH_METADATA_REQUESTED,
  tokenId,
});

/**
 * Flag indicating if we are using the atomic swap feature
 */
export const setEnableAtomicSwap = (useAtomicSwap) => ({ type: types.SET_ENABLE_ATOMIC_SWAP, payload: useAtomicSwap });

/**
 * @param {Record<string,{id:string,password:string}>} listenedProposalsMap
 *                                                     A map of listened proposals
 */
export const proposalListUpdated = (listenedProposalsMap) => ({
  type: types.PROPOSAL_LIST_UPDATED,
  listenedProposalsMap
});

/**
 * @param {string} proposalId The proposalId to request data
 * @param {string} password The proposal's password to decode its data
 * @param {boolean} [force=false] Should we ignore the stored data?
 */
export const proposalFetchRequested = (proposalId, password, force) => ({
  type: types.PROPOSAL_FETCH_REQUESTED,
  proposalId,
  password,
  force,
});

/**
 * @param {string} proposalId The proposalId to store data
 * @param {unknown} data The downloaded proposal data
 */
export const proposalFetchSuccess = (proposalId, data) => ({
  type: types.PROPOSAL_FETCH_SUCCESS,
  proposalId,
  data,
});

/**
 * @param {string} proposalId The proposalId of the fetch request
 * @param {string} errorMessage The error found on proposal fetching
 */
export const proposalFetchFailed = (proposalId, errorMessage) => ({
  type: types.PROPOSAL_FETCH_FAILED,
  proposalId,
  errorMessage,
});

/**
 * @param {string} proposalId The proposalId to store data
 * @param {unknown} data The updated proposal data
 */
export const proposalUpdated = (proposalId, data) => ({
  type: types.PROPOSAL_UPDATED,
  proposalId,
  data,
});

/**
 * @param {string} tokenUid The token identifier to fetch
 */
export const proposalTokenFetchRequested = (tokenUid) => ({
  type: types.PROPOSAL_TOKEN_FETCH_REQUESTED,
  tokenUid
});

/**
 * @param {string} tokenUid The token identifier fetched
 * @param {unknown} data The downloaded token data
 */
export const proposalTokenFetchSuccess = (tokenUid, data) => ({
  type: types.PROPOSAL_TOKEN_FETCH_SUCCESS,
  tokenUid,
  data,
});

/**
 * @param {string} tokenUid The token identifier fetched
 * @param {string} errorMessage The error found on token fetching
 */
export const proposalTokenFetchFailed = (tokenUid, errorMessage) => ({
  type: types.PROPOSAL_TOKEN_FETCH_FAILED,
  tokenUid,
  errorMessage,
});

/**
 * @param {string} partialTx
 * @param {string} password
 */
export const proposalCreateRequested = (partialTx, password) => ({
  type: types.PROPOSAL_CREATE_REQUESTED,
  password,
  partialTx,
});

/**
 * @param {string} proposalId
 */
export const proposalRemoved = (proposalId) => ({
  type: types.PROPOSAL_REMOVED,
  proposalId,
});

/**
 * @param {string} proposalId
 * @param {string} password
 */
export const importProposal = (proposalId, password) => ({
  type: types.PROPOSAL_IMPORTED,
  proposalId,
  password,
});

export const tokenInvalidateBalance = (tokenId) => ({
  type: types.TOKEN_INVALIDATE_BALANCE,
  tokenId,
});

export const startWalletRequested = (payload) => ({
  type: types.START_WALLET_REQUESTED,
  payload,
});

export const reloadWalletRequested = () => ({
  type: types.RELOAD_WALLET_REQUESTED,
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

export const startWalletReset = () => ({
  type: types.START_WALLET_RESET,
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

export const walletRefreshSharedAddress = () => ({
  type: types.WALLET_REFRESH_SHARED_ADDRESS,
});

export const reloadingWallet = () => ({
  type: types.WALLET_RELOADING,
});

/**
 * @param {string} route Route that should be navigated to in consequence of an event
 * @param {boolean} replace Should we navigate with the replace parameter set
 */
export const setNavigateTo = (route, replace = false) => ({
  type: types.SET_NAVIGATE_TO,
  route,
  replace,
});

/**
 * Resets the `navigateTo` property.
 * Should be called after every successful navigation executed through this property.
 */
export const resetNavigateTo = () => ({
  type: types.SET_NAVIGATE_TO,
  route: '',
  replace: false,
});

/**
 * @param {string} version - version of the connected server (e.g., 0.26.0-beta)
 * @param {string} network - network of the connected server (e.g., mainnet, testnet)
 * @param {number} decimalPlaces - number of decimal places (e.g. 2, 4)
 * @param {Object[]} customTokens - list of network custom tokens
 * @param {string} customTokens[].uid
 * @param {string} customTokens[].name
 * @param {string} customTokens[].symbol
 * @param {boolean} nanoContractsEnabled - if full node set nano contract as enabled
 */
export const setServerInfo = ({ version, network, customTokens, decimalPlaces, nanoContractsEnabled }) => (
  { type: types.SET_SERVER_INFO, payload: { version, network, customTokens, decimalPlaces, nanoContractsEnabled } }
);

/**
 * Action to notify that server info was updated
 */
export const serverInfoUpdated = () => ({
  type: types.SERVER_INFO_UPDATED,
});

export const featureToggleInitialized = () => ({
  type: types.FEATURE_TOGGLE_INITIALIZED,
});

/**
 * toggles {Object} Key value object where the key is the feature toggle name and the value
 * indicates whether it is on (true) or off (false)
 */
export const setFeatureToggles = (toggles) => ({
  type: types.SET_FEATURE_TOGGLES,
  payload: toggles,
});

export const walletReset = () => ({
  type: types.WALLET_RESET,
});

/**
 * Action to update the token history with this tx.
 * @param {Object} tx New transaction to update in the token history.
 * @param {string} tokenId token to update the history.
 * @param {number} balance transaction balance of the token on the wallet.
 * @returns {Object} action to update the history of the token with the tx.
 */
export const updateTxHistory = (tx, tokenId, balance) => ({
  type: types.UPDATE_TX_HISTORY,
  payload: { tx, tokenId, balance },
});

/**
 * Action to set the wallet state and allow the UI to react to a state change.
 * @param {number} newState state from the enum included on HathorWallet
 * @returns {Object}
 */
export const changeWalletState = (newState) => ({
  type: types.WALLET_CHANGE_STATE,
  payload: newState,
});

/**
 * Register nano contract in redux
 *
 * @param {string} ncId Nano contract id
 * @param {string} address Address associated with the nano contract
 */
export const registerNanoContract = (ncId, address) => ({
  type: types.NANOCONTRACT_REGISTER_REQUEST,
  payload: { ncId, address },
});

/**
 * Error when registering a nano contract
 * @param {string} error Error reason
 */
export const nanoContractRegisterError = (error) => ({
  type: types.NANOCONTRACT_REGISTER_ERROR,
  payload: { error },
});

/**
 * Success when registering nano contract
 *
 * @param {INcData} ncData nano contract data
 */
export const nanoContractRegisterSuccess = (ncData) => ({
  type: types.NANOCONTRACT_REGISTER_SUCCESS,
  payload: ncData,
});

/**
 * Clean register metadata of nano contracts
 *
 */
export const cleanNanoContractRegisterMetadata = () => ({
  type: types.NANOCONTRACT_CLEAN_REGISTER_METADATA,
});

/**
 * Set the native token data
 * @param {Object} data
 * @param {string} data.symbol
 * @param {string} data.name
 * @param {string} data.uid
 */
export const setNativeTokenData = (data) => ({
  type: types.SET_NATIVE_TOKEN_DATA,
  payload: data,
});

/**
 * Add a list of tokens to the store as registered.
 *
 * @param {Object[]} data
 * @param {string} data[].symbol
 * @param {string} data[].name
 * @param {string} data[].uid
 *
 */
export const addRegisteredTokens = (data) => ({
  type: types.ADD_REGISTERED_TOKENS,
  payload: data,
});

/**
 * Add blueprint information
 *
 * @param {NanoContractBlueprintInformationAPIResponse} blueprintInformation Blueprint information to add to redux
 */
export const addBlueprintInformation = (blueprintInformation) => ({
  type: types.BLUEPRINT_ADD_INFORMATION,
  payload: { blueprintInformation }
});

/**
 * Edit address of a registered nano contract
 *
 * @param {string} ncId Nano contract id
 * @param {string} address New address of the nano contract
 */
export const editAddressNC = (ncId, address) => ({
  type: types.NANOCONTRACT_EDIT_ADDRESS,
  payload: { ncId, address }
});

/**
 * Unregister nano contract
 *
 * @param {string} ncId ID of nano contract to unregister
 */
export const nanoContractUnregister = (ncId) => ({
  type: types.NANOCONTRACT_UNREGISTER,
  payload: ncId,
});

/**
 * Start a request to load nano contract detail
 *
 * @param {string} ncId ID of nano contract to load the data
 */
export const nanoContractDetailRequest = (ncId) => ({
  type: types.NANOCONTRACT_LOAD_DETAILS_REQUESTED,
  ncId,
});

/**
 * Set status of a nano contract detail load
 *
 * @param {Object} payload
 * @param {string} payload.status Status of the load to set in redux
 * @param {string} payload.error Error when loading data
 */
export const nanoContractDetailSetStatus = ({ status, error }) => ({
  type: types.NANOCONTRACT_LOAD_DETAILS_STATUS_UPDATE,
  payload: { status, error },
});

/**
 * Set nano contract detail state in redux
 *
 * @param {hathorLib.nano_contracts.types.NanoContractStateAPIResponse} ncState
 */
export const nanoContractDetailLoaded = (ncState) => ({
  type: types.NANOCONTRACT_LOAD_DETAILS_SUCCESS,
  state: ncState,
});

/**
 * Update redux data with new network settings
 *
 * @param {Object} data
 * @param {string} data.node
 * @param {string} data.network
 * @param {string} data.fullNetwork
 * @param {string} data.txMining
 * @param {string} data.explorer
 * @param {string} data.explorerService
 * @param {string} data.walletService
 * @param {string} data.walletServiceWS
 */
export const networkSettingsUpdate = (data) => ({
  type: types.NETWORKSETTINGS_UPDATED,
  payload: data,
});

/**
 * Called when the user clicks to update the network settings
 *
 * @param {Object} data
 * @param {string} data.node
 * @param {string} data.txMining
 * @param {string} data.explorer
 * @param {string} data.explorerService
 * @param {string} data.walletService
 * @param {string} data.walletServiceWS
 * @param {string} pin
 */
export const networkSettingsRequestUpdate = (data, pin) => ({
  type: types.NETWORKSETTINGS_UPDATE_REQUESTED,
  data,
  pin,
});

/**
 * Call network settings update success action
 */
export const networkSettingsUpdateSuccess = () => ({
  type: types.NETWORKSETTINGS_UPDATE_SUCCESS,
});

/**
 * Set the status of the network settings update
 *
 * @param {NETWORK_SETTINGS_STATUS} status
 * @param {string | null | undefined} error
 * @param {string | null | undefined} newNetwork
 */
export const setNetworkSettingsStatus = ({ status, error, newNetwork }) => ({
  type: types.NETWORKSETTINGS_SET_STATUS,
  payload: { status, error, newNetwork },
});

/**
 * Set the Reown client
 */
export const setReown = (payload) => ({
  type: types.REOWN_SET_CLIENT,
  payload,
});

/**
 * Set the Reown modal state
 */
export const setReownModal = (payload) => ({
  type: types.REOWN_SET_MODAL,
  payload,
});

/**
 * Set the Reown sessions
 */
export const setReownSessions = (payload) => ({
  type: types.REOWN_SET_SESSIONS,
  payload,
});

/**
 * Set the Reown first address
 */
export const setReownFirstAddress = (payload) => ({
  type: types.REOWN_SET_FIRST_ADDRESS,
  payload,
});

/**
 * Set the Reown connection state
 * @param {string} state - One of the REOWN_CONNECTION_STATE values
 */
export const setWCConnectionState = (state) => ({
  type: types.REOWN_SET_CONNECTION_STATE,
  payload: state,
});

/**
 * Set nano contract status to loading
 */
export const setNewNanoContractStatusLoading = () => ({
  type: types.REOWN_NEW_NANOCONTRACT_STATUS_LOADING,
});

/**
 * Set nano contract status to ready
 */
export const setNewNanoContractStatusReady = () => ({
  type: types.REOWN_NEW_NANOCONTRACT_STATUS_READY,
});

/**
 * Set nano contract status to success
 */
export const setNewNanoContractStatusSuccess = () => ({
  type: types.REOWN_NEW_NANOCONTRACT_STATUS_SUCCESS,
});

/**
 * Set nano contract status to failure
 */
export const setNewNanoContractStatusFailure = () => ({
  type: types.REOWN_NEW_NANOCONTRACT_STATUS_FAILED,
});

/**
 * Set create token status to loading
 */
export const setCreateTokenStatusLoading = () => ({
  type: types.REOWN_CREATE_TOKEN_STATUS_LOADING,
});

/**
 * Set create token status to ready
 */
export const setCreateTokenStatusReady = () => ({
  type: types.REOWN_CREATE_TOKEN_STATUS_READY,
});

/**
 * Set create token status to successful
 */
export const setCreateTokenStatusSuccessful = () => ({
  type: types.REOWN_CREATE_TOKEN_STATUS_SUCCESSFUL,
});

/**
 * Set create token status to failed
 */
export const setCreateTokenStatusFailed = () => ({
  type: types.REOWN_CREATE_TOKEN_STATUS_FAILED,
});

/**
 * Action to capture exceptions in the application
 * 
 * @param {Error} error The error that was captured
 */
export const onExceptionCaptured = (error) => ({
  type: types.EXCEPTION_CAPTURED,
  error,
});

/**
 * Show modal for signing oracle data
 * 
 * @param {Function} onAccept Callback function when user accepts the request
 * @param {Function} onReject Callback function when user rejects the request
 * @param {Object} data The oracle data to be signed
 * @param {Object} metadata Metadata about the dapp requesting the signature
 */
export const showSignOracleDataModal = (onAccept, onReject, data, metadata) => ({
  type: types.SHOW_SIGN_ORACLE_DATA_REQUEST_MODAL,
  payload: { accept: onAccept, deny: onReject, data, dapp: metadata },
});

/**
 * Show modal for creating a token
 * 
 * @param {Function} onAccept Callback function when user accepts the request
 * @param {Function} onReject Callback function when user rejects the request
 * @param {Object} data The token creation data
 * @param {Object} metadata Metadata about the dapp requesting the token creation
 */
export const showCreateTokenModal = (onAccept, onReject, data, metadata) => ({
  type: types.SHOW_CREATE_TOKEN_REQUEST_MODAL,
  payload: { accept: onAccept, deny: onReject, data, dapp: metadata },
});

/**
 * Show modal for signing a message with an address
 * 
 * @param {Function} onAccept Callback function when user accepts the request
 * @param {Function} onReject Callback function when user rejects the request
 * @param {Object} data The message data to be signed
 * @param {Object} metadata Metadata about the dapp requesting the signature
 */
export const showSignMessageWithAddressModal = (onAccept, onReject, data, metadata) => ({
  type: types.SHOW_SIGN_MESSAGE_REQUEST_MODAL,
  payload: { accept: onAccept, deny: onReject, data, dapp: metadata },
});

/**
 * Show modal for sending a nano contract transaction
 * 
 * @param {Function} onAccept Callback function when user accepts the request
 * @param {Function} onReject Callback function when user rejects the request
 * @param {Object} data The transaction data
 * @param {Object} metadata Metadata about the dapp requesting the transaction
 */
export const showNanoContractSendTxModal = (onAccept, onReject, data, metadata) => ({
  type: types.SHOW_NANO_CONTRACT_SEND_TX_MODAL,
  payload: { accept: onAccept, deny: onReject, data, dapp: metadata },
});

/**
 * Show modal for sending a transaction
 * 
 * @param {Function} onAccept Callback function when user accepts the request
 * @param {Function} onReject Callback function when user rejects the request
 * @param {Object} data The transaction data
 * @param {Object} metadata Metadata about the dapp requesting the transaction
 */
export const showSendTransactionModal = (onAccept, onReject, data, metadata) => ({
  type: types.SHOW_SEND_TRANSACTION_REQUEST_MODAL,
  payload: { accept: onAccept, deny: onReject, data, dapp: metadata },
});

/**
 * Show modal for creating a nano contract and token in a single transaction
 * 
 * @param {Function} onAccept Callback function when user accepts the request
 * @param {Function} onReject Callback function when user rejects the request
 * @param {Object} data The nano contract and token creation data
 * @param {Object} metadata Metadata about the dapp requesting the creation
 */
export const showCreateNanoContractCreateTokenTxModal = (onAccept, onReject, data, metadata) => ({
  type: types.SHOW_CREATE_NANO_CONTRACT_CREATE_TOKEN_TX_MODAL,
  payload: { accept: onAccept, deny: onReject, data, dapp: metadata },
});

/**
 * @param {string} modalType The type of the modal to show
 * @param {Object} modalProps The props to pass to the modal
 */
export const showGlobalModal = (modalType, modalProps = {}) => ({
  type: types.SHOW_GLOBAL_MODAL,
  payload: { modalType, modalProps }
});

/**
 * Hide the global modal
 */
export const hideGlobalModal = () => ({
  type: types.HIDE_GLOBAL_MODAL
});

/**
 * Set send transaction status to loading
 */
export const setSendTxStatusLoading = () => ({
  type: types.REOWN_SEND_TX_STATUS_LOADING,
});

/**
 * Set send transaction status to ready
 */
export const setSendTxStatusReady = () => ({
  type: types.REOWN_SEND_TX_STATUS_READY,
});

/**
 * Set send transaction status to success
 */
export const setSendTxStatusSuccess = () => ({
  type: types.REOWN_SEND_TX_STATUS_SUCCESS,
});

/**
 * Set send transaction status to failed
 */
export const setSendTxStatusFailed = () => ({
  type: types.REOWN_SEND_TX_STATUS_FAILED,
});

/**
 * Success storing unregistered tokens details
 * @param {Object} tokens Object with token details
 */
export const unregisteredTokensStoreSuccess = (tokens) => ({
  type: types.UNREGISTERED_TOKENS_STORE_SUCCESS,
  payload: { tokens },
});

/**
 * Clean unregistered tokens state to its default value
 */
export const unregisteredTokensClean = () => ({
  type: types.UNREGISTERED_TOKENS_CLEAN,
});

/**
 * Set error information for the current Reown operation.
 * Only one RPC is processed at a time, so a single error suffices.
 *
 * @param {Object|null} errorDetails - Error details object with { message, stack, type, timestamp } or null to clear
 */
export const setReownError = (errorDetails = null) => ({
  type: types.REOWN_SET_ERROR,
  payload: errorDetails,
});
