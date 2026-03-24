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
import { METADATA_CONCURRENT_DOWNLOAD, FEE_TOKEN_FEATURE_TOGGLE } from '../constants';
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
  tokenRegisterSuccess,
  tokenRegisterFailed,
  newTokens,
  tokenVersionSyncRequested,
  tokenVersionSyncProgress,
  tokenVersionSyncSuccess,
  tokenVersionSyncFailed,
} from '../actions';
import { constants as hathorLibConstants } from '@hathor/wallet-lib';
import walletUtils from '../utils/wallet';
import { t } from "ttag";
import { getGlobalWallet } from "../modules/wallet";
import tokensUtils from '../utils/tokens';
import LOCAL_STORE from '../storage';
import { logger } from '../utils/logger';

const CONCURRENT_FETCH_REQUESTS = 5;
const METADATA_MAX_RETRIES = 3;
const VERSION_SYNC_MAX_RETRIES = 3;

const log = logger('tokens');

export const TOKEN_DOWNLOAD_STATUS = {
  READY: 'ready',
  FAILED: 'failed',
  LOADING: 'loading',
  INVALIDATED: 'invalidated',
};

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

      // Persist registered tokens for the current network
      yield call(saveCurrentNetworkTokens, wallet);
      break;
  }
}

/**
 * Save current network's registered tokens to localStorage keyed by genesis hash,
 * so they can be restored when switching back to this network.
 */
function* saveCurrentNetworkTokens(wallet) {
  const genesisHash = yield select((state) => state.serverInfo.genesisHash);
  if (!genesisHash) {
    return;
  }

  const registeredTokens = yield call(tokensUtils.getRegisteredTokens, wallet, true);
  LOCAL_STORE.saveTokensForNetwork(genesisHash, registeredTokens);
}

/**
 * Restore previously saved tokens for the current network.
 * Called during wallet startup to re-register tokens that were
 * saved before a network switch.
 */
export function* restoreTokensForNetwork(wallet, genesisHash) {
  if (!genesisHash) {
    return;
  }

  const savedTokens = LOCAL_STORE.getTokensForNetwork(genesisHash);
  if (!Array.isArray(savedTokens)) {
    return;
  }

  for (const token of savedTokens) {
    if (!token || typeof token.uid !== 'string') {
      continue;
    }
    const isAlreadyRegistered = yield call([wallet.storage, wallet.storage.isTokenRegistered], token.uid);
    if (!isAlreadyRegistered) {
      yield call([wallet.storage, wallet.storage.registerToken], token);
    }
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

/**
 * Fetch token version with retry logic.
 * @param {HathorWallet} wallet
 * @param {string} tokenUid
 * @returns {Generator<*, number, *>} Token version
 * @throws {Error} If all retries fail
 */
function* fetchTokenVersionWithRetry(wallet, tokenUid) {
  // Retry mechanism (same pattern as fetchTokenMetadata)
  for (let i = 0; i <= VERSION_SYNC_MAX_RETRIES; i += 1) {
    try {
      const { tokenInfo } = yield call([wallet, wallet.getTokenDetails], tokenUid);

      if (tokenInfo?.version === undefined) {
        // this should never happen, the fullnode should return the version for all tokens
        throw new Error('Token version not available from API');
      }

      return tokenInfo.version;
    } catch (e) {
      log.warn(`Attempt ${i + 1}/${VERSION_SYNC_MAX_RETRIES + 1} failed for token ${tokenUid}`, e);
      yield delay(1000); // Wait 1s before trying again
    }
  }

  throw new Error(`Max retries requesting version for token ${tokenUid}`);
}

/**
 * Sync token versions for all tokens that have undefined version.
 * This saga is called during wallet startup when the fee-based-tokens
 * feature flag is enabled.
 *
 * @returns {{success: boolean, skipped?: boolean, syncedTokens?: Array, failedTokens?: Array}}
 */
export function* syncTokenVersions() {
  const featureToggles = yield select((state) => state.featureToggles);
  const isFeeTokenEnabled = featureToggles[FEE_TOKEN_FEATURE_TOGGLE];

  if (!isFeeTokenEnabled) {
    log.debug('Fee token feature flag is disabled, skipping version sync');
    return { success: true, skipped: true };
  }

  const wallet = getGlobalWallet();
  const registeredTokens = yield call(tokensUtils.getRegisteredTokens, wallet);

  // Filter tokens that need version sync (version is undefined)
  const tokensNeedingSync = registeredTokens.filter(
    (token) => token.version === undefined && token.uid !== hathorLibConstants.NATIVE_TOKEN_UID
  );

  if (tokensNeedingSync.length === 0) {
    log.debug('All tokens have version defined, no sync needed');
    yield put(tokenVersionSyncSuccess([]));
    return { success: true, syncedTokens: [] };
  }

  const totalCount = tokensNeedingSync.length;
  log.info(`Starting version sync for ${totalCount} tokens`);
  yield put(tokenVersionSyncRequested(totalCount));

  const syncedTokens = [];
  const failedTokens = [];

  for (const token of tokensNeedingSync) {
    try {
      const version = yield call(fetchTokenVersionWithRetry, wallet, token.uid);

      // Update token in storage with the fetched version
      yield call([wallet.storage, wallet.storage.registerToken], {
        uid: token.uid,
        name: token.name,
        symbol: token.symbol,
        version,
      });

      syncedTokens.push({ uid: token.uid, name: token.name, symbol: token.symbol, version });
      log.debug(`Synced version for token ${token.symbol}: ${version}`);

      // Update progress in UI
      yield put(tokenVersionSyncProgress(syncedTokens.length, totalCount));
    } catch (error) {
      log.error(`Failed to sync version for token ${token.symbol}`, error);
      failedTokens.push({
        uid: token.uid,
        name: token.name,
        symbol: token.symbol,
        error: error.message,
      });
    }
  }

  if (failedTokens.length > 0) {
    const errorMessage = t`Failed to sync version for ${failedTokens.length} token(s). Please check your connection and try again.`;
    yield put(tokenVersionSyncFailed(failedTokens, errorMessage));
    return { success: false, failedTokens, syncedTokens };
  }

  // Token versions are updated in storage. The wallet startup flow will
  // call loadTokens() and loadWalletSuccess() to update Redux state.
  // We don't dispatch newTokens here to avoid setting selectedToken to undefined.
  yield put(tokenVersionSyncSuccess(syncedTokens));

  return { success: true, syncedTokens };
}

/**
 * Watch for retry requests and re-run sync.
 */
function* watchTokenVersionSyncRetry() {
  yield takeLatest(types.TOKEN_VERSION_SYNC_RETRY, function* () {
    yield call(syncTokenVersions);
  });
}

/**
 * Saga to register a token with version fetching.
 *
 * Behavior depends on feature flag:
 * - flag=false: Fallback to undefined if version fetch fails (resilient)
 * - flag=true:  FAIL if version fetch fails (strict)
 *
 * @param {Object} action
 * @param {Object} action.payload
 * @param {string} action.payload.uid Token uid
 * @param {string} action.payload.name Token name
 * @param {string} action.payload.symbol Token symbol
 * @param {boolean} action.payload.alwaysShow Whether to always show the token
 * @param {Function} [action.payload.resolve] Optional promise resolve callback
 * @param {Function} [action.payload.reject] Optional promise reject callback
 */
function* registerToken(action) {
  const { uid, name, symbol, alwaysShow, resolve, reject } = action.payload;

  try {
    const wallet = getGlobalWallet();
    const featureToggles = yield select((state) => state.featureToggles);
    const isFeeTokenEnabled = featureToggles[FEE_TOKEN_FEATURE_TOGGLE];

    // Fetch version with behavior depending on feature flag
    let version;
    try {
      const { tokenInfo } = yield call([wallet, wallet.getTokenDetails], uid);
      version = tokenInfo?.version;

      // When flag is enabled, version is REQUIRED
      if (isFeeTokenEnabled && version === undefined) {
        throw new Error('Token version not available from API');
      }
    } catch (e) {
      if (isFeeTokenEnabled) {
        // Flag enabled: FAIL - no fallback allowed
        throw new Error(`Failed to fetch token version: ${e.message}`);
      }
      // Flag disabled: fallback to undefined (legacy behavior)
      log.debug(`Failed to fetch version for token ${uid}, continuing with undefined version`, e);
      version = undefined;
    }

    // Register the token in storage
    yield call([wallet.storage, wallet.storage.registerToken], { uid, name, symbol, version });

    // Get updated registered tokens list
    const registeredTokens = yield call(tokensUtils.getRegisteredTokens, wallet);

    // Update Redux state
    yield put(newTokens({ tokens: registeredTokens, uid }));

    // Set always show preference
    walletUtils.setTokenAlwaysShow(uid, alwaysShow);

    // Fetch token metadata
    yield put(tokenFetchMetadataRequested(uid));

    yield put(tokenRegisterSuccess(uid, name, symbol, version));

    // Call resolve callback if provided
    if (resolve) {
      resolve({ uid, name, symbol, version });
    }
  } catch (e) {
    log.error(`Error registering token ${uid}`, e);
    yield put(tokenRegisterFailed(uid, e.message));

    // Call reject callback if provided
    if (reject) {
      reject(e);
    }
  }
}

/**
 * Queue-based consumer for token registration requests.
 * Ensures registrations are processed sequentially to avoid race conditions.
 */
function* registerTokenQueue() {
  const registerTokenChannel = yield call(channel);

  // Single consumer to ensure sequential registration
  yield fork(function* registerTokenConsumer() {
    while (true) {
      const action = yield take(registerTokenChannel);
      yield call(registerToken, action);
    }
  });

  while (true) {
    const action = yield take(types.TOKEN_REGISTER_REQUESTED);
    yield put(registerTokenChannel, action);
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
    fork(registerTokenQueue),
    fork(watchTokenVersionSyncRetry),
    takeEvery(types.TOKEN_FETCH_HISTORY_REQUESTED, fetchTokenHistory),
    takeEvery('new_tokens', routeTokenChange),
  ]);
}
