/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from "@hathor/wallet-lib";

/**
 *
 * @type {HathorWallet|null}
 */
let globalWallet = null;

/**
 * Sets the global Hathor Wallet
 * @param {HathorWallet} wallet
 */
export function setGlobalWallet(wallet) {
	if (globalWallet && globalWallet.state !== hathorLib.HathorWallet.CLOSED) {
		// Wallet was not closed
		globalWallet.stop({ cleanStorage: false });
	}

	globalWallet = wallet;
}

export function getGlobalWallet() {
	return globalWallet;
}

export function resetWallet() {
	if (!globalWallet) {
		return;
	}

	globalWallet.stop();
	globalWallet = null;
}
