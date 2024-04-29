/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

let unleashClient = null;

export function setUnleashClient(_unleashClient) {
  unleashClient = _unleashClient;
}

export function getUnleashClient() {
  return unleashClient;
}
