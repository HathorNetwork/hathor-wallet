/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { v4 } from 'uuid'
import hathorLib, { PartialTx, PartialTxInputData, PartialTxProposal } from "@hathor/wallet-lib";
import { DECIMAL_PLACES, TOKEN_MINT_MASK, TOKEN_MELT_MASK, HATHOR_TOKEN_CONFIG } from "@hathor/wallet-lib/lib/constants";
import { get } from 'lodash';
import walletUtil from "./wallet";

const { wallet: oldWallet } = hathorLib;
/**
 * @typedef ProposalData
 * @property {string} id Proposal identifier
 * @property {number} [amountTokens] Derived from proposal data, simplified for exhibition
 * @property {string} [signatureStatus] Derived from proposal data, simplified for exhibition
 * @property {boolean} [canISign] Derived from proposal data, simplified for calculations
 * @property {string} partialTx Serialized unencrypted proposal data
 * @property {string} [signatures] Merged serialized signatures from all participants
 * @property {number} [timestamp] Last update timestamp
 * @property {{partialTx: string, timestamp: number}[]} history History objects array
 */

/**
 * @typedef ReduxProposalData
 * @property {string} id Proposal identifier
 * @property {string} password Proposal password, stored locally
 * @property {string} status Saga loading status, from PROPOSAL_DOWNLOAD_STATUS
 * @property {string} [errorMessage] Error message, present when status is failed
 * @property {string} [oldStatus] Saga-related information, from PROPOSAL_DOWNLOAD_STATUS
 * @property {number} [updatedAt] Saga-related last update timestamp
 * @property {ProposalData} [data] Full decrypted proposal data
 * @property {BackendProposalData} [rawData] Raw data received from the backend
 */

/**
 * @typedef BackendProposalData
 * @property {string} id
 * @property {string} partialTx Encrypted PartialTx data
 * @property {string} signatures Encrypted Signatures data
 * @property {number} timestamp Latest update timestamp
 * @property {{partialTx: string, timestamp: number}[]} history Historic data
 */

/**
 * Generates a random positive integer between the maximum and minimum values,
 * with the default minimum equals zero
 * @param {number} max
 * @param {number} [min=0]
 * @returns {number} Random number
 */
export function getRandomInt(max, min = 0) {
    const _min = Math.ceil(min);
    const _max = Math.floor(max);
    return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}

export const PROPOSAL_DOWNLOAD_STATUS = {
    READY: 'ready',
    FAILED: 'failed',
    LOADING: 'loading',
    INVALIDATED: 'invalidated',
};

export const PROPOSAL_SIGNATURE_STATUS = {
    OPEN: 'Open',
    PARTIALLY_SIGNED: 'Partially Signed',
    SIGNED: 'Signed',
    SENT: 'Sent',
}



/**
 * The amount from the InputNumber component is represented in a float format, with an amount of decimal
 * cases defined by a lib's constant. This helper function converts it back to an integer.
 * @param {number} floatAmount
 * @returns {number}
 */
export function getIntTokenAmount(floatAmount) {
    return Math.floor(floatAmount * Math.pow(10, DECIMAL_PLACES));
}

export function deserializePartialTx(strPartialTx, wallet) {
    const networkObject = wallet.getNetworkObject();
    const partialTx = PartialTx.deserialize(strPartialTx, networkObject);
    enrichTxData(partialTx, wallet);

    return partialTx;
}

/**
 * Reduces the amount of information that goes to the LocalStorage and ensures that
 * the redux state will be updated on every session.
 * @param {Record<string,ReduxProposalData>} proposalList
 */
export const updatePersistentStorage = (proposalList) => {
    const simplifiedStorage = {};
    for (const [pId, p] of Object.entries(proposalList)) {
        simplifiedStorage[pId] = {
            id: p.id,
            password: p.password,
        };
    }

    walletUtil.setListenedProposalList(simplifiedStorage);
}
