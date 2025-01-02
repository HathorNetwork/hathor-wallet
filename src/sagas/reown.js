/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// import '@walletconnect/react-native-compat';
import {
  call,
  fork,
  take,
  all,
  put,
  cancelled,
  takeLatest,
  takeEvery,
  select,
  race,
  actionChannel,
  delay,
} from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import { get, values } from 'lodash';
import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import {
  TriggerTypes,
  TriggerResponseTypes,
  RpcResponseTypes,
  handleRpcRequest,
  CreateTokenError,
  SendNanoContractTxError,
} from '@hathor/hathor-rpc-handler';
import { isWalletServiceEnabled } from './wallet';
import { ReownModalTypes } from '../components/Reown/ReownModal';
import {
  REOWN_PROJECT_ID,
  REOWN_FEATURE_TOGGLE,
} from '../constants';
import {
  types,
  setReownModal,
  setReownSessions,
  onExceptionCaptured,
  setWCConnectionFailed,
  showSignMessageWithAddressModal,
  showNanoContractSendTxModal,
  showCreateTokenModal,
  setNewNanoContractStatusLoading,
  setNewNanoContractStatusReady,
  setNewNanoContractStatusFailure,
  setNewNanoContractStatusSuccess,
  showSignOracleDataModal,
  setCreateTokenStatusLoading,
  setCreateTokenStatusReady,
  setCreateTokenStatusSuccessful,
  setCreateTokenStatusFailed,
  showGlobalModal,
  hideGlobalModal,
} from '../actions';
import { checkForFeatureFlag, getNetworkSettings, retryHandler, showPinScreenForResult } from './helpers';
import { logger } from '../utils/logger';
import { getGlobalReown, setGlobalReown } from '../modules/reown';
import { MODAL_TYPES } from '../components/GlobalModal';
import { getGlobalWallet } from '../modules/wallet';
import { MODAL_ID as FEEDBACK_MODAL_ID } from '../components/Reown/NanoContractFeedbackModal';

const log = logger('reown');

const AVAILABLE_METHODS = {
  HATHOR_SIGN_MESSAGE: 'htr_signWithAddress',
  HATHOR_SEND_NANO_TX: 'htr_sendNanoContractTx',
  HATHOR_SIGN_ORACLE_DATA: 'htr_signOracleData',
  HATHOR_CREATE_TOKEN: 'htr_createToken',
};

const AVAILABLE_EVENTS = [];

const ERROR_CODES = {
  UNAUTHORIZED_METHODS: 3001,
  USER_DISCONNECTED: 6000,
  USER_REJECTED: 5000,
  USER_REJECTED_METHOD: 5002,
  INVALID_PAYLOAD: 5003,
};

function* isReownEnabled() {
  const reownEnabled = yield call(checkForFeatureFlag, REOWN_FEATURE_TOGGLE);
  return reownEnabled;
}

function* init() {
  console.log('Wallet not ready yet, waiting for START_WALLET_SUCCESS.');
  yield take(types.START_WALLET_SUCCESS);
  console.log('Starting reown.');

  // We should check if nano contracts are enabled in this network:
  const nanoContractsEnabled = yield select((state) => get(state.serverInfo, 'nanoContractsEnabled', false));
  if (!nanoContractsEnabled) {
    console.log('Nano contracts are not enabled, skipping reown init.');
    return;
  }

  try {
    const walletServiceEnabled = yield call(isWalletServiceEnabled);
    const reownEnabled = yield call(isReownEnabled);

    if (walletServiceEnabled) {
      console.log('Wallet Service enabled, skipping reown init.');
      return;
    }

    if (!reownEnabled) {
      console.log('Reown is not enabled.');
      return;
    }

    console.log('Creating Core instance');
    const core = new Core({
      projectId: REOWN_PROJECT_ID,
      relayUrl: 'wss://relay.walletconnect.com',
      logger: 'debug',
    });

    // Wait a bit to ensure all core components are initialized
    yield delay(1000);

    console.log('Creating WalletKit');
    const metadata = {
      name: 'Hathor',
      description: 'Hathor Mobile Wallet',
      url: 'https://hathor.network/',
      icons: ['https://hathor.network/favicon.ico'],
    };

    console.log('Core: ', core);

    const walletKit = yield call(WalletKit.init, {
      core,
      metadata,
    });

    console.log('Initialized! ', walletKit);

    console.log('WalletKit initialized');

    console.log('Setting global instances');
    setGlobalReown({ walletKit, core });

    // Setup listeners and session management
    yield fork(setupListeners, walletKit);

    // Refresh redux with the active sessions, loaded from storage
    // Pass extend = true so session expiration date get renewed
    yield call(refreshActiveSessions, true);
    yield fork(requestsListener);

  } catch (error) {
    console.log('Error: ', error);
    yield put(onExceptionCaptured(error));
  }
}

export function* listenForNetworkChange() {
  let previousGenesisHash = yield select((state) => get(state.serverInfo, 'genesisHash'));
  
  while (true) {
    // Wait for the server info to be updated with the new network data
    yield take(types.SERVER_INFO_UPDATED);
    console.log('Server info updated');
    
    const currentGenesisHash = yield select((state) => get(state.serverInfo, 'genesisHash'));
    
    console.log(previousGenesisHash, currentGenesisHash);
    if (previousGenesisHash !== currentGenesisHash) {
      log.debug('Genesis hash changed, clearing reown sessions.');
      yield call(clearSessions);
      previousGenesisHash = currentGenesisHash;
    }
  }
}

export function* checkForPendingRequests() {
  const { walletKit } = getGlobalReown();

  if (!walletKit) {
    console.log('Tried to get reown client in checkForPendingRequests but walletKit is undefined.');
    return;
  }

  yield call([walletKit, walletKit.getPendingSessionProposals]);
  yield call([walletKit, walletKit.getPendingSessionRequests]);
}

export function* refreshActiveSessions(extend = false) {
  console.log('Refreshing active sessions.');
  const { walletKit } = getGlobalReown();
  if (!walletKit) {
    console.log('Tried to get reown client in refreshActiveSessions but walletKit is undefined.');
    return;
  }

  const activeSessions = yield call(() => walletKit.getActiveSessions());
  console.log('Active Sessions: ', activeSessions);
  yield put(setReownSessions(activeSessions));

  if (extend) {
    for (const key of Object.keys(activeSessions)) {
      console.log('Extending session ');
      console.log(activeSessions[key].topic);

      try {
        yield call(() => walletKit.extendSession({
          topic: activeSessions[key].topic,
        }));
      } catch (extendError) {
        log.error('Error extending session, attempting to remove. Error:', extendError);

        try {
          yield call(() => walletKit.disconnectSession({
            topic: activeSessions[key].topic,
            reason: {
              code: ERROR_CODES.USER_DISCONNECTED,
              message: 'Unable to extend session',
            },
          }));
        } catch (disconnectError) {
          log.error('Unable to remove session after extend failed.', disconnectError);
          yield put(onExceptionCaptured(disconnectError));
        }
      }
    }
  }
}

export function* setupListeners(walletKit) {
  console.log('Will setup listeners: ', walletKit);
  const channel = eventChannel((emitter) => {
    const listenerMap = new Map();
    const addListener = (eventName) => {
      const listener = async (data) => {
        emitter({
          type: `REOWN_${eventName.toUpperCase()}`,
          data,
        });
      };

      console.log(`walletKit.on('${eventName}')`);
      walletKit.on(eventName, listener);
      listenerMap.set(eventName, listener);
    };

    addListener('session_request');
    addListener('session_proposal');
    addListener('session_delete');
    addListener('disconnect');

    return () => listenerMap.forEach((
      listener,
      eventName,
    ) => walletKit.removeListener(eventName, listener));
  });

  try {
    while (true) {
      const message = yield take(channel);

      yield put({
        type: message.type,
        payload: message.data,
      });
    }
  } catch (e) {
    log.error(e);
  } finally {
    if (yield cancelled()) {
      // When we close the channel, it will remove the event listener
      channel.close();
    }
  }
}

export function* clearSessions() {
  const { walletKit } = getGlobalReown();
  if (!walletKit) {
    console.log('Tried to get reown client in clearSessions but walletKit is undefined.');
    return;
  }

  const activeSessions = yield call(() => walletKit.getActiveSessions());

  for (const key of Object.keys(activeSessions)) {
    yield call(() => walletKit.disconnectSession({
      topic: activeSessions[key].topic,
      reason: {
        code: ERROR_CODES.USER_DISCONNECTED,
        message: '',
      },
    }));
  }

  yield call(refreshActiveSessions);
}

function* requestsListener() {
  const requestsChannel = yield actionChannel('REOWN_SESSION_REQUEST');

  let action;
  while (true) {
    try {
      action = yield take(requestsChannel);
      yield call(processRequest, action);
    } catch (error) {
      log.error('Error processing request.', error);
      yield put(onExceptionCaptured(error));
    }
  }
}

export function* processRequest(action) {
  const { payload } = action;
  const { params } = payload;

  const { walletKit } = getGlobalReown();
  if (!walletKit) {
    console.log('Tried to get reown client in processRequest but walletKit is undefined.');
    return;
  }

  const activeSessions = yield call(() => walletKit.getActiveSessions());
  const requestSession = activeSessions[payload.topic];

  if (!requestSession) {
    log.error('Could not identify the request session, ignoring request.');
    return;
  }

  const data = {
    icon: get(requestSession.peer, 'metadata.icons[0]', null),
    proposer: get(requestSession.peer, 'metadata.name', ''),
    url: get(requestSession.peer, 'metadata.url', ''),
    description: get(requestSession.peer, 'metadata.description', ''),
    chain: get(requestSession.namespaces, 'hathor.chains[0]', ''),
  };

  try {
    const wallet = getGlobalWallet();
    let dispatch;
    yield put((_dispatch) => {
      dispatch = _dispatch;
    });

    const response = yield call(
      handleRpcRequest,
      params.request,
      wallet,
      data,
      promptHandler(dispatch),
    );

    switch (response.type) {
      case RpcResponseTypes.SendNanoContractTxResponse:
        yield put(setNewNanoContractStatusSuccess());
        yield put(showGlobalModal(MODAL_TYPES.NANO_CONTRACT_FEEDBACK, { isLoading: false, isError: false }));
        break;
      case RpcResponseTypes.CreateTokenResponse:
        yield put(setCreateTokenStatusSuccessful());
        break;
      default:
        break;
    }

    yield call(() => walletKit.respondSessionRequest({
      topic: payload.topic,
      response: {
        id: payload.id,
        jsonrpc: '2.0',
        result: response,
      }
    }));
  } catch (e) {
    console.log('Got an error: ', e);
    let shouldAnswer = true;
    switch (e.constructor) {
      case SendNanoContractTxError: {
        yield put(setNewNanoContractStatusFailure());
        yield put(showGlobalModal(MODAL_TYPES.NANO_CONTRACT_FEEDBACK, { isLoading: false, isError: true }));

        const retry = yield call(
          retryHandler,
          types.REOWN_NEW_NANOCONTRACT_RETRY,
          types.REOWN_NEW_NANOCONTRACT_RETRY_DISMISS,
        );

        if (retry) {
          shouldAnswer = false;
          yield* processRequest(action);
        }
      } break;
      case CreateTokenError: {
        yield put(setCreateTokenStatusFailed());

        const retry = yield call(
          retryHandler,
          types.REOWN_CREATE_TOKEN_RETRY,
          types.REOWN_CREATE_TOKEN_RETRY_DISMISS,
        );

        if (retry) {
          shouldAnswer = false;
          yield* processRequest(action);
        }
      } break;
      default:
        break;
    }

    if (shouldAnswer) {
      try {
        yield call(() => walletKit.respondSessionRequest({
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
      } catch (error) {
        log.error('Error rejecting response on sessionRequest', error);
      }
    }
  }
}

const promptHandler = (dispatch) => (request, requestMetadata) =>
  new Promise(async (resolve, reject) => {
    switch (request.type) {
      case TriggerTypes.SignOracleDataConfirmationPrompt: {
        const signOracleDataResponseTemplate = (accepted) => () => {
          dispatch(hideGlobalModal());
          resolve({
            type: TriggerResponseTypes.SignOracleDataConfirmationResponse,
            data: accepted,
          });
        };

        dispatch({
          type: types.SHOW_SIGN_ORACLE_DATA_REQUEST_MODAL,
          payload: {
            accept: signOracleDataResponseTemplate(true),
            deny: signOracleDataResponseTemplate(false),
            data: request.data,
            dapp: requestMetadata,
          }
        });
      } break;

      case TriggerTypes.CreateTokenConfirmationPrompt: {
        const createTokenResponseTemplate = (accepted) => (data) => {
          dispatch(hideGlobalModal());
          resolve({
            type: TriggerResponseTypes.CreateTokenConfirmationResponse,
            data: {
              accepted,
              token: data?.payload,
            }
          });
        };

        dispatch({
          type: types.SHOW_CREATE_TOKEN_REQUEST_MODAL,
          payload: {
            accept: createTokenResponseTemplate(true),
            deny: createTokenResponseTemplate(false),
            data: request.data,
            dapp: requestMetadata,
          }
        });
      } break;

      case TriggerTypes.SignMessageWithAddressConfirmationPrompt: {
        const signMessageResponseTemplate = (accepted) => () => {
          dispatch(hideGlobalModal());
          resolve({
            type: TriggerResponseTypes.SignMessageWithAddressConfirmationResponse,
            data: accepted,
          });
        };

        dispatch({
          type: types.SHOW_SIGN_MESSAGE_REQUEST_MODAL,
          payload: {
            accept: signMessageResponseTemplate(true),
            deny: signMessageResponseTemplate(false),
            data: request.data,
            dapp: requestMetadata,
          }
        });
      } break;

      case TriggerTypes.SendNanoContractTxConfirmationPrompt: {
        const sendNanoContractTxResponseTemplate = (accepted) => (data) => {
          dispatch(hideGlobalModal());
          resolve({
            type: TriggerResponseTypes.SendNanoContractTxConfirmationResponse,
            data: {
              accepted,
              nc: data
            }
          });
        };

        dispatch({
          type: types.SHOW_NANO_CONTRACT_SEND_TX_MODAL,
          payload: {
            accept: sendNanoContractTxResponseTemplate(true),
            deny: sendNanoContractTxResponseTemplate(false),
            data: request.data,
            dapp: requestMetadata,
          }
        });
      } break;

      case TriggerTypes.SendNanoContractTxLoadingTrigger:
        dispatch(setNewNanoContractStatusLoading());
        dispatch(showGlobalModal(MODAL_TYPES.NANO_CONTRACT_FEEDBACK, { isLoading: true }));
        resolve();
        break;

      case TriggerTypes.CreateTokenLoadingTrigger:
        dispatch(setCreateTokenStatusLoading());
        resolve();
        break;

      case TriggerTypes.CreateTokenLoadingFinishedTrigger:
        dispatch(setCreateTokenStatusReady());
        resolve();
        break;

      case TriggerTypes.SendNanoContractTxLoadingFinishedTrigger:
        dispatch(setNewNanoContractStatusReady());
        resolve();
        break;

      case TriggerTypes.PinConfirmationPrompt: {
        const pinPromise = new Promise((pinResolve, pinReject) => {
          dispatch(showGlobalModal(MODAL_TYPES.PIN_PAD, {
            onComplete: (pinCode) => {
              dispatch(hideGlobalModal());
              pinResolve(pinCode);
            },
            onCancel: () => {
              dispatch(hideGlobalModal());
              pinReject(new Error('PIN entry cancelled'));
            }
          }));
        });

        pinPromise
          .then((pinCode) => {
            resolve({
              type: TriggerResponseTypes.PinRequestResponse,
              data: {
                accepted: true,
                pinCode,
              }
            });
          })
          .catch(() => {
            resolve({
              type: TriggerResponseTypes.PinRequestResponse,
              data: {
                accepted: false,
                pinCode: null,
              }
            });
          });
      } break;

      default:
        reject(new Error('Invalid request'));
    }
  });

export function* onSignMessageRequest({ payload }) {
  const { accept, deny: denyCb, data, dapp } = payload;
  const wallet = getGlobalWallet();

  if (!wallet.isReady()) {
    log.error('Got a session request but wallet is not ready.');
    return;
  }

  yield put(showGlobalModal(MODAL_TYPES.REOWN, {
    type: ReownModalTypes.SIGN_MESSAGE,
    data: {
      data,
      dapp,
    },
    onAcceptAction: accept,
    onRejectAction: denyCb,
  }));

  const { deny } = yield race({
    accept: take(types.REOWN_ACCEPT),
    deny: take(types.REOWN_REJECT),
  });

  if (deny) {
    denyCb();
    return;
  }

  accept();
}

export function* onSignOracleDataRequest({ payload }) {
  const { accept, deny: denyCb, data, dapp } = payload;
  const wallet = getGlobalWallet();

  if (!wallet.isReady()) {
    log.error('Got a session request but wallet is not ready.');
    return;
  }

  yield put(showGlobalModal(MODAL_TYPES.REOWN, {
    type: ReownModalTypes.SIGN_ORACLE_DATA,
    data: {
      data,
      dapp,
    },
    onAcceptAction: accept,
    onRejectAction: denyCb,
  }));

  const { deny } = yield race({
    accept: take(types.REOWN_ACCEPT),
    deny: take(types.REOWN_REJECT),
  });

  if (deny) {
    denyCb();
    return;
  }

  accept();
}

export function* onSendNanoContractTxRequest({ payload }) {
  const { accept, deny: denyCb, data, dapp } = payload;
  const wallet = getGlobalWallet();

  if (!wallet.isReady()) {
    log.error('Got a session request but wallet is not ready.');
    return;
  }

  yield put(showGlobalModal(MODAL_TYPES.REOWN, {
    type: ReownModalTypes.SEND_NANO_CONTRACT_TX,
    data: {
      data,
      dapp,
    },
    onAcceptAction: accept,
    onRejectAction: denyCb,
  }));

  const { deny } = yield race({
    accept: take(types.REOWN_ACCEPT),
    deny: take(types.REOWN_REJECT),
  });

  if (deny) {
    denyCb();
    return;
  }

  accept();
}

export function* onCreateTokenRequest({ payload }) {
  const { accept, deny: denyCb, data, dapp } = payload;
  const wallet = getGlobalWallet();

  if (!wallet.isReady()) {
    log.error('Got a session request but wallet is not ready.');
    return;
  }

  yield put(showGlobalModal(MODAL_TYPES.REOWN, {
    type: ReownModalTypes.CREATE_TOKEN,
    data: {
      data,
      dapp,
    },
    onAcceptAction: accept,
    onRejectAction: denyCb,
  }));

  const { deny } = yield race({
    accept: take(types.REOWN_ACCEPT),
    deny: take(types.REOWN_REJECT),
  });

  if (deny) {
    denyCb();
    return;
  }

  accept();
}

export function* onWalletReset() {
  const { walletKit } = getGlobalReown();
  if (!walletKit) {
    log.error('WalletKit not initialized.');
    return;
  }

  yield call(clearSessions);
}

export function* onSessionProposal(action) {
  console.log('Got session proposal', action);
  const { id, params } = action.payload;
  
  try {
    const data = {
      icon: get(params, 'proposer.metadata.icons[0]', null),
      proposer: get(params, 'proposer.metadata.name', ''),
      url: get(params, 'proposer.metadata.url', ''),
      description: get(params, 'proposer.metadata.description', ''),
      requiredNamespaces: get(params, 'requiredNamespaces', []),
    };

    let dispatch;
    yield put((_dispatch) => {
      dispatch = _dispatch;
    });

    const connectResponseTemplate = (accepted) => () => {
      dispatch(hideGlobalModal());
      if (accepted) {
        dispatch({ type: types.REOWN_ACCEPT });
      } else {
        dispatch({ type: types.REOWN_REJECT });
      }
    };

    // Show the modal
    yield put(showGlobalModal(MODAL_TYPES.REOWN, {
      type: ReownModalTypes.CONNECT,
      data,
      onAcceptAction: connectResponseTemplate(true),
      onRejectAction: connectResponseTemplate(false),
    }));

    const { accepted } = yield race({
      accepted: take(types.REOWN_ACCEPT),
      rejected: take(types.REOWN_REJECT),
    });

    console.log('Accepted: ', accepted);

    const { walletKit } = getGlobalReown();
    if (!walletKit) {
      throw new Error('WalletKit not initialized');
    }

    const networkSettings = yield select(getNetworkSettings);
    console.log('Network Settings: ', networkSettings);
    if (accepted) {
      const wallet = getGlobalWallet();
      const firstAddress = yield call(() => wallet.getAddressAtIndex(0));

      // User accepted the proposal
      yield call([walletKit, walletKit.approveSession], {
        id,
        relayProtocol: params.relays[0].protocol,
        namespaces: {
          hathor: {
            accounts: [`hathor:${networkSettings.network}:${firstAddress}`],
            chains: [`hathor:${networkSettings.network}`],
            events: AVAILABLE_EVENTS,
            methods: values(AVAILABLE_METHODS),
          },
        },
      });
    } else {
      // User rejected the proposal
      yield call([walletKit, walletKit.rejectSession], {
        id,
        reason: {
          code: ERROR_CODES.USER_REJECTED,
          message: 'User rejected the session',
        },
      });
    }

    // Refresh the sessions list
    yield call(refreshActiveSessions);
  } catch (error) {
    console.error('Error handling session proposal:', error);
    yield put(onExceptionCaptured(error));
  } finally {
    // Make sure to close the modal even if there's an error
    yield put(hideGlobalModal());
  }
}

export function* onUriInputted(action) {
  const { core, walletKit } = getGlobalReown();

  if (!core || !walletKit) {
    console.log('Tried to get reown client in onUriInputted but core or walletKit is undefined.');
    return;
  }

  const { payload } = action;

  try {
    console.log('Will pair with URI');
    yield call(core.pairing.pair, { uri: payload });
    console.log('Pairing successful');
  } catch (error) {
    console.log('Error pairing: ', error);
    yield put(setWCConnectionFailed(true));
  }
}

export function* featureToggleUpdateListener() {
  while (true) {
    const oldReownEnabled = yield call(isReownEnabled);
    yield take('FEATURE_TOGGLE_UPDATED');
    const newReownEnabled = yield call(isReownEnabled);

    if (oldReownEnabled && !newReownEnabled) {
      yield put({ type: types.REOWN_SHUTDOWN });
    }
  }
}

export function* onCancelSession(action) {
  const { walletKit } = getGlobalReown();

  if (!walletKit) {
    console.log('Tried to get reown client in onCancelSession but walletKit is undefined.');
    return;
  }

  const activeSessions = yield call(() => walletKit.getActiveSessions());

  if (activeSessions[action.payload.id]) {
    yield call(() => walletKit.disconnectSession({
      topic: activeSessions[action.payload.id].topic,
      reason: {
        code: ERROR_CODES.USER_DISCONNECTED,
        message: 'User cancelled the session',
      },
    }));
  }

  yield call(refreshActiveSessions);
}

export function* onSessionDelete(action) {
  yield call(onCancelSession, action);
}

export function* saga() {
  yield all([
    fork(featureToggleUpdateListener),
    fork(init),
    fork(listenForNetworkChange),
    takeLatest(types.SHOW_NANO_CONTRACT_SEND_TX_MODAL, onSendNanoContractTxRequest),
    takeLatest(types.SHOW_SIGN_MESSAGE_REQUEST_MODAL, onSignMessageRequest),
    takeLatest(types.SHOW_SIGN_ORACLE_DATA_REQUEST_MODAL, onSignOracleDataRequest),
    takeLatest(types.SHOW_CREATE_TOKEN_REQUEST_MODAL, onCreateTokenRequest),
    takeEvery(types.REOWN_SESSION_PROPOSAL, onSessionProposal),
    takeEvery(types.REOWN_SESSION_DELETE, onSessionDelete),
    takeEvery(types.REOWN_CANCEL_SESSION, onCancelSession),
    takeEvery(types.REOWN_SHUTDOWN, clearSessions),
    takeEvery(types.WALLET_RESET, onWalletReset),
    takeLatest(types.REOWN_URI_INPUTTED, onUriInputted),
  ]);
} 
