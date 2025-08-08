import { NETWORK_SETTINGS_STATUS } from '../constants';
import { types, isVersionAllowedUpdate, selectToken, setNetworkSettingsStatus, serverInfoUpdated } from '../actions';
import { all, call, fork, join, put, select, take, takeEvery } from 'redux-saga/effects';
import hathorLib from '@hathor/wallet-lib';
import { getGlobalWallet } from '../modules/wallet';
import helpers from '../utils/helpers';
import walletUtils from '../utils/wallet';
import { updateUnleashClientContext } from './featureToggle';
import { t } from 'ttag';

/**
 * Change network settings with new data
 * @param {Object} action with request payload.
 * @param {string} action.data.node
 * @param {string} action.data.txMining
 * @param {string} action.data.explorer
 * @param {string} action.data.explorerService
 * @param {string} action.data.walletService
 * @param {string} action.data.walletServiceWS
 * @param {string} action.pin
 */
export function* changeNetworkSettings({ data, pin }) {
  yield put(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.LOADING }));
  const useWalletService = yield select((state) => state.useWalletService);
  const wallet = getGlobalWallet();
  const currentServer = useWalletService ?
    hathorLib.config.getWalletServiceBaseUrl() :
    hathorLib.config.getServerUrl();

  const currentWsServer = useWalletService ?
    hathorLib.config.getWalletServiceBaseWsUrl() :
    '';

  // Update new server in storage and in the config singleton
  wallet.changeServer(data.node);

  // We only have a different websocket server on the wallet-service facade, so update the config singleton
  if (useWalletService) {
    yield call([wallet, wallet.changeWsServer], newWsServer);
  }

  let versionData;
  try {
    const versionUrl = new URL('version', data.node).toString();
    /*
     * Using fetch instead of the wallet-lib axios instance to bypass
     * the axios interceptor that is used to check for network errors.
     * If this request fails, we don't want the network error modal to be shown.
     */
    const response = yield call(fetch, versionUrl);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    versionData = yield call([response, response.json]);
  } catch (e) {
    // Invalid node, so go back to the previous server and return
    wallet.changeServer(currentServer);
    if (useWalletService) {
      yield call([wallet, wallet.changeWsServer], currentWsServer);
    }
    yield put(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.ERROR, error: t`Invalid node.` }));
    return;
  }

  if (versionData.network === 'mainnet') {
    yield executeNetworkSettingsUpdate({ ...data, network: versionData.network, fullNetwork: versionData.network }, pin);
    return;
  }

  // We must get user confirmation because the new network is a testnet or privatenet
  // This new status will open a modal for the user to confirm that wants to connect to a testnet/privatenet
  const newNetwork = hathorLib.helpersUtils.getNetworkFromFullNodeNetwork(versionData.network);
  yield put(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.WAITING_NETWORK_CONFIRMATION, newNetwork }));

  // Wait until network settings status changes
  // If user confirms the network, the status will change to NETWORK_CONFIRMED
  // otherwise it will change to READY, if user closes the modal without confirming
  yield take(types.NETWORKSETTINGS_SET_STATUS);

  const networkSettingsStatus = yield select((state) => state.networkSettings.status);
  if (networkSettingsStatus !== NETWORK_SETTINGS_STATUS.NETWORK_CONFIRMED) {
    // User cancelled the operation, so we change the old server back and return
    wallet.changeServer(currentServer);
    if (useWalletService) {
      yield call([wallet, wallet.changeWsServer], currentWsServer);
    }
    return;
  }

  yield executeNetworkSettingsUpdate({ ...data, network: newNetwork, fullNetwork: versionData.network }, pin);
}

function* waitForUpdateSuccess() {
  yield take('NETWORKSETTINGS_UPDATE_SUCCESS');
}

/**
 * Helper method that executes the network settings update.
 *
 * It persists on storage, redux and update the wallet lib.
 *
 * @param {Object} networkSettings with the data
 * @param {string} networkSettings.node
 * @param {string} networkSettings.network
 * @param {string} networkSettings.fullNetwork
 * @param {string} networkSettings.txMining
 * @param {string} networkSettings.explorer
 * @param {string} networkSettings.explorerService
 * @param {string} networkSettings.walletService
 * @param {string} networkSettings.walletServiceWS
 * @param {string} pin
 */
function* executeNetworkSettingsUpdate(networkSettings, pin) {
  const wallet = getGlobalWallet();
  const networkSettingsRedux = yield select((state) => state.networkSettings);
  const networkSettingsBackup = { ...networkSettingsRedux };
  try {
    // Start waiting for the success in parallel
    const waitTask = yield fork(waitForUpdateSuccess);
    // Call the function that dispatches the action (e.g., makes API call)
    helpers.updateNetworkSettings(networkSettings);
    // Wait for the success to actually happen
    yield join(waitTask);
    yield call(updateUnleashClientContext, networkSettings);
    // Forces the re-validation of the allowed version after server change
    yield put(isVersionAllowedUpdate({ allowed: undefined }));
    yield put(selectToken(hathorLib.constants.NATIVE_TOKEN_UID));
    yield call(walletUtils.changeServer, wallet, pin, true);
    // Notify that server info was updated
    yield put(serverInfoUpdated());
  } catch (e) {
    console.error(e);
    // Restores storage and states as it was before
    helpers.updateNetworkSettings(networkSettingsBackup);
    yield call(updateUnleashClientContext, networkSettingsBackup);
    yield put(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.ERROR, error: t`Error updating network settings.` }));
  }
  yield put(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.SUCCESS }));
}

export function* saga() {
  yield all([
    takeEvery(types.NETWORKSETTINGS_UPDATE_REQUESTED, changeNetworkSettings),
  ]);
}
