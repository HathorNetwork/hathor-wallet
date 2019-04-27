/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import wallet from '../utils/wallet';
import { HATHOR_TOKEN_CONFIG } from '../constants';

const initialState = {
/*
 * 'historyTransactions':
 *   {'tx_id': tx_data}
 */
  historyTransactions: {},
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
  // Wallet password
  password: undefined,
  // Wallet pin
  pin: undefined,
  // Wallet words
  words: undefined,
  // Tokens already saved: array of objects
  // {'name', 'symbol', 'uid'}
  tokens: [HATHOR_TOKEN_CONFIG],
  // Token selected (by default is HATHOR)
  selectedToken: HATHOR_TOKEN_CONFIG.uid,
  // List of all tokens seen in transactions
  allTokens: new Set(),
  // If is in the proccess of loading addresses transactions from the full node
  // When the request to load addresses fails this variable can continue true
  loadingAddresses: false,
  // Quantity of addresses already loaded to give a feedback to the user
  addressesFound: 0,
  // Quantity of transactions already loaded to give a feedback to the user
  transactionsFound: 0,
  // Message to be shown in request error modal
  requestErrorMessage: '',
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'history_update':
      const { historyTransactions, allTokens, newSharedAddress, newSharedIndex, addressesFound } = wallet.updateHistoryData(state.historyTransactions, state.allTokens, action.payload.data, action.payload.resolve);

      const transactionsFound = Object.keys(historyTransactions).length;

      const newLastSharedAddress = newSharedAddress === null ? state.lastSharedAddress : newSharedAddress;
      const newLastSharedIndex = newSharedIndex === null ? state.lastSharedIndex : newSharedIndex;
      return Object.assign({}, state, {historyTransactions, allTokens, lastSharedIndex: newLastSharedIndex, lastSharedAddress: newLastSharedAddress, addressesFound, transactionsFound});

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
      return Object.assign({}, initialState, {isVersionAllowed: state.isVersionAllowed, loadingAddresses: state.loadingAddresses});
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
    case 'data_loaded_update':
      return Object.assign({}, state, {addressesFound: action.payload.addressesFound, transactionsFound: action.payload.transactionsFound});
    case 'update_request_error_message':
      return Object.assign({}, state, {requestErrorMessage: action.payload});
    default:
      return state;
  }
};

export default rootReducer;
