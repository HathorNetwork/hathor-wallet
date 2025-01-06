/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const logger = (namespace) => ({
  debug: (...args) => console.debug(`[${namespace}]`, ...args),
  error: (...args) => console.error(`[${namespace}]`, ...args),
  info: (...args) => console.info(`[${namespace}]`, ...args),
  warn: (...args) => console.warn(`[${namespace}]`, ...args),
});
