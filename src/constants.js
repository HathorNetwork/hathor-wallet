/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Constants defined for the Hathor Wallet
 * @module Constants
 */


/**
 * Local storage data useful for debugging purposes.  
 * WARNING: we cannot include any arbitrarily large fields (e.g. wallet:data) on Sentry request.  
 * WARNING: the request has a max size of 200kb and if it is bigger than this it'll be denied by Sentry.
 */
export const DEBUG_LOCAL_DATA_KEYS = [
  `wallet:server`,
  `wallet:tokens`,
  `wallet:started`,
  `wallet:backup`,
  `wallet:locked`,
  `wallet:closed`,
  `wallet:lastSharedIndex`,
  `wallet:lastGeneratedIndex`,
  `wallet:lastUsedIndex`,
  `wallet:lastUsedAddress`,
  `wallet:address`
]

/**
 * Sentry connection DSN
 */
export const SENTRY_DSN = process.env.SENTRY_DSN || 'https://69c067d1587c465cac836eaf25467ce1@sentry.io/1410476'
