/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  call,
  fork,
  take,
  all,
  put,
  cancel,
  cancelled,
  takeLatest,
  takeLeading,
  takeEvery,
  select,
  getContext,
} from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import { get, values } from 'lodash';
import {
  TriggerTypes,
  TriggerResponseTypes,
  handleRpcRequest,
} from '@hathor/hathor-rpc-handler';
import {
  WALLET_CONNECT_PROJECT_ID,
} from '../constants';
import {
  types,
  setWalletConnectSessions,
  setWCConnectionFailed,
} from '../actions';
import { getGlobalWallet } from '../modules/wallet';
import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';

let web3wallet, core;

const AVAILABLE_METHODS = {
  HATHOR_SIGN_MESSAGE: 'htr_signWithAddress',
};

const AVAILABLE_EVENTS = [];

/**
 * Those are the only ones we are currently using, extracted from
 * https://docs.walletconnect.com/2.0/specs/clients/sign/error-codes
 */
const ERROR_CODES = {
  UNAUTHORIZED_METHODS: 3001,
  USER_DISCONNECTED: 6000,
  USER_REJECTED: 5000,
  USER_REJECTED_METHOD: 5002,
  INVALID_PAYLOAD: 5003,
};

function* isWalletConnectEnabled() {
  return true;
}

function* init() {
  try {
    console.log('INTI!!');
    const walletConnectEnabled = yield call(isWalletConnectEnabled);
    console.log('Enabled?', walletConnectEnabled);

    if (!walletConnectEnabled) {
      return;
    }

    core = new Core({
      projectId: WALLET_CONNECT_PROJECT_ID,
    });
    console.log('Core: ', core);

    const metadata = {
      name: 'Hathor',
      description: 'Hathor Wallet Desktop',
      url: 'https://hathor.network/',
    };

    console.log('Metadata: ', metadata, Web3Wallet);

    web3wallet = yield call(Web3Wallet.init.bind(Web3Wallet), {
      core,
      metadata,
    });

    /* const web3wallet = yield call(async () => {
      console.log('Inside async method....');
      console.log(Web3Wallet, Web3Wallet.init);
      Web3Wallet.init({
        core,
        metadata,
      })
    });
    */

    console.log('Called web3walelt init!!!');

    /* yield put(setWalletConnect({
      web3wallet,
      core,
    })); */

    yield fork(setupListeners, web3wallet);

    // Refresh redux with the active sessions, loaded from storage
    yield call(refreshActiveSessions);

    // If the wallet is reset, we should cancel all listeners
    yield take(types.WALLET_RESET);

    yield cancel();
  } catch (error) {
    console.error('Error loading wallet connect', error);
  }
}

export function* refreshActiveSessions() {
  // const { web3wallet } = yield select((state) => state.walletConnect.client);

  const activeSessions = yield call(() => web3wallet.getActiveSessions());
  yield put(setWalletConnectSessions(activeSessions));
}

/**
 * @param {Web3Wallet} web3wallet The WalletConnect web3wallet instance
 */
export function* setupListeners(web3wallet) {
  const channel = eventChannel((emitter) => {
    const listenerMap = new Map();
    const addListener = (eventName) => {
      const listener = async (data) => {
        emitter({
          type: `WC_${eventName.toUpperCase()}`,
          data,
        });
      };

      web3wallet.on(eventName, listener);
      listenerMap.set(eventName, listener);
    };

    addListener('session_request');
    addListener('session_proposal');
    addListener('session_delete');

    return () => listenerMap.forEach((
      listener,
      eventName,
    ) => web3wallet.removeListener(eventName, listener));
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
 * This saga will publish on the cloud server a RPC message disconnecting
 * the current client.
 */
export function* clearSessions() {
  const { web3wallet } = yield select((state) => state.walletConnect.client);
  const activeSessions = yield call(() => web3wallet.getActiveSessions());

  for (const key of Object.keys(activeSessions)) {
    yield call(() => web3wallet.disconnectSession({
      topic: activeSessions[key].topic,
      reason: {
        code: ERROR_CODES.USER_DISCONNECTED,
        message: '',
      },
    }));
  }

  yield call(refreshActiveSessions);
}

async function promptHandler(request, requestMetadata) {
  // eslint-disable-next-line
  return new Promise(async (resolve, reject) => {
    switch (request.type) {
      case TriggerTypes.SignMessageWithAddressConfirmationPrompt: {
        const signMessageResponseTemplate = (accepted) => () => resolve({
          type: TriggerResponseTypes.SignMessageWithAddressConfirmationResponse,
          data: accepted,
        });
        store.dispatch(showSignMessageWithAddressModal(
          signMessageResponseTemplate(true),
          signMessageResponseTemplate(false),
          request.data,
          requestMetadata,
        ))
      } break;
      case TriggerTypes.SendNanoContractTxConfirmationPrompt: {
        const sendNanoContractTxResponseTemplate = (accepted) => (data) => resolve({
          type: TriggerResponseTypes.SendNanoContractTxConfirmationResponse,
          data: {
            accepted,
            nc: data?.payload,
          }
        });

        store.dispatch(showNanoContractSendTxModal(
          sendNanoContractTxResponseTemplate(true),
          sendNanoContractTxResponseTemplate(false),
          request.data,
          requestMetadata,
        ));
      } break;
      case TriggerTypes.SendNanoContractTxLoadingTrigger:
        store.dispatch(setNewNanoContractStatusLoading());
        resolve();
        break;
      case TriggerTypes.LoadingFinishedTrigger:
        store.dispatch(setNewNanoContractStatusReady());
        resolve();
        break;
      case TriggerTypes.PinConfirmationPrompt:
        store.dispatch(showPinScreenForResult((pinCode) => resolve({
          type: TriggerResponseTypes.PinRequestResponse,
          data: {
            accepted: true,
            pinCode,
          }
        }))); break;
      default: reject(new Error('Invalid request'));
    }
  });
}

/**
 * This saga will be called (dispatched from the event listener) when a session
 * is requested from a dApp
 */
export function* onSessionRequest(action) {
  console.log('Session request');
  const { payload } = action;
  const { params } = payload;
  const wallet = getGlobalWallet();

  // const { web3wallet } = yield select((state) => state.walletConnect.client);
  const activeSessions = yield call(() => web3wallet.getActiveSessions());
  const requestSession = activeSessions[payload.topic];
  if (!requestSession) {
    console.error('Could not identify the request session, ignoring request..');
    return;
  }

  const data = {
    icon: get(requestSession.peer, 'metadata.icons[0]', null),
    proposer: get(requestSession.peer, 'metadata.name', ''),
    url: get(requestSession.peer, 'metadata.url', ''),
    description: get(requestSession.peer, 'metadata.description', ''),
  };

  const modalContext = yield getContext('modalContext');

  console.log('Request: ', params.request);
  try {
    const response = yield call(handleRpcRequest, params.request, wallet, promptHandler);
    console.log('Response: ', response);
    yield call(() => web3wallet.respondSessionRequest({
      topic: payload.topic,
      response: {
        id: payload.id,
        jsonrpc: '2.0',
        result: response,
      },
    }));
  } catch (e) {
    console.log('Responded with error', e);
    yield call(() => web3wallet.respondSessionRequest({
      topic: payload.topic,
      response: {
        id: payload.id,
        jsonrpc: '2.0',
        error: {
          code: ERROR_CODES.USER_REJECTED_METHOD,
          message: 'Rejected by the user',
        },
      },
    }));
  }
}

/**
 * This saga will be called (dispatched from the event listener) when a sign
 * message RPC is published from a dApp
 *
 * @param {String} data.requestId Unique identifier of the request
 * @param {String} data.topic Unique identifier of the connected session
 * @param {String} data.message Message the dApp requested a signature for
 */
export function* onSignMessageRequest(data) {
  const { web3wallet } = yield select((state) => state.walletConnect.client);

  console.log(web3wallet);
}

/**
 * Listens for the wallet reset action, dispatched from the wallet sagas so we
 * can clear all current sessions.
 */
export function* onWalletReset() {
  const walletConnect = yield select((state) => state.walletConnect);
  if (!walletConnect || !walletConnect.client) {
    // Do nothing, wallet connect might not have been initialized yet
    return;
  }

  yield call(clearSessions);
}

/**
 * This saga will be called (dispatched from the event listener) when a session
 * proposal RPC is sent from a dApp. This happens after the client scans a wallet
 * connect URI
 */
export function* onSessionProposal(action) {
  const { id, params } = action.payload;
  // const { web3wallet } = yield select((state) => state.walletConnect.client);

  const wallet = getGlobalWallet();
  console.log('Wallet: ', wallet);
  const firstAddress = yield call(() => wallet.getAddressAtIndex(0));

  console.log(id, params);

  const data = {
    icon: get(params, 'proposer.metadata.icons[0]', null),
    proposer: get(params, 'proposer.metadata.name', ''),
    url: get(params, 'proposer.metadata.url', ''),
    description: get(params, 'proposer.metadata.description', ''),
    requiredNamespaces: get(params, 'requiredNamespaces', []),
  };

  const onAcceptAction = { type: 'WALLET_CONNECT_ACCEPT' };
  const onRejectAction = { type: 'WALLET_CONNECT_REJECT' };

  yield call(() => web3wallet.approveSession({
    id,
    relayProtocol: params.relays[0].protocol,
    namespaces: {
      hathor: {
        accounts: [`hathor:mainnet:${firstAddress}`],
        chains: [`hathor:mainnet`],
        events: AVAILABLE_EVENTS,
        methods: values(AVAILABLE_METHODS),
      },
    },
  }));

  yield call(refreshActiveSessions);

  console.log('session proposal');
}

/**
 * This saga is fired when a URI is inputted either manually or by scanning
 * a QR Code
 */
export function* onUriInputted(action) {
  // const { web3wallet, core } = yield select((state) => state.walletConnect.client);

  if (!web3wallet) {
    throw new Error('Wallet connect instance is new and QRCode was read');
  }

  const { payload } = action;

  try {
    yield call(core.pairing.pair, { uri: payload });
  } catch (error) {
    yield put(setWCConnectionFailed(true));
  }
}

/**
 * This saga listens for the feature toggles provider and disables walletconnect
 * if it was enabled and is now disabled
 */
export function* featureToggleUpdateListener() {
  while (true) {
    const oldWalletConnectEnabled = yield call(isWalletConnectEnabled);
    yield take('FEATURE_TOGGLE_UPDATED');
    const newWalletConnectEnabled = yield call(isWalletConnectEnabled);

    if (oldWalletConnectEnabled && !newWalletConnectEnabled) {
      yield put({ type: 'WC_SHUTDOWN' });
    }
  }
}

/**
 * Sends a disconnect session RPC message to the connected cloud server
 */
export function* onCancelSession(action) {
  const { web3wallet } = yield select((state) => state.walletConnect.client);

  const activeSessions = yield call(() => web3wallet.getActiveSessions());

  if (!activeSessions[action.payload]) {
    return;
  }

  yield call(() => web3wallet.disconnectSession({
    topic: activeSessions[action.payload].topic,
    reason: {
      code: ERROR_CODES.USER_DISCONNECTED,
      message: 'User cancelled the session',
    },
  }));

  yield call(refreshActiveSessions);
}

/**
 * This event can be triggered by either the wallet or dapp, indicating the
 * termination of a session. Emitted only after the session has been
 * successfully deleted.
 */
export function* onSessionDelete(action) {
  yield call(onCancelSession, action);
}

export function* saga() {
  yield all([
    fork(featureToggleUpdateListener),
    takeLatest('load_wallet_success', init),
    takeLeading('WC_SESSION_REQUEST', onSessionRequest),
    takeEvery('WC_SESSION_PROPOSAL', onSessionProposal),
    takeEvery('WC_SESSION_DELETE', onSessionDelete),
    takeEvery('WC_CANCEL_SESSION', onCancelSession),
    takeEvery('WC_SHUTDOWN', clearSessions),
    takeLatest(types.WC_URI_INPUTTED, onUriInputted)
  ]);
}
