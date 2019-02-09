import wallet from '../utils/wallet';


const initialState = {
/*
 * 'sortedHistory': history data sorted by timestamp
 *   {
 *     'tx_id': str,
 *     'index': int,
 *     'value': int,
 *     'timestamp': int,
 *     'is_output': bool,
 *     'voided': bool
 *     'from_tx_id': str, (only in case is_output = false)
 *   }
 */
  sortedHistory: [],
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
  // Address to be used and is shown in the screen
  lastSharedAddress: null,
  // Index of the address to be used
  lastSharedIndex: null,
  // If the backend API version is allowed for this admin (boolean)
  isVersionAllowed: undefined,
  // If the connection with the server is online
  isOnline: undefined,
};

const rootReducer = (state = initialState, action) => {
  let unspentTxs = Object.assign({}, state.unspentTxs);
  let spentTxs = Object.assign({}, state.spentTxs);
  let voidedSpentTxs = Object.assign({}, state.voidedSpentTxs);
  let voidedUnspentTxs = Object.assign({}, state.voidedUnspentTxs);
  switch (action.type) {
    case 'history_update':
      let newSortedHistory = wallet.historyUpdate(action.payload, unspentTxs, spentTxs);
      let sortedHistory = [...newSortedHistory, ...state.sortedHistory];
      wallet.saveAddressHistory(sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs);
      return Object.assign({}, state, {sortedHistory, unspentTxs, spentTxs});
    case 'voided_tx':
      let voidedElement = action.payload.element;
      wallet.onWalletElementVoided(voidedElement, action.payload.address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

      // Update sortedHistory data with voided = true for the tx updated
      for (let el of state.sortedHistory) {
        if (el.tx_id === voidedElement.tx_id &&
            el.index === voidedElement.index &&
            el.is_output === voidedElement.is_output &&
            el.from_tx_id === voidedElement.from_tx_id) {
          el.voided = true;
        }
      }
      wallet.saveAddressHistory(state.sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs);
      return Object.assign({}, state, {sortedHistory: [...state.sortedHistory], unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs});
    case 'winner_tx':
      let winnerElement = action.payload.element;
      wallet.onWalletElementWinner(winnerElement, action.payload.address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

      // Update sortedHistory data with voided = false for the tx updated
      for (let el of state.sortedHistory) {
        if (el.tx_id === winnerElement.tx_id &&
            el.index === winnerElement.index &&
            el.is_output === winnerElement.is_output &&
            el.from_tx_id === winnerElement.from_tx_id) {
          el.voided = false;
        }
      }
      wallet.saveAddressHistory(state.sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs);
      return Object.assign({}, state, {sortedHistory: [...state.sortedHistory], unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs});
    case 'shared_address':
      return Object.assign({}, state, {lastSharedAddress: action.payload.lastSharedAddress, lastSharedIndex: action.payload.lastSharedIndex});
    case 'is_version_allowed_update':
      return Object.assign({}, state, {isVersionAllowed: action.payload.allowed});
    case 'is_online_update':
      return Object.assign({}, state, {isOnline: action.payload.isOnline});
    case 'reload_data':
      return Object.assign({}, state, {sortedHistory: action.payload.sortedHistory, unspentTxs: action.payload.unspentTxs});
    case 'clean_data':
      return Object.assign({}, initialState, {isVersionAllowed: state.isVersionAllowed});
    default:
      return state;
  }
};

export default rootReducer;