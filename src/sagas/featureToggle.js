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
import { VERSION } from '../constants';

import {
  setFeatureToggles,
  featureToggleInitialized,
} from '../actions';
import {
  UNLEASH_URL,
  UNLEASH_CLIENT_KEY,
  UNLEASH_POLLING_INTERVAL,
  FEATURE_TOGGLE_DEFAULTS,
} from '../constants';
import { getUnleashClient, setUnleashClient } from "../services/unleash.service";

const CONNECT_TIMEOUT = 10000;
const MAX_RETRIES = 5;

export function* handleInitFailed(currentRetry) {
  if (currentRetry >= MAX_RETRIES) {
    console.error('Max retries reached while trying to create the unleash-proxy client.');
    const unleashClient = getUnleashClient();

    if (unleashClient) {
      unleashClient.close();
      setUnleashClient(null);
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

    const unleashClient = getUnleashClient();

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
      appVersion: VERSION,
    },
  };

  try {
    console.log('starting unleash with', options);
    yield call(() => unleashClient.updateContext(options));
    setUnleashClient(unleashClient);

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
    console.error(e);
    console.error('Error initializing unleash');
    unleashClient.stop();

    setUnleashClient(null);

    // Wait 500ms before retrying
    yield delay(500);

    // Spawn so it's detached from the current thread
    yield spawn(handleInitFailed, currentRetry);
  }
}

export function* setupUnleashListeners(unleashClient) {
  const channel = eventChannel((emitter) => {

    const l1 = () => emitter({
      type: 'FEATURE_TOGGLE_UPDATE',
    });
    unleashClient.on(UnleashEvents.UPDATE, l1);

    const l2 = () => emitter({
      type: 'FEATURE_TOGGLE_READY',
    });
    unleashClient.on(UnleashEvents.READY, l2);

    const l3 = (err) => emitter({
      type: 'FEATURE_TOGGLE_ERROR',
      data: err,
    });
    unleashClient.on(UnleashEvents.ERROR, l3);

    return () => {
      unleashClient.off(UnleashEvents.UPDATE, l1);
      unleashClient.off(UnleashEvents.READY, l2);
      unleashClient.off(UnleashEvents.ERROR, l3);
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
  const unleashClient = getUnleashClient();
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
