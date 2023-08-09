/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import LOCAL_STORE, { STARTED_KEY, LOCKED_KEY, CLOSED_KEY, IS_BACKUP_DONE_KEY, IS_HARDWARE_KEY } from '../storage';

const storageUtils = {
  migratePreviousLocalStorage() {
    const accessData = localStorage.getItem('wallet:accessData');

    if (!accessData) {
      return;
    }

    if (LOCAL_STORE.getItem('wallet:started')) {
      LOCAL_STORE.setItem(
        STARTED_KEY,
        LOCAL_STORE.getItem('wallet:started'),
      );
    }
    if (LOCAL_STORE.getItem('wallet:locked')) {
      LOCAL_STORE.setItem(
        LOCKED_KEY,
        LOCAL_STORE.getItem('wallet:locked'),
      );
    }
    if (LOCAL_STORE.getItem('wallet:closed')) {
      LOCAL_STORE.setItem(
        CLOSED_KEY,
        LOCAL_STORE.getItem('wallet:closed'),
      );
    }
    if (LOCAL_STORE.getItem('wallet:backup')) {
      LOCAL_STORE.setItem(
        IS_BACKUP_DONE_KEY,
        LOCAL_STORE.getItem('wallet:backup'),
      );
    }
    if (LOCAL_STORE.getItem('wallet:type')) {
      LOCAL_STORE.setItem(
        IS_HARDWARE_KEY,
        LOCAL_STORE.getItem('wallet:type') === 'hardware',
      );
    }
  }
};

export default storageUtils;
