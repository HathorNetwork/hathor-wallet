/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from "@hathor/wallet-lib";

/**
 * Application-wide HathorWallet object
 * @type {hathorLib.HathorWallet|null}
 */
let globalWallet = null;

/**
 * Sets the global Hathor Wallet
 * @param {hathorLib.HathorWallet} wallet
 */
export function setGlobalWallet(wallet) {
	if (globalWallet && globalWallet.state !== hathorLib.HathorWallet.CLOSED) {
		// Wallet was not closed
		globalWallet.stop({ cleanStorage: false });
	}

	globalWallet = wallet;
}

/**
 * Retrieves the application-wide HathorWallet object
 */
export function getGlobalWallet() {
	return globalWallet;
}

/**
 * Stops the application-wide HathorWallet object and removes it from memory
 */
export function stopWallet() {
	if (!globalWallet) {
		return;
	}

	globalWallet.stop();
	globalWallet = null;
}
