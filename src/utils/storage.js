/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import LOCAL_STORE, { STARTED_KEY, LOCKED_KEY, CLOSED_KEY, IS_BACKUP_DONE_KEY, IS_HARDWARE_KEY, SERVER_KEY } from '../storage';

import helpers from './helpers';

const storageUtils = {
  /**
   * Migrate the localStorage from a previous version to the current version.
   *
   * The current state should not be affected if we run this method more than
   * once. Like a user closing and opening the wallet again before inputing his
   * pin.
   */
  migratePreviousLocalStorage() {
    const oldStorageKeys = {
      OLD_STARTED_KEY: 'wallet:started',
      OLD_LOCKED_KEY: 'wallet:locked',
      OLD_CLOSED_KEY: 'wallet:closed',
      OLD_BACKUP_KEY: 'wallet:backup',
      OLD_TYPE_KEY: 'wallet:type',
      OLD_NETWORK_KEY: 'wallet:network',
      OLD_SERVER_KEY: 'wallet:server',
    }

    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_NETWORK_KEY)) {
      helpers.updateNetwork(LOCAL_STORE.getItem(oldStorageKeys.OLD_NETWORK_KEY));
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_NETWORK_KEY);
    }

    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_SERVER_KEY)) {
      LOCAL_STORE.setItem(
        SERVER_KEY,
        LOCAL_STORE.getItem(oldStorageKeys.OLD_SERVER_KEY),
      )
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_SERVER_KEY);
    }

    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_STARTED_KEY)) {
      LOCAL_STORE.setItem(
        STARTED_KEY,
        LOCAL_STORE.getItem(oldStorageKeys.OLD_STARTED_KEY),
      );
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_STARTED_KEY);
    }
    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_LOCKED_KEY)) {
      LOCAL_STORE.setItem(
        LOCKED_KEY,
        LOCAL_STORE.getItem(oldStorageKeys.OLD_LOCKED_KEY),
      );
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_LOCKED_KEY);
    }
    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_CLOSED_KEY)) {
      LOCAL_STORE.setItem(
        CLOSED_KEY,
        LOCAL_STORE.getItem(oldStorageKeys.OLD_CLOSED_KEY),
      );
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_CLOSED_KEY);
    }
    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_BACKUP_KEY)) {
      LOCAL_STORE.setItem(
        IS_BACKUP_DONE_KEY,
        LOCAL_STORE.getItem(oldStorageKeys.OLD_BACKUP_KEY),
      );
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_BACKUP_KEY);
    }
    if (LOCAL_STORE.getItem(oldStorageKeys.OLD_TYPE_KEY)) {
      LOCAL_STORE.setItem(
        IS_HARDWARE_KEY,
        LOCAL_STORE.getItem(oldStorageKeys.OLD_TYPE_KEY) === 'hardware',
      );
      LOCAL_STORE.removeItem(oldStorageKeys.OLD_TYPE_KEY);
    }
  }
};

export default storageUtils;
