import { get } from 'lodash';
import {
  put,
  call,
  race,
  take,
  select,
} from 'redux-saga/effects';
import { types } from '../actions';
import { FEATURE_TOGGLE_DEFAULTS } from '../constants';
import tokensUtils from '../utils/tokens';
import version from '../utils/version';
import ledger from '../utils/ledger';
import LOCAL_STORE from '../storage';

/**
 * Waits until feature toggle saga finishes loading
 */
export function* waitForFeatureToggleInitialization() {
  const featureTogglesInitialized = yield select((state) => state.featureTogglesInitialized);

  if (!featureTogglesInitialized) {
    console.log('Feature toggle is not initialized, will wait indefinetely until it is.');
    // Wait until featureToggle saga completed initialization, which includes
    // downloading the current toggle status for this client.
    yield take(types.FEATURE_TOGGLE_INITIALIZED);
  }
}

/**
 * This generator will wait until the feature toggle saga finishes loading and
 * checks if a given flag is active
 *
 * @param {String} flag - The flag to check
 * @return {Boolean} Whether the flag is on of off
 */
export function* checkForFeatureFlag(flag) {
  yield call(waitForFeatureToggleInitialization);

  const featureToggles = yield select((state) => state.featureToggles);

  return get(featureToggles, flag, FEATURE_TOGGLE_DEFAULTS[flag] || false);
}

/**
 * Helper method to be used on take saga effect, will wait until an action
 * with type and payload matching the passed (type, payload)
 *
 * @param {String[] | String} type - String list or a simple string with the action type(s)
 * @param {Object} payload - Object with the keys and values to compare
 */
export const specificTypeAndPayload = (_types, payload) => (action) => {
  let types = _types;

  if (!Array.isArray(_types)) {
    types = [_types];
  }

  if (types.indexOf(action.type) === -1) {
    return false;
  }

  const keys = Object.keys(payload);

  for (const key of keys) {
    const actionKey = get(action, key);
    const payloadKey = get(payload, key);

    if (actionKey !== payloadKey) {
      return false;
    }
  }

  return true;
};

/**
 * Helper method to dispatch an action and wait for the response
 *
 * @param action - The action to dispatch
 * @param successAction - The action to expect as a success
 * @param failureAction - The action to expect as a failure
 */
export function* dispatchAndWait(action, successAction, failureAction) {
  yield put(action);

  return yield race({
    success: take(successAction),
    falure: take(failureAction),
  });
}

/**
 * Handles errors thrown from the main saga (started with call) by yielding
 * an action passed as a parameter
 *
 * @param saga - The saga to call (synchronously)
 * @param failureAction - Yields this action (with put) if the main action throws
 */
export function errorHandler(saga, failureAction) {
  return function* handleAction(action) {
    try {
      yield call(saga, action);
    } catch (e) {
      console.error(`Captured error handling ${action.type}`, e);
      yield put(failureAction);
    }
  };
}

export function* dispatchLedgerTokenSignatureVerification(wallet) {
  const isHardware = yield wallet.storage.isHardwareWallet();
  if (!isHardware) {
    // We are not connected to a hardware wallet, we can just ignore this.
    return;
  }
  const tokenSignatures = LOCAL_STORE.getTokenSignatures();
  if (!tokenSignatures) {
    // We do not have any signatures to check, we can just ignore this.
    return;
  }

  const registeredTokens = yield tokensUtils.getRegisteredTokens(wallet, true);
  const tokensToVerify = registeredTokens
      .filter(t => !!tokenSignatures[t.uid])
      .map(t => {
        const signature = tokenSignatures[t.uid];
        return { ...t, signature };
      });

  if (version.isLedgerCustomTokenAllowed() && tokensToVerify.length !== 0) {
    ledger.verifyManyTokenSignatures(tokensToVerify);
  }
}

/**
 * Helper method that waits for either a retry action or dismiss action to be dispatched
 * and returns whether the retry action was dispatched
 *
 * @param {String | String[]} retryAction - The action type(s) that indicates a retry should occur
 * @param {String | String[]} dismissAction - The action type(s) that indicates the operation should be dismissed
 * @return {Boolean} True if the retry action was dispatched, false otherwise
 */
export function* retryHandler(retryAction, dismissAction) {
  const { retry } = yield race({
    retry: take(retryAction),
    dismiss: take(dismissAction),
  });

  return retry != null;
}

export const getNetworkSettings = (state) => state.networkSettings.data;
