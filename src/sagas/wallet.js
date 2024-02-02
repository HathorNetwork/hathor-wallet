import {
  Connection,
  HathorWallet,
  HathorWalletServiceWallet,
  constants as hathorLibConstants,
  config,
  transactionUtils,
  errors as hathorErrors,
  cryptoUtils,
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
  spawn,
} from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import LOCAL_STORE from '../storage';
import {
  WALLET_SERVICE_MAINNET_BASE_WS_URL,
  WALLET_SERVICE_MAINNET_BASE_URL,
  WALLET_SERVICE_FEATURE_TOGGLE,
  ATOMIC_SWAP_SERVICE_FEATURE_TOGGLE,
  IGNORE_WS_TOGGLE_FLAG,
} from '../constants';
import {
  types,
  isOnlineUpdate,
  loadingAddresses,
  lockWalletForResult,
  loadWalletSuccess,
  metadataLoaded,
  tokenMetadataUpdated,
  setUseWalletService,
  updateLoadedData,
  setWallet,
  tokenFetchBalanceRequested,
  tokenFetchHistoryRequested,
  setServerInfo,
  startWalletFailed,
  walletStateError,
  walletStateReady,
  storeRouterHistory,
  reloadingWallet,
  tokenInvalidateHistory,
  sharedAddressUpdate,
  walletRefreshSharedAddress,
  setEnableAtomicSwap,
  proposalListUpdated,
  proposalFetchRequested,
  walletResetSuccess,
  reloadWalletRequested,
  changeWalletState,
  updateTxHistory,
} from '../actions';
import {
  specificTypeAndPayload,
  errorHandler,
  checkForFeatureFlag,
  dispatchLedgerTokenSignatureVerification,
} from './helpers';
import { fetchTokenData } from './tokens';
import walletUtils from '../utils/wallet';
import tokensUtils from '../utils/tokens';
import { initializeSwapServiceBaseUrlForWallet } from "../utils/atomicSwap";

export const WALLET_STATUS = {
  READY: 'ready',
  FAILED: 'failed',
  LOADING: 'loading',
  SYNCING: 'syncing',
};

export function* isWalletServiceEnabled() {
  const shouldIgnoreFlag = localStorage.getItem(IGNORE_WS_TOGGLE_FLAG);

  // If we should ignore flag, it shouldn't matter what the featureToggle is, wallet service
  // is definitely disabled.
  if (shouldIgnoreFlag) {
    return false;
  }

  const walletServiceEnabled = yield call(checkForFeatureFlag, WALLET_SERVICE_FEATURE_TOGGLE);

  return walletServiceEnabled;
}

export function* isAtomicSwapEnabled() {
  const atomicSwapEnabled = yield call(checkForFeatureFlag, ATOMIC_SWAP_SERVICE_FEATURE_TOGGLE);

  return atomicSwapEnabled;
}

export function* startWallet(action) {
  const {
    words,
    passphrase,
    pin,
    password,
    routerHistory,
    xpub,
    hardware,
  } = action.payload;
  let xpriv = null;

  yield put(loadingAddresses(true));
  yield put(storeRouterHistory(routerHistory));

  if (hardware) {
    // We need to ensure that the hardware wallet storage is always generated here since we may be
    // starting the wallet with a second device and so we cannot trust the xpub saved on storage.
    yield LOCAL_STORE.initHWStorage(xpub);
  } else {
    if (!LOCAL_STORE.isLoadedSync(true)) {
      yield LOCAL_STORE.initStorage(words, password, pin, passphrase);
    }
  }

  const network = config.getNetwork();
  const storage = LOCAL_STORE.getStorage();

  // We are offline, the connection object is yet to be created
  yield put(isOnlineUpdate({ isOnline: false }));

  // For now, the wallet service does not support hardware wallet, so default to the old facade
  const useWalletService = hardware ? false : yield call(isWalletServiceEnabled);
  const enableAtomicSwap = yield call(isAtomicSwapEnabled);

  yield put(setUseWalletService(useWalletService));
  yield put(setEnableAtomicSwap(enableAtomicSwap));

  // This is a work-around so we can dispatch actions from inside callbacks.
  let dispatch;
  yield put((_dispatch) => {
    dispatch = _dispatch;
  });

  // If we've lost redux data, we could not properly stop the wallet object
  // then we don't know if we've cleaned up the wallet data in the storage
  yield storage.cleanStorage(true, true);

  let wallet, connection;
  if (useWalletService) {
    // Set urls for wallet service. If we have it on storage, use it, otherwise use defaults
    try {
      // getWsServer can return null if not previously set
      config.setWalletServiceBaseUrl(LOCAL_STORE.getWsServer());
      config.getWalletServiceBaseUrl();
    } catch(err) {
      if (err instanceof hathorErrors.GetWalletServiceUrlError) {
        // Throwing this error means there is not a base url set
        // So we update with the default url
        config.setWalletServiceBaseUrl(WALLET_SERVICE_MAINNET_BASE_URL);
      }
    }

    try {
      config.getWalletServiceBaseWsUrl();
    } catch(err) {
      if (err instanceof hathorErrors.GetWalletServiceWsUrlError) {
        config.setWalletServiceBaseWsUrl(WALLET_SERVICE_MAINNET_BASE_WS_URL);
      }
    }

    if (!(words || xpub)) {
      const accessData = yield storage.getAccessData();
      xpriv = cryptoUtils.decryptData(accessData.mainKey, pin);
    }

    const walletConfig = {
      seed: words,
      xpub,
      xpriv,
      requestPassword: async () => new Promise((resolve) => {
        /**
         * Lock screen will call `resolve` with the pin screen after validation
         */
        routerHistory('/locked/');
        dispatch(lockWalletForResult(resolve));
      }),
      passphrase,
      storage,
    };

    wallet = new HathorWalletServiceWallet(walletConfig);
    connection = wallet.conn;
  } else {
    // Set the server and network as saved on localStorage
    config.setServerUrl(LOCAL_STORE.getServer());

    connection = new Connection({
      network: network.name,
      servers: [config.getServerUrl()],
    });

    const beforeReloadCallback = () => {
      dispatch(reloadingWallet());
    };

    if (!(words || xpub)) {
      const accessData = yield storage.getAccessData();
      xpriv = cryptoUtils.decryptData(accessData.mainKey, pin);
    }

    const walletConfig = {
      seed: words,
      xpriv,
      xpub,
      passphrase,
      connection,
      beforeReloadCallback,
      storage,
    };

    wallet = new HathorWallet(walletConfig);
  }

  yield put(setWallet(wallet));

  // Setup listeners before starting the wallet so we don't lose messages
  yield fork(setupWalletListeners, wallet);

  // Thread to listen for feature flags from Unleash
  yield fork(featureToggleUpdateListener);

  // Create a channel to listen for the ready state and
  // wait until the wallet is ready
  yield fork(listenForWalletReady, wallet);

  try {
    console.log('[*] Start wallet.');
    const serverInfo = yield call([wallet, wallet.start], {
      pinCode: pin,
      password,
    });
    console.log('[+] Start wallet.', serverInfo);

    let version;
    let networkName = network.name;

    if (serverInfo) {
      version = serverInfo.version;
      networkName = serverInfo.network && serverInfo.network.split('-')[0];
    }

    yield put(setServerInfo({
      version,
      network: networkName,
    }));
  } catch(e) {
    if (useWalletService) {
      // Wallet Service start wallet will fail if the status returned from
      // the service is 'error' or if the start wallet request failed.
      // We should fallback to the old facade by storing the flag to ignore
      // the feature flag
      localStorage.setItem(IGNORE_WS_TOGGLE_FLAG, true)
      // Yield the same action so it will now load on the old facade
      yield put(action);

      // takeLatest will stop running the generator if a new START_WALLET_REQUESTED
      // action is dispatched, but returning so the code is clearer
      return;
    } else {
      console.error(e);
      // Return to locked screen when the wallet fails to start
      LOCAL_STORE.lock();
      routerHistory('/');
      return
    }
  }

  if (enableAtomicSwap) {
    // Set urls for the Atomic Swap Service. If we have it on storage, use it, otherwise use defaults
    initializeSwapServiceBaseUrlForWallet(network.name)
    // Initialize listened proposals list
    const listenedProposals = walletUtils.getListenedProposals();
    yield put(proposalListUpdated(listenedProposals));

    // Fetch all proposals from service backend
    for (const [pId, p] of Object.entries(listenedProposals)) {
      yield put(proposalFetchRequested(pId, p.password));
    }
  }

  // Wallet start called, we need to show the loading addresses screen
  routerHistory('/loading_addresses', { replace: true });

  // Wallet might be already ready at this point
  if (!wallet.isReady()) {
    const { error } = yield race({
      success: take(types.WALLET_STATE_READY),
      error: take(types.WALLET_STATE_ERROR),
    });

    if (error) {
      yield put(startWalletFailed());
      return;
    }
  }

  yield call([wallet.storage, wallet.storage.registerToken], hathorLibConstants.HATHOR_TOKEN_CONFIG);

  if (hardware) {
    // This will verify all ledger trusted tokens to check their validity
    yield fork(dispatchLedgerTokenSignatureVerification, wallet);
  }

  try {
    const { allTokens, registeredTokens } = yield call(loadTokens);
    const currentAddress = yield call([wallet, wallet.getCurrentAddress]);
    // Store all tokens on redux
    yield put(loadWalletSuccess(allTokens, registeredTokens, currentAddress));
  } catch(e) {
    yield put(startWalletFailed());
    return;
  }

  LOCAL_STORE.unlock();

  routerHistory('/wallet/', { replace: true });

  yield put(loadingAddresses(false));

  // The way the redux-saga fork model works is that if a saga has `forked`
  // another saga (using the `fork` effect), it will remain active until all
  // the forks are terminated. You can read more details at
  // https://redux-saga.js.org/docs/advanced/ForkModel
  // So, if a new START_WALLET_REQUESTED action is dispatched or a RELOAD_WALLET_REQUESTED
  // is dispatched, we need to cleanup all attached forks (that will cause the event
  // listeners to be cleaned).
  const { reload } = yield race({
    start: take(types.START_WALLET_REQUESTED),
    reload: take(types.RELOAD_WALLET_REQUESTED),
  });

  if (reload) {
    // Yield the same action again to reload the wallet
    yield put(action);
  }
}

/**
 * This saga will load HTR history and balance and dispatch actions
 * to asynchronously load all registered tokens
 */
export function* loadTokens() {
  const htrUid = hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;

  yield call(fetchTokenData, htrUid);
  const wallet = yield select((state) => state.wallet);

  // Fetch all tokens, including the ones that are not registered yet
  const allTokens = yield call([wallet, wallet.getTokens]);
  const registeredTokens = yield call(tokensUtils.getRegisteredTokens, wallet);

  // We don't need to wait for the metadatas response, so we can just
  // spawn a new "thread" to handle it.
  //
  // `spawn` is similar to `fork`, but it creates a `detached` fork
  yield spawn(fetchTokensMetadata, registeredTokens.map(token => token.uid));

  // Dispatch actions to asynchronously load the balances of each token the wallet has
  // ever interacted with. The `put` effect will just dispatch and continue, loading
  // the tokens asynchronously.
  //
  // Note: We need to download the balance of all the tokens from the wallet so we can
  // hide zero-balance tokens
  for (const token of allTokens) {
    yield put(tokenFetchBalanceRequested(token));
  }

  return { allTokens, registeredTokens };
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

// This will create a channel from an EventEmitter to wait until the wallet is loaded,
// dispatching actions
export function* listenForWalletReady(wallet) {
  const channel = eventChannel((emitter) => {
    const listener = (state) => emitter(state);
    wallet.on('state', listener);

    // Cleanup when the channel is closed
    return () => {
      wallet.removeListener('state', listener);
    };
  });

  try {
    while (true) {
      const message = yield take(channel);

      if (message === HathorWallet.ERROR) {
        yield put(walletStateError());
        yield cancel();
      } else {
        if (wallet.isReady()) {
          yield put(walletStateReady());
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

export function* handleTx(wallet, tx) {
  const affectedTokens = new Set();

  for (const output of tx.outputs) {
    affectedTokens.add(output.token);
  }

  for (const input of tx.inputs) {
    affectedTokens.add(input.token);
  }

  // We should refresh the available addresses.
  // Since we have already received the transaction at this point, the wallet
  // instance will already have updated its current address, we should just
  // fetch it and update the redux-store
  const newAddress = yield call([wallet, wallet.getCurrentAddress]);

  yield put(sharedAddressUpdate({
    lastSharedAddress: newAddress.address,
    lastSharedIndex: newAddress.index,
  }));

  return affectedTokens;
}

export function* handleNewTx(action) {
  const tx = action.payload;
  const wallet = yield select((state) => state.wallet);
  const routerHistory = yield select((state) => state.routerHistory);

  if (!wallet.isReady()) {
    return;
  }

  // reload token history of affected tokens
  // We always reload the history and balance
  const affectedTokens = yield call(handleTx, wallet, tx);
  const stateTokens = yield select((state) => state.tokens);
  const registeredTokens = stateTokens.map((token) => token.uid);

  // We should download the **balance** and **history** for every token involved
  // in the transaction
  for (const tokenUid of affectedTokens) {
    if (registeredTokens.indexOf(tokenUid) === -1) {
      continue;
    }

    yield put(tokenFetchBalanceRequested(tokenUid, true));
    yield put(tokenFetchHistoryRequested(tokenUid, true));
  }

  // We only show a notification on the first time we see a transaction
  let message = '';
  if (transactionUtils.isBlock(tx)) {
    message = 'You\'ve found a new block! Click to open it.';
  } else {
    message = 'You\'ve received a new transaction! Click to open it.'
  }

  const notification = walletUtils.sendNotification(message);

  // Set the notification click, in case we have sent one
  if (notification !== undefined) {
    notification.onclick = () => {
      if (!routerHistory) {
        return;
      }

      routerHistory(`/transaction/${tx.tx_id}/`);
    }
  }
}

export function* handleUpdateTx(action) {
  const tx = action.payload;
  const wallet = yield select((state) => state.wallet);

  if (!wallet.isReady()) {
    return;
  }

  // reload token history of affected tokens
  // We always reload balance but only reload the tx being updated on history.
  const affectedTokens = yield call(handleTx, wallet, tx);
  const stateTokens = yield select((state) => state.tokens);
  const registeredTokens = stateTokens.map((token) => token.uid);
  const txbalance = yield call([wallet, wallet.getTxBalance], tx);

  for (const tokenUid of affectedTokens) {
    if (registeredTokens.indexOf(tokenUid) === -1) {
      continue;
    }

    // Always reload balance
    yield put(tokenFetchBalanceRequested(tokenUid, true));
    yield put(updateTxHistory(tx, tokenUid, txbalance[tokenUid] || 0));
  }
}

export function* setupWalletListeners(wallet) {
  const channel = eventChannel((emitter) => {
    const l1 = (blockHeight) => emitter({ type: 'WALLET_BEST_BLOCK_UPDATE', data: blockHeight });
    wallet.conn.on('best-block-update', l1);

    const l2 = (data) => emitter({ type: 'WALLET_PARTIAL_UPDATE', data });
    wallet.conn.on('wallet-load-partial-update', l2);

    const l3 = (state) => emitter({ type: 'WALLET_CONN_STATE_UPDATE', data: state });
    wallet.conn.on('state', l3);

    const l4 = () => emitter({ type: 'WALLET_RELOAD_DATA' });
    wallet.on('reload-data', l4);

    const l5 = (data) => emitter({ type: 'WALLET_UPDATE_TX', data });
    wallet.on('update-tx', l5);

    const l6 = (data) => emitter({ type: 'WALLET_NEW_TX', data });
    wallet.on('new-tx', l6);

    const l7 = (data) => emitter(changeWalletState(data));
    wallet.on('state', l7);

    return () => {
      wallet.conn.removeListener('best-block-update', l1);
      wallet.conn.removeListener('wallet-load-partial-update', l2);
      wallet.conn.removeListener('state', l3);
      wallet.removeListener('reload-data', l4);
      wallet.removeListener('update-tx', l5);
      wallet.removeListener('new-tx', l6);
      wallet.removeListener('state', l7);
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

/**
 * Update the redux state with the data from the history sync partial data.
 *
 * @param {Object} data
 * @param {Object} data.payload payload from the wallet event
 * @param {number} data.payload.historyLength Number of transactions found in the entire history.
 * @param {number} data.payload.addressesFound Number of addresses loaded by the wallet.
 */
export function* loadPartialUpdate({ payload }) {
  const transactions = payload.historyLength;
  const addresses = payload.addressesFound;
  yield put(updateLoadedData({ transactions, addresses }));
}

export function* bestBlockUpdate({ payload }) {
  const currentHeight = yield select((state) => state.height);
  const wallet = yield select((state) => state.wallet);

  if (!wallet.isReady()) {
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

export function* walletReloading() {
  yield put(loadingAddresses(true));

  const wallet = yield select((state) => state.wallet);
  const useWalletService = yield select((state) => state.useWalletService);
  const routerHistory = yield select((state) => state.routerHistory);

  // If we are using the wallet-service, we don't need to wait until the addresses
  // are reloaded since they are stored on the wallet-service itself.
  if (!useWalletService) {
    // Since we close the channel after a walletReady event is received,
    // we must fork this saga again so we setup listeners again.
    yield fork(listenForWalletReady, wallet);

    // Wait until the wallet is ready
    yield take(types.WALLET_STATE_READY);
  }

  try {
    // Store all tokens on redux as we might have lost tokens during the disconnected
    // period.
    const { allTokens, registeredTokens } = yield call(loadTokens);

    // We might have lost transactions during the reload, so we must invalidate the
    // token histories:
    for (const tokenUid of allTokens) {
      if (tokenUid === hathorLibConstants.HATHOR_TOKEN_CONFIG.uid) {
        continue;
      }
      yield put(tokenInvalidateHistory(tokenUid));
    }

    // If we are on the wallet-service, we also need to refresh the
    // facade instance internal addresses
    if (useWalletService) {
      yield call([wallet, wallet.getNewAddresses]);
    }

    // dispatch the refreshSharedAddress so our redux store is potentially
    // updated with the new addresses that we missed during the disconnection
    // time
    yield put(walletRefreshSharedAddress());

    const currentAddress = yield call([wallet, wallet.getCurrentAddress]);

    // Load success, we can send the user back to the wallet screen
    yield put(loadWalletSuccess(allTokens, registeredTokens, currentAddress));
    routerHistory('/wallet/', { replace: true });
    yield put(loadingAddresses(false));
  } catch (e) {
    yield put(startWalletFailed());
    return;
  }
}

export function* refreshSharedAddress() {
  const wallet = yield select((state) => state.wallet);

  const { address, index } = yield call([wallet, wallet.getCurrentAddress]);

  yield put(sharedAddressUpdate({
    lastSharedAddress: address,
    lastSharedIndex: index,
  }));
}

export function* onWalletReset() {
  const routerHistory = yield select((state) => state.routerHistory);
  const wallet = yield select((state) => state.wallet);

  localStorage.removeItem(IGNORE_WS_TOGGLE_FLAG);
  LOCAL_STORE.resetStorage();
  if (wallet) {
    yield call([wallet.storage, wallet.storage.cleanStorage], true, true);
  }

  yield put(walletResetSuccess());

  if (routerHistory) {
    routerHistory('/welcome');
  }
}

export function* onWalletServiceDisabled() {
  console.debug('We are currently in the wallet-service and the feature-flag is disabled, reloading.');
  yield put(reloadWalletRequested());
}

/**
 * This saga will wait for feature toggle updates and react when a toggle state
 * transition is done
 */
export function* featureToggleUpdateListener() {
  while (true) {
    yield take('FEATURE_TOGGLE_UPDATED');

    const oldWalletServiceToggle = yield select(({ useWalletService }) => useWalletService);
    const newWalletServiceToggle = yield call(isWalletServiceEnabled);

    // WalletService is currently ON and the featureToggle is now OFF
    if (!newWalletServiceToggle && oldWalletServiceToggle) {
      yield call(onWalletServiceDisabled);
    }
  }
}

export function* saga() {
  yield all([
    takeLatest(types.START_WALLET_REQUESTED, errorHandler(startWallet, startWalletFailed())),
    takeLatest('WALLET_CONN_STATE_UPDATE', onWalletConnStateUpdate),
    takeLatest('WALLET_RELOADING', walletReloading),
    takeLatest('WALLET_RESET', onWalletReset),
    takeEvery('WALLET_NEW_TX', handleNewTx),
    takeEvery('WALLET_UPDATE_TX', handleUpdateTx),
    takeEvery('WALLET_BEST_BLOCK_UPDATE', bestBlockUpdate),
    takeEvery('WALLET_PARTIAL_UPDATE', loadPartialUpdate),
    takeEvery('WALLET_RELOAD_DATA', walletReloading),
    takeEvery('WALLET_REFRESH_SHARED_ADDRESS', refreshSharedAddress),
  ]);
}
