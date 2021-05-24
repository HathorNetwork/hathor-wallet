/**
 * copyright (c) hathor labs and its affiliates.
 *
 * this source code is licensed under the mit license found in the
 * license file in the root directory of this source tree.
 */

import { HybridStore } from './storage.js';

/**
 * Store to be used in the wallet and all HathorWallet objects created
 */
const STORE = new HybridStore();

export default STORE;
