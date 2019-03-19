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
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'history_update':
      const { historyTransactions, allTokens, newSharedAddress, newSharedIndex } = wallet.updateHistoryData(state.historyTransactions, state.allTokens, action.payload.data, action.payload.resolve);

      const newLastSharedAddress = newSharedAddress === null ? state.lastSharedAddress : newSharedAddress;
      const newLastSharedIndex = newSharedIndex === null ? state.lastSharedIndex : newSharedIndex;
      return Object.assign({}, state, {historyTransactions, allTokens, lastSharedIndex: newLastSharedIndex, lastSharedAddress: newLastSharedAddress});

    case 'shared_address':
      return Object.assign({}, state, {lastSharedAddress: action.payload.lastSharedAddress, lastSharedIndex: action.payload.lastSharedIndex});
    case 'is_version_allowed_update':
      return Object.assign({}, state, {isVersionAllowed: action.payload.allowed});
    case 'is_online_update':
      return Object.assign({}, state, {isOnline: action.payload.isOnline});
    case 'reload_data':
      return Object.assign({}, state, action.payload);
    case 'clean_data':
      return Object.assign({}, initialState, {isVersionAllowed: state.isVersionAllowed});
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
    default:
      return state;
  }
};

export default rootReducer;
