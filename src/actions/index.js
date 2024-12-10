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
  UPDATE_MINING_SERVER: 'UPDATE_MINING_SERVER',
  SET_MINING_SERVER: 'SET_MINING_SERVER',
  SET_NATIVE_TOKEN_DATA: 'SET_NATIVE_TOKEN_DATA',
  ADD_REGISTERED_TOKENS: 'ADD_REGISTERED_TOKENS',
  NANOCONTRACT_REGISTER_REQUEST: 'NANOCONTRACT_REGISTER_REQUEST',
  NANOCONTRACT_REGISTER_ERROR: 'NANOCONTRACT_REGISTER_ERROR',
  NANOCONTRACT_REGISTER_SUCCESS: 'NANOCONTRACT_REGISTER_SUCCESS',
  NANOCONTRACT_CLEAN_REGISTER_METADATA: 'NANOCONTRACT_CLEAN_REGISTER_METADATA',
  NANOCONTRACT_EDIT_ADDRESS: 'NANOCONTRACT_EDIT_ADDRESS',
  NANOCONTRACT_UNREGISTER: 'NANOCONTRACT_UNREGISTER',
  BLUEPRINT_ADD_INFORMATION: 'BLUEPRINT_ADD_INFORMATION',
  NANOCONTRACT_LOAD_DETAILS_REQUESTED: 'NANOCONTRACT_LOAD_DETAILS_REQUESTED',
  NANOCONTRACT_LOAD_DETAILS_STATUS_UPDATE: 'NANOCONTRACT_LOAD_DETAILS_STATUS_UPDATE',
  NANOCONTRACT_LOAD_DETAILS_SUCCESS: 'NANOCONTRACT_LOAD_DETAILS_SUCCESS',
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
 * Update the tx mining service config on the lib and redux.
 *
 * @param {string|undefined} url
 * @param {boolean} reset
 */
export const updateMiningServer = (url, reset) => ({
  type: types.UPDATE_MINING_SERVER,
  payload: { url, reset },
});

/**
 * Set the mining server url
 * @param {string|undefined} url
 */
export const setMiningServer = (url) => ({
  type: types.SET_MINING_SERVER,
  payload: url,
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
