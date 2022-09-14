import {
  helpers,
  Connection,
  HathorWallet,
  HathorWalletServiceWallet,
  wallet as oldWalletUtil,
  tokens as tokensUtils,
  constants as hathorLibConstants,
  config,
} from '@hathor/wallet-lib';
import {
  takeLatest,
  takeEvery,
  select,
  cancel,
  cancelled,
  all,
  put,
  call,
  race,
  take,
  fork,
} from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import STORE from '../storageInstance';
import {
  WALLET_SERVICE_MAINNET_BASE_WS_URL,
  WALLET_SERVICE_MAINNET_BASE_URL,
} from '../constants';
import { FeatureFlags } from '../featureFlags';
import {
  types,
  isOnlineUpdate,
  loadingAddresses,
  lockWalletForResult,
  loadWalletSuccess,
  reloadData,
  metadataLoaded,
  tokenMetadataUpdated,
  setUseWalletService,
  updateLoadedData,
  setWallet,
  // -- 
  tokenFetchBalanceRequested,
  tokenFetchHistoryRequested,
  tokenInvalidateHistory,
  setServerInfo,
  // setIsOnline,
} from '../actions';
import walletHelpers from '../utils/helpers';
import {
  specificTypeAndPayload,
} from './helpers';

export function* startWallet(action) {
  yield put(loadingAddresses(true));

  const {
    words,
    passphrase,
    pin,
    password, 
    routerHistory,
    fromXpriv,
    xpub,
  } = action.payload;

  yield put(loadingAddresses(true));

  // When we start a wallet from the locked screen, we need to unlock it in the storage
  oldWalletUtil.unlock();

  const network = config.getNetwork();
  const registeredTokens = tokensUtils.getTokens();

  // Before cleaning loaded data we must save in redux what we have of tokens in localStorage
  yield put(reloadData({ tokens: registeredTokens }));

  // We are offline, the connection object is yet to be created
  yield put(isOnlineUpdate({ isOnline: false }));

  const uniqueDeviceId = walletHelpers.getUniqueId();
  const featureFlags = new FeatureFlags(uniqueDeviceId, network.name);
  const hardwareWallet = oldWalletUtil.isHardwareWallet();

  // For now, the wallet service does not support hardware wallet, so default to the old facade
  const useWalletService = hardwareWallet ? false : yield call(() => featureFlags.shouldUseWalletService());

  yield put(setUseWalletService(useWalletService));

  // This is a work-around so we can dispatch actions from inside callbacks.
  let dispatch;
  yield put((_dispatch) => {
    dispatch = _dispatch;
  });

  let wallet, connection;

  if (useWalletService) {
    let xpriv = null;

    if (fromXpriv) {
      xpriv = oldWalletUtil.getAcctPathXprivKey(pin);
    }

    const {
      walletServiceBaseUrl,
      walletServiceWsUrl,
    } = HathorWalletServiceWallet.getServerUrlsFromStorage();

    // Set urls for wallet service. If we have it on storage, use it, otherwise use defaults
    config.setWalletServiceBaseUrl(walletServiceBaseUrl || WALLET_SERVICE_MAINNET_BASE_URL);
    config.setWalletServiceBaseWsUrl(walletServiceWsUrl || WALLET_SERVICE_MAINNET_BASE_WS_URL);

    const walletConfig = {
      seed: words,
      xpriv,
      xpub,
      requestPassword: async () => new Promise((resolve) => {
        /**
         * Lock screen will call `resolve` with the pin screen after validation
         */
        routerHistory.push('/locked/');
        dispatch(lockWalletForResult(resolve));
      }),
      passphrase,
      network,
    };

    wallet = new HathorWalletServiceWallet(walletConfig);
    connection = wallet.conn;
  } else {
    // If we've lost redux data, we could not properly stop the wallet object
    // then we don't know if we've cleaned up the wallet data in the storage
    // If it's fromXpriv, then we can't clean access data because we need that
    oldWalletUtil.cleanLoadedData({ cleanAccessData: !fromXpriv});

    let xpriv = null;

    if (fromXpriv) {
      xpriv = oldWalletUtil.getXprivKey(pin);
    }

    connection = new Connection({
      network: network.name,
      servers: [helpers.getServerURL()],
    });

    const beforeReloadCallback = () => {
      dispatch(loadingAddresses(true));
    };

    const walletConfig = {
      seed: words,
      xpriv,
      xpub,
      store: STORE,
      passphrase,
      connection,
      beforeReloadCallback,
    };

    wallet = new HathorWallet(walletConfig);
  }

  yield put(setWallet(wallet));

  // Setup listeners before starting the wallet so we don't lose messages
  const walletListenerThread = yield fork(setupWalletListeners, wallet);

  // Create a channel to listen for the ready state and
  // wait until the wallet is ready
  const walletReadyThread = yield fork(listenForWalletReady, wallet);

  // Thread to listen for feature flags from Unleash
  const featureFlagsThread = yield fork(listenForFeatureFlags, featureFlags);

  try {
    const serverInfo = yield call(wallet.start.bind(wallet), {
      pinCode: pin,
      password,
    });

    yield put(setServerInfo({
      version: serverInfo.version,
      network: serverInfo.network,
    }));

  } catch(e) {
    if (useWalletService) {
      // Wallet Service start wallet will fail if the status returned from
      // the service is 'error' or if the start wallet request failed.
      // We should fallback to the old facade by storing the flag to ignore
      // the feature flag
      yield call(featureFlags.ignoreWalletServiceFlag.bind(featureFlags));

      // Restart the whole bundle to make sure we clear all events
      NativeModules.HTRReloadBundleModule.restart();
    }
  }

  // Wallet might be already ready at this point
  if (!wallet.isReady()) {
    const { error } = yield race({
      success: take('WALLET_STATE_READY'),
      error: take('WALLET_STATE_ERROR'),
    });

    if (error) {
      // yield put(startWalletFailed());
      return;
    }
  }

  yield call(loadTokens);

  // Fetch all tokens, including the ones that are not registered yet
  const allTokens = yield call(wallet.getTokens.bind(wallet));

  // Store all tokens on redux
  yield put(loadWalletSuccess(allTokens));
  yield put(loadingAddresses(false));

  routerHistory.replace('/wallet/');

  // The way the redux-saga fork model works is that if a saga has `forked`
  // another saga (using the `fork` effect), it will remain active until all
  // the forks are terminated. You can read more details at
  // https://redux-saga.js.org/docs/advanced/ForkModel
  // So, if a new START_WALLET_REQUESTED action is dispatched, we need to cleanup
  // all attached forks (that will cause the event listeners to be cleaned).
  while (true) {
    yield take('START_WALLET_REQUESTED');
    yield cancel([
      walletListenerThread,
      walletReadyThread,
      featureFlagsThread
    ]);
  }
}

/**
 * This saga will load both HTR and DEFAULT_TOKEN (if they are different)
 * and dispatch actions to asynchronously load all registered tokens
 */
export function* loadTokens() {
  const htrUid = hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;

  // Download hathor token balance:
  yield put(tokenFetchBalanceRequested(hathorLibConstants.HATHOR_TOKEN_CONFIG.uid));
  const { htrBalanceError } = yield race({
    success: take(specificTypeAndPayload(types.TOKEN_FETCH_BALANCE_SUCCESS, {
      tokenId: htrUid,
    })),
    htrBalanceError: take(specificTypeAndPayload(types.TOKEN_FETCH_BALANCE_FAILED, {
      tokenId: htrUid,
    })),
  });

  // ...and history:
  yield put(tokenFetchHistoryRequested(hathorLibConstants.HATHOR_TOKEN_CONFIG.uid));
  const { htrHistoryError } = yield race({
    success: take(specificTypeAndPayload(types.TOKEN_FETCH_HISTORY_SUCCESS, {
      tokenId: htrUid,
    })),
    htrHistoryError: take(specificTypeAndPayload(types.TOKEN_FETCH_HISTORY_FAILED, {
      tokenId: htrUid,
    })),
  });

  if (htrBalanceError || htrHistoryError) {
    throw new Error('Failed to download hathor balance or history');
  }

  const registeredTokens = tokensUtils
    .getTokens()
    .reduce((acc, token) => {
      // remove htr since we will always download the HTR token
      if (token.uid === '00') {
        return acc;
      }

      return [...acc, token.uid];
    }, []);

  // We don't need to wait for the metadatas response, so just fork it
  yield fork(fetchTokensMetadata, registeredTokens);

  // Since we already know here what tokens are registered, we can dispatch actions
  // to asynchronously load the balances of each one. The `put` effect will just dispatch
  // and continue, loading the tokens asynchronously
  for (const token of registeredTokens) {
    yield put(tokenFetchBalanceRequested(token));
  }
}

/**
 * The wallet needs each token metadata to show information correctly
 * So we fetch the tokens metadata and store on redux
 */
export function* fetchTokensMetadata(tokens) {
  // No tokens to load
  if (!tokens.length) {
    yield put(metadataLoaded(true));
    return;
  }

  yield put(metadataLoaded(false));

  for (const token of tokens) {
    yield put({
      type: types.TOKEN_FETCH_METADATA_REQUESTED,
      tokenId: token,
    });
  }

  const responses = yield all(
    tokens.map((token) => take(
      specificTypeAndPayload([
        types.TOKEN_FETCH_METADATA_SUCCESS,
        types.TOKEN_FETCH_METADATA_FAILED,
      ], {
        tokenId: token,
      }),
    ))
  );

  const tokenMetadatas = {};
  const errors = [];

  for (const response of responses) {
    if (response.type === types.TOKEN_FETCH_METADATA_FAILED) {
      errors.push(response.tokenId);
    } else if (response.type === types.TOKEN_FETCH_METADATA_SUCCESS) {
      // When the request returns null, it means that we have no metadata for this token
      if (response.data) {
        tokenMetadatas[response.tokenId] = response.data;
      }
    }
  }

  yield put(tokenMetadataUpdated(tokenMetadatas, errors));
}

// This will create a channel to listen for featureFlag updates
export function* listenForFeatureFlags(featureFlags) {
  const channel = eventChannel((emitter) => {
    const listener = (state) => emitter(state);
    featureFlags.on('wallet-service-enabled', (state) => {
      emitter(state);
    });

    // Cleanup when the channel is closed
    return () => {
      featureFlags.removeListener('wallet-service-enabled', listener);
    };
  });

  try {
    while (true) {
      const newUseWalletService = yield take(channel);
      const oldUseWalletService = yield select((state) => state.useWalletService);

      if (oldUseWalletService && oldUseWalletService !== newUseWalletService) {
        NativeModules.HTRReloadBundleModule.restart();
      }
    }
  } finally {
    if (yield cancelled()) {
      // When we close the channel, it will remove the event listener
      channel.close();
    }
  }
}

// This will create a channel from an EventEmitter to wait until the wallet is loaded,
// dispatching actions
export function* listenForWalletReady(wallet) {
  const channel = eventChannel((emitter) => {
    const listener = (state) => emitter(state);
    wallet.on('state', (state) => emitter(state));

    // Cleanup when the channel is closed
    return () => {
      wallet.removeListener('state', listener);
    };
  });

  try {
    while (true) {
      const message = yield take(channel);

      if (message === HathorWallet.ERROR) {
        yield put({
          type: 'WALLET_STATE_ERROR',
        });
        yield cancel();
      } else {
        if (wallet.isReady()) {
          yield put({
            type: 'WALLET_STATE_READY',
          });
          yield cancel();
        }

        continue;
      }
    }
  } finally {
    if (yield cancelled()) {
      // When we close the channel, it will remove the event listener
      channel.close();
    }
  }
}

export function* handleTx(action) {
  const tx = action.payload;
  const wallet = yield select((state) => state.wallet);

  if (!wallet.isReady()) {
    console.log('Got tx but wallet is not ready, ignoring.', action);
    return;
  }

  // find tokens affected by the transaction
  const balances = yield call(wallet.getTxBalance.bind(wallet), tx);
  const stateTokens = yield select((state) => state.tokens);
  const registeredTokens = stateTokens.map((token) => token.uid);

  // We should download the **balance** for every token involved in the transaction
  // and history for hathor and DEFAULT_TOKEN
  for (const [tokenUid] of Object.entries(balances)) {
    if (registeredTokens.indexOf(tokenUid) === -1) {
      continue;
    }
    yield put(tokenFetchBalanceRequested(tokenUid, true));

    if (tokenUid === hathorLibConstants.HATHOR_TOKEN_CONFIG.uid
        || tokenUid === '00') {
      yield put(tokenFetchHistoryRequested(tokenUid, true));
    } else {
      // Invalidate the history so it will get requested the next time
      // the user enters the history screen
      yield put(tokenInvalidateHistory(tokenUid));
    }
  }
}

export function* setupWalletListeners(wallet) {
  const channel = eventChannel((emitter) => {
    const listener = (state) => emitter(state);
    wallet.conn.on('best-block-update', (blockHeight) => emitter({
      type: 'WALLET_BEST_BLOCK_UPDATE',
      data: blockHeight,
    }));
    wallet.conn.on('wallet-load-partial-update', (data) => emitter({
      type: 'WALLET_PARTIAL_UPDATE',
      data,
    }));
    wallet.conn.on('state', (state) => emitter({
      type: 'WALLET_CONN_STATE_UPDATE',
      data: state,
    }));
    wallet.on('reload-data', () => emitter({
      type: 'WALLET_RELOAD_DATA',
    }));
    wallet.on('update-tx', (data) => emitter({
      type: 'WALLET_UPDATE_TX',
      data,
    }));
    wallet.on('new-tx', (data) => emitter({
      type: 'WALLET_NEW_TX',
      data,
    }));

    return () => {
      wallet.conn.removeListener('best-block-update', listener);
      wallet.conn.removeListener('wallet-load-partial-update', listener);
      wallet.conn.removeListener('state', listener);
      wallet.removeListener('reload-data', listener);
      wallet.removeListener('update-tx', listener);
      wallet.removeListener('new-tx', listener);
    };
  });

  try {
    while (true) {
      const message = yield take(channel);

      yield put({
        type: message.type,
        payload: message.data,
      });
    }
  } finally {
    if (yield cancelled()) {
      // When we close the channel, it will remove the event listener
      channel.close();
    }
  }
}

export function* loadPartialUpdate({ payload }) {
  const transactions = Object.keys(payload.historyTransactions).length;
  const addresses = payload.addressesFound;
  yield put(updateLoadedData({ transactions, addresses }));
}

export function* bestBlockUpdate({ payload }) {
  const currentHeight = yield select((state) => state.height);
  const wallet = yield select((state) => state.wallet);

  if (!wallet.isReady()) {
    console.log('Got best block update but wallet is not ready, ignoring.');
    return;
  }

  if (currentHeight !== payload) {
    yield put(tokenFetchBalanceRequested(hathorLibConstants.HATHOR_TOKEN_CONFIG.uid));
  }
}

export function* onWalletConnStateUpdate({ payload }) {
  const isOnline = payload === Connection.CONNECTED;

  yield put(isOnlineUpdate({ isOnline }));
}

export function* saga() {
  yield all([
    takeLatest('START_WALLET_REQUESTED', startWallet),
    takeLatest('WALLET_CONN_STATE_UPDATE', onWalletConnStateUpdate),
    takeEvery('WALLET_NEW_TX', handleTx),
    takeEvery('WALLET_UPDATE_TX', handleTx),
    takeEvery('WALLET_BEST_BLOCK_UPDATE', bestBlockUpdate),
    takeEvery('WALLET_PARTIAL_UPDATE', loadPartialUpdate),
    takeEvery('WALLET_RELOAD_DATA', loadTokens),
  ]);
}
