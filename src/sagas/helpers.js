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

/**
 * Waits until feature toggle saga finishes loading
 */
export function* waitForFeatureToggleInitialization() {
  const featureTogglesInitialized = yield select((state) => state.featureTogglesInitialized);

  if (!featureTogglesInitialized) {
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

/**
 * Get registered tokens from the wallet instance.
 * @param {HathorWallet} wallet
 * @param {boolean} excludeHTR If we should exclude the HTR token.
 * @returns {string[]}
 */
export async function getRegisteredTokens(wallet, excludeHTR = false) {
  const tokenConfigArr = await tokensUtils.getRegisteredTokens(wallet, excludeHTR);
  return tokenConfigArr.map(token => token.uid);
}
