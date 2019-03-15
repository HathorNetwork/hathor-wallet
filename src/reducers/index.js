import wallet from '../utils/wallet';
import { HATHOR_TOKEN_CONFIG } from '../constants';

const initialState = {
/*
 * 'sortedHistory': history data for each token sorted by timestamp
 *   {'token_uid':
 *    [{
 *     'tx_id': str,
 *     'index': int,
 *     'value': int,
 *     'timestamp': int,
 *     'is_output': bool,
 *     'voided': bool
 *     'from_tx_id': str, (only in case is_output = false)
 *    }]
 *  }
 */
  sortedHistory: {},
/*
 * 'unspentTxs': object contet:
 *   {'token_uid':
 *     {['tx_id', 'index']:
 *       {
 *         'address',
 *         'value',
 *         'timelock',
 *         'timestamp',
 *       }
 *     }
 *   },
 */
  unspentTxs: {},
/*
 *
 * 'spentTxs': object content:
 * {
 *   {['from_tx_id', 'index']:
 *     [
 *       {
 *         'address',
 *         'tx_id',
 *         'timestamp',
 *         'value',
 *         'timelock' // timelock of the spending output
 *       }
 *     ]
 *   }
 * }
 */
  spentTxs: {},
/*
 * 'voidedSpentTxs': object content same as 'spentTxs': stores the spentTxs that were voided
 *                   and are not spending the wallet balance anymore
 */
  voidedSpentTxs: {},
/*
 *   'voidedUnspentTxs': object content: stores the unspentTxs that were voided
 *                       and are not increasing the wallet balance anymore
 * {['tx_id', 'index']:
 *   {
 *     'address',
 *     'value',
 *     'timelock',
 *     'timestamp',
 *   }
 * }
 */
  voidedUnspentTxs: {},
/*
 * 'authorityOutputs': object contet:
 *   {'token_uid':
 *     {['tx_id', 'index']:
 *       {
 *         'address',
 *         'value',
 *         'timelock',
 *         'timestamp',
 *       }
 *     }
 *   },
 */
  authorityOutputs: {},
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
};

const rootReducer = (state = initialState, action) => {
  let unspentTxs = Object.assign({}, state.unspentTxs);
  let spentTxs = Object.assign({}, state.spentTxs);
  let voidedSpentTxs = Object.assign({}, state.voidedSpentTxs);
  let voidedUnspentTxs = Object.assign({}, state.voidedUnspentTxs);
  let authorityOutputs = Object.assign({}, state.authorityOutputs);
  switch (action.type) {
    case 'history_update':
      let newSortedHistory = wallet.historyUpdate(action.payload, unspentTxs, spentTxs, authorityOutputs);
      let sortedHistory = {};
      for (const key in state.sortedHistory) {
        if (key in newSortedHistory) {
          sortedHistory[key] = [...newSortedHistory[key], ...state.sortedHistory[key]];
        } else {
          sortedHistory[key] = state.sortedHistory[key];
        }
      }
      for (const key in newSortedHistory) {
        if (!(key in state.sortedHistory)) {
          sortedHistory[key] = newSortedHistory[key];
        }
      }
      wallet.saveAddressHistory(sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs, authorityOutputs);
      return Object.assign({}, state, {sortedHistory, unspentTxs, spentTxs, authorityOutputs});
    case 'voided_tx':
      let voidedElement = action.payload.element;
      wallet.onWalletElementVoided(voidedElement, action.payload.address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

      // Update sortedHistory data with voided = true for the tx updated
      for (const key in state.sortedHistory) {
        for (const el of state.sortedHistory[key]) {
          if (el.tx_id === voidedElement.tx_id &&
              el.index === voidedElement.index &&
              el.is_output === voidedElement.is_output &&
              el.from_tx_id === voidedElement.from_tx_id) {
            el.voided = true;
          }
        }
      }
      wallet.saveAddressHistory(state.sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs);
      const sortedHistoryUpdatedVoided = Object.assign({}, state.sortedHistory);
      return Object.assign({}, state, {sortedHistoryUpdatedVoided, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs});
    case 'winner_tx':
      let winnerElement = action.payload.element;
      wallet.onWalletElementWinner(winnerElement, action.payload.address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

      // Update sortedHistory data with voided = false for the tx updated
      for (const key in state.sortedHistory) {
        for (const el of state.sortedHistory[key]) {
          if (el.tx_id === winnerElement.tx_id &&
              el.index === winnerElement.index &&
              el.is_output === winnerElement.is_output &&
              el.from_tx_id === winnerElement.from_tx_id) {
            el.voided = false;
          }
        }
      }
      wallet.saveAddressHistory(state.sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs);
      const sortedHistoryUpdatedWinner = Object.assign({}, state.sortedHistory);
      return Object.assign({}, state, {sortedHistoryUpdatedWinner, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs});
    case 'shared_address':
      return Object.assign({}, state, {lastSharedAddress: action.payload.lastSharedAddress, lastSharedIndex: action.payload.lastSharedIndex});
    case 'is_version_allowed_update':
      return Object.assign({}, state, {isVersionAllowed: action.payload.allowed});
    case 'is_online_update':
      return Object.assign({}, state, {isOnline: action.payload.isOnline});
    case 'reload_data':
      return Object.assign({}, state, {
        sortedHistory: action.payload.sortedHistory,
        unspentTxs: action.payload.unspentTxs,
        spentTxs: action.payload.spentTxs,
        voidedSpentTxs: action.payload.voidedSpentTxs,
        voidedUnspentTxs: action.payload.voidedUnspentTxs,
        authorityOutputs: action.payload.authorityOutputs,
        tokens: action.payload.tokens,
      });
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
    case 'new_token':
      return Object.assign({}, state, {selectedToken: action.payload.uid, tokens: [...state.tokens, action.payload]});
    default:
      return state;
  }
};

export default rootReducer;