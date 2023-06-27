/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  UnleashClient,
  EVENTS as UnleashEvents,
} from 'unleash-proxy-client';
import { get } from 'lodash';
import {
  takeEvery,
  all,
  call,
  delay,
  put,
  cancelled,
  select,
  race,
  take,
  fork,
  spawn,
} from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import { config } from '@hathor/wallet-lib';
import helpers from '../utils/helpers';

import {
  setUnleashClient,
  setFeatureToggles,
  featureToggleInitialized,
} from '../actions';
import {
  UNLEASH_URL,
  UNLEASH_CLIENT_KEY,
  UNLEASH_POLLING_INTERVAL,
  FEATURE_TOGGLE_DEFAULTS,
} from '../constants';

const CONNECT_TIMEOUT = 10000;
const MAX_RETRIES = 5;

export function* handleInitFailed(currentRetry) {
  if (currentRetry >= MAX_RETRIES) {
    console.error('Max retries reached while trying to create the unleash-proxy client.');
    const unleashClient = yield select((state) => state.unleashClient);

    if (unleashClient) {
      unleashClient.close();
      yield put(setUnleashClient(null));
    }

    // Even if unleash failed, we should allow the app to continue as it
    // has defaults set for all feature toggles. Emit featureToggleInitialized
    // so sagas waiting for it will resume.
    yield put(featureToggleInitialized());
    return;
  }

  yield spawn(monitorFeatureFlags, currentRetry + 1);
}

export function* fetchTogglesRoutine() {
  while (true) {
    // Wait first so we don't double-check on initialization
    yield delay(UNLEASH_POLLING_INTERVAL);

    const unleashClient = yield select((state) => state.unleashClient);

    try {
      yield call(() => unleashClient.fetchToggles());
    } catch (e) {
      // No need to do anything here as it will try again automatically in
      // UNLEASH_POLLING_INTERVAL. Just prevent it from crashing the saga.
      console.error('Erroed fetching feature toggles', e);
    }
  }
}

export function* monitorFeatureFlags(currentRetry = 0) {
  const unleashClient = new UnleashClient({
    url: UNLEASH_URL,
    clientKey: UNLEASH_CLIENT_KEY,
    refreshInterval: -1,
    disableRefresh: true, // Disable it, we will handle it ourselves
    appName: 'wallet-desktop',
  });

  const userId = helpers.getUniqueId();
  const platform = helpers.getCurrentOS();
  const network = config.getNetwork().name;

  const options = {
    userId,
    properties: {
      network,
      platform,
    },
  };

  try {
    yield call(() => unleashClient.updateContext(options));
    yield put(setUnleashClient(unleashClient));

    // Listeners should be set before unleashClient.start so we don't miss
    // updates
    yield fork(setupUnleashListeners, unleashClient);

    // Start without awaiting it so we can listen for the
    // READY event
    unleashClient.start();

    const { error, timeout } = yield race({
      error: take('FEATURE_TOGGLE_ERROR'),
      success: take('FEATURE_TOGGLE_READY'),
      timeout: delay(CONNECT_TIMEOUT),
    });

    if (error || timeout) {
      throw new Error('Error or timeout while connecting to unleash proxy.');
    }

    // Fork the routine to download toggles.
    yield fork(fetchTogglesRoutine);

    // At this point, unleashClient.start() already fetched the toggles
    const featureToggles = mapFeatureToggles(unleashClient.toggles);

    yield put(setFeatureToggles(featureToggles));
    yield put(featureToggleInitialized());

    if (yield cancelled()) {
      yield call(() => unleashClient.stop());
    }
  } catch (e) {
    console.error('Error initializing unleash');
    unleashClient.stop();

    yield put(setUnleashClient(null));

    // Wait 500ms before retrying
    yield delay(500);

    // Spawn so it's detached from the current thread
    yield spawn(handleInitFailed, currentRetry);
  }
}

export function* setupUnleashListeners(unleashClient) {
  const channel = eventChannel((emitter) => {
    unleashClient.on(UnleashEvents.UPDATE, () => emitter({
      type: 'FEATURE_TOGGLE_UPDATE',
    }));

    unleashClient.on(UnleashEvents.READY, () => emitter({
      type: 'FEATURE_TOGGLE_READY',
    }));

    unleashClient.on(UnleashEvents.ERROR, (err) => emitter({
      type: 'FEATURE_TOGGLE_ERROR',
      data: err,
    }));

    return () => {
      // XXX: This should be a cleanup but removeListener does not exist
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

function mapFeatureToggles(toggles) {
  return toggles.reduce((acc, toggle) => {
    acc[toggle.name] = get(
      toggle,
      'enabled',
      FEATURE_TOGGLE_DEFAULTS[toggle.name] || false,
    );

    return acc;
  }, {});
}

export function* handleToggleUpdate() {
  const unleashClient = yield select((state) => state.unleashClient);
  const featureTogglesInitialized = yield select((state) => state.featureTogglesInitialized);

  if (!unleashClient || !featureTogglesInitialized) {
    return;
  }

  const { toggles } = unleashClient;
  const featureToggles = mapFeatureToggles(toggles);

  yield put(setFeatureToggles(featureToggles));
  yield put({ type: 'FEATURE_TOGGLE_UPDATED' });
}

export function* saga() {
  yield all([
    fork(monitorFeatureFlags),
    takeEvery('FEATURE_TOGGLE_UPDATE', handleToggleUpdate),
  ]);
}
