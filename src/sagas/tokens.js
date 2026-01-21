import {
  takeEvery,
  select,
  delay,
  call,
  fork,
  take,
  all,
  put,
  join,
  takeLatest,
} from 'redux-saga/effects';
import { metadataApi } from '@hathor/wallet-lib';
import { channel } from 'redux-saga';
import { get } from 'lodash';
import { specificTypeAndPayload, dispatchAndWait } from './helpers';
import helpers from '../utils/helpers';
import { METADATA_CONCURRENT_DOWNLOAD, TOKEN_DOWNLOAD_STATUS } from '../constants';
import {
  types,
  tokenFetchBalanceRequested,
  tokenFetchBalanceSuccess,
  tokenFetchBalanceFailed,
  tokenFetchHistoryRequested,
  tokenFetchHistorySuccess,
  tokenFetchHistoryFailed,
  proposalTokenFetchSuccess,
  proposalTokenFetchFailed,
  onExceptionCaptured,
  tokenFetchMetadataRequested,
} from '../actions';
import { t } from "ttag";
import { getGlobalWallet } from "../modules/wallet";
import { logger } from '../utils/logger';

const CONCURRENT_FETCH_REQUESTS = 5;
const METADATA_MAX_RETRIES = 3;

const log = logger('tokens');

/**
 * This saga will create a channel to queue TOKEN_FETCH_BALANCE_REQUESTED actions and
 * consumers that will run in parallel consuming those actions.
 *
 * More information about channels can be read on https://redux-saga.js.org/docs/api/#takechannel
 */
function* fetchTokenBalanceQueue() {
  const fetchTokenBalanceChannel = yield call(channel);

  // Fork CONCURRENT_FETCH_REQUESTS threads to download token balances
  for (let i = 0; i < CONCURRENT_FETCH_REQUESTS; i += 1) {
    yield fork(fetchTokenBalanceConsumer, fetchTokenBalanceChannel);
  }

  while (true) {
    const action = yield take(types.TOKEN_FETCH_BALANCE_REQUESTED);
    yield put(fetchTokenBalanceChannel, action);
  }
}

/**
 * This saga will consume the fetchTokenBalanceChannel for TOKEN_FETCH_BALANCE_REQUEST actions
 * and wait until the TOKEN_FETCH_BALANCE_SUCCESS action is dispatched with the specific tokenId
 */
function* fetchTokenBalanceConsumer(fetchTokenBalanceChannel) {
  while (true) {
    const action = yield take(fetchTokenBalanceChannel);

    yield fork(fetchTokenBalance, action);
    // Wait until the success action is dispatched before consuming another action
    yield take(
      specificTypeAndPayload([
        types.TOKEN_FETCH_BALANCE_SUCCESS,
        types.TOKEN_FETCH_BALANCE_FAILED,
      ], {
        tokenId: action.tokenId,
      }),
    );
  }
}

function* fetchTokenBalance(action) {
  const { tokenId, force } = action;

  try {
    const wallet = getGlobalWallet();
    const tokenBalance = yield select((state) => get(state.tokensBalance, tokenId));

    if (!force && tokenBalance && tokenBalance.oldStatus === TOKEN_DOWNLOAD_STATUS.READY) {
      // The data is already loaded, we should dispatch success
      yield put(tokenFetchBalanceSuccess(tokenId, tokenBalance.data));
      return;
    }

    const response = yield call(wallet.getBalance.bind(wallet), tokenId);
    const token = get(response, 0, {
      balance: {
        unlocked: 0n,
        locked: 0n,
      }
    });

    const balance = {
      available: token.balance.unlocked,
      locked: token.balance.locked,
    };

    yield put(tokenFetchBalanceSuccess(tokenId, balance));
  } catch (e) {
    yield put(tokenFetchBalanceFailed(tokenId));
  }
}

/**
 * This saga will create a channel to queue TOKEN_FETCH_METADATA_REQUESTED actions and
 * consumers that will run in parallel consuming those actions.
 *
 * More information about channels can be read on https://redux-saga.js.org/docs/api/#takechannel
 */
function* fetchTokenMetadataQueue() {
  const fetchTokenMetadataChannel = yield call(channel);

  // Fork CONCURRENT_FETCH_REQUESTS threads to download token balances
  for (let i = 0; i < METADATA_CONCURRENT_DOWNLOAD; i += 1) {
    yield fork(fetchTokenMetadataConsumer, fetchTokenMetadataChannel);
  }

  while (true) {
    const action = yield take(types.TOKEN_FETCH_METADATA_REQUESTED);
    yield put(fetchTokenMetadataChannel, action);
  }
}

/**
 * This saga will consume the fetchTokenBalanceChannel for TOKEN_FETCH_BALANCE_REQUEST actions
 * and wait until the TOKEN_FETCH_BALANCE_SUCCESS action is dispatched with the specific tokenId
 */
function* fetchTokenMetadataConsumer(fetchTokenMetadataChannel) {
  while (true) {
    const action = yield take(fetchTokenMetadataChannel);

    yield fork(fetchTokenMetadata, action);

    // Wait until the success action is dispatched before consuming another action
    yield take(
      specificTypeAndPayload([
        types.TOKEN_FETCH_METADATA_SUCCESS,
        types.TOKEN_FETCH_METADATA_FAILED,
      ], {
        tokenId: action.tokenId,
      }),
    );
  }
}

/**
 * Fetch a single token from the metadataApi
 *
 * @param {String} action.tokenId The token to fetch from the metadata api
 */
export function* fetchTokenMetadata({ tokenId }) {
  const { network } = yield select((state) => state.serverInfo);

  try {
    // Retry mechanism
    for (let i = 0; i <= METADATA_MAX_RETRIES; i += 1) {
      try {
        const data = yield call(metadataApi.getDagMetadata, tokenId, network);

        yield put({
          type: types.TOKEN_FETCH_METADATA_SUCCESS,
          tokenId,
          data: get(data, tokenId, null),
        });
        return;
      } catch (e) {
        yield delay(1000); // Wait 1s before trying again
      }
    }

    throw new Error(`Max retries requesting metadata for ${tokenId}`);
  } catch (e) {
    yield put({
      type: types.TOKEN_FETCH_METADATA_FAILED,
      tokenId,
    });
    // eslint-disable-next-line
    console.log('Error downloading metadata of token', tokenId);
  }
}

function* fetchTokenHistory(action) {
  const { tokenId, force } = action;

  try {
    const wallet = getGlobalWallet();
    const tokenHistory = yield select((state) => get(state.tokensHistory, tokenId));

    if (!force && tokenHistory && tokenHistory.oldStatus === TOKEN_DOWNLOAD_STATUS.READY) {
      // The data is already loaded, we should dispatch success
      yield put(tokenFetchHistorySuccess(tokenId, tokenHistory.data));
      return;
    }

    const response = yield call([wallet, wallet.getTxHistory], { token_id: tokenId });
    const data = yield call([helpers, helpers.mapTokenHistory], wallet, response, tokenId);

    yield put(tokenFetchHistorySuccess(tokenId, data));
  } catch (e) {
    yield put(tokenFetchHistoryFailed(tokenId));
  }
}

/**
 * This saga will monitor the `new_tokens` actions to detect new tokens being registered
 * on the wallet and dispatch the TOKEN_FETCH_BALANCE_REQUESTED action so the balance
 * for this token gets downloaded
 */
function* routeTokenChange(action) {
  const wallet = getGlobalWallet();

  if (!wallet || !wallet.isReady()) {
    return;
  }

  switch (action.type) {
    default:
    case 'new_tokens':
      for (const token of action.payload.tokens) {
        yield put({
          type: types.TOKEN_FETCH_BALANCE_REQUESTED,
          tokenId: token.uid,
        });
      }
      break;
  }
}

export function* fetchTokenData(tokenId) {
  const fetchBalanceResponse = yield call(
    dispatchAndWait,
    tokenFetchBalanceRequested(tokenId, true),
    specificTypeAndPayload(types.TOKEN_FETCH_BALANCE_SUCCESS, {
      tokenId,
    }),
    specificTypeAndPayload(types.TOKEN_FETCH_BALANCE_FAILED, {
      tokenId,
    }),
  );
  const fetchHistoryResponse = yield call(
    dispatchAndWait,
    tokenFetchHistoryRequested(tokenId, true),
    specificTypeAndPayload(types.TOKEN_FETCH_HISTORY_SUCCESS, {
      tokenId,
    }),
    specificTypeAndPayload(types.TOKEN_FETCH_HISTORY_FAILED, {
      tokenId,
    }),
  );

  if (fetchHistoryResponse.failure || fetchBalanceResponse.failure) {
    throw new Error(`Error loading history or balance for token ${tokenId}`);
  }
}

/**
 * This saga will monitor for all actions that mutate the selectedToken and will
 * dispatch fetch history and balance actions.
 */
export function* monitorSelectedToken() {
  const selector = (state) => state.selectedToken;
  let previous = yield select(selector);

  while (true) {
    yield take('*');
    const next = yield select(selector);

    if (next !== previous) {
      yield put(tokenFetchHistoryRequested(next));
      yield put(tokenFetchBalanceRequested(next));
    }

    previous = next;
  }
}

/**
 * This saga will create a channel to queue PROPOSAL_TOKEN_FETCH_REQUESTED actions and
 * consumers that will run in parallel consuming those actions.
 *
 * This will mainly be used in the context of the Atomic Swap, retrieving names and symbols for all the tokens
 * present in the listened proposals for this wallet.
 *
 * More information about channels can be read on https://redux-saga.js.org/docs/api/#takechannel
 */
function* fetchProposalTokenDataQueue() {
  const fetchProposalTokenDataChannel = yield call(channel);

  // Fork CONCURRENT_FETCH_REQUESTS threads to download token data ( name and symbol )
  for (let i = 0; i < CONCURRENT_FETCH_REQUESTS; i += 1) {
    yield fork(fetchProposalTokenDataConsumer, fetchProposalTokenDataChannel);
  }

  while (true) {
    const action = yield take(types.PROPOSAL_TOKEN_FETCH_REQUESTED);
    yield put(fetchProposalTokenDataChannel, action);
  }
}

/**
 * This saga will consume the fetchProposalTokenDataChannel for PROPOSAL_TOKEN_FETCH_REQUESTED actions
 * and wait until the PROPOSAL_TOKEN_FETCH_SUCCESS action is dispatched with the specific proposalId
 */
function* fetchProposalTokenDataConsumer(fetchProposalTokenDataChannel) {
  while (true) {
    const action = yield take(fetchProposalTokenDataChannel);

    yield fork(fetchProposalTokenData, action);

    // Wait until the success action is dispatched before consuming another action
    yield take(
      specificTypeAndPayload([
        types.PROPOSAL_TOKEN_FETCH_SUCCESS,
        types.PROPOSAL_TOKEN_FETCH_FAILED,
      ], {
        tokenId: action.proposalId,
      }),
    );
  }
}

/**
 *
 * @param {string} action.tokenUid Token identifier to fetch data from
 * @returns {Generator<*, void, *>}
 */
function* fetchProposalTokenData(action) {
  const { tokenUid } = action;

  try {
    // Checking for tokens already cached
    const cachedToken = yield select((state) => get(state.tokensCache, tokenUid));
    if (cachedToken && cachedToken.oldStatus === TOKEN_DOWNLOAD_STATUS.READY) {
      yield put(proposalTokenFetchSuccess(tokenUid, cachedToken));
      return;
    }

    // Checking for registered tokens
    const registeredToken = yield select((state) => state.tokens.find(t => t.uid === tokenUid));
    if (registeredToken) {
      yield put(proposalTokenFetchSuccess(tokenUid, registeredToken));
      return;
    }

    const wallet = getGlobalWallet();

    // Fetching name and symbol data from the fullnode
    const updatedTokenDetails = yield wallet.getTokenDetails(tokenUid);
    yield put(proposalTokenFetchSuccess(tokenUid, updatedTokenDetails.tokenInfo));
  } catch (e){
    console.error(`Error downloading proposal token data`, tokenUid, e.message);
    yield put(proposalTokenFetchFailed(tokenUid, t`An error occurred while fetching this token data`));
  }
}

const NODE_RATE_LIMIT_CONF = {
  thin_wallet_token: {
    burst: 10,
    delay: 3,
  }
};

const splitInGroups = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export function* saga() {
  yield all([
    fork(fetchTokenMetadataQueue),
    fork(fetchTokenBalanceQueue),
    fork(monitorSelectedToken),
    fork(fetchProposalTokenDataQueue),
    takeEvery(types.TOKEN_FETCH_HISTORY_REQUESTED, fetchTokenHistory),
    takeEvery('new_tokens', routeTokenChange),
  ]);
}
