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
 * Generates an empty proposal for storing on redux
 * @param {string} password
 * @param {HathorWallet} wallet Current wallet in use
 * @return {{id:string, password:string, data:ProposalData}}
 */
export function generateEmptyProposalFromPassword(password, wallet) {
    const partialTx = new PartialTx(wallet.getNetworkObject());
    const pId = v4();

    return {
        id: pId,
        password,
        data: {
            id: pId,
            partialTx: partialTx.serialize(),
            signatures: null,
            amountTokens: 0,
            signatureStatus: PROPOSAL_SIGNATURE_STATUS.OPEN,
            timestamp: undefined,
            history: []
        },
    };
}

/**
 * Decodes all output scripts and identifies which elements are related to this wallet,
 * so that exhibition is made easier.
 *
 * Also highlights the output address by copying its `base58` representation to the root of the `output` property.
 * @param {PartialTx} partialTx
 * @param {HathorWallet} wallet
 * @param {string} [strSignatures] Optional signatures string
 */
export function enrichTxData(partialTx, wallet, strSignatures) {
    const signaturesObj = strSignatures && calculateSignaturesObject(partialTx, strSignatures);

    for (const inputIndex in partialTx.inputs) {
        const input = partialTx.inputs[inputIndex];
        if (wallet.isAddressMine(input.address)) {
            input.isMine = true;
            input.indexOnTx = +inputIndex;
        }
        if (signaturesObj && signaturesObj.data[inputIndex]) {
            input.isSigned = true;
        }
    }
    for (const outputIndex in partialTx.outputs) {
        const output = partialTx.outputs[outputIndex];
        output.parseScript(wallet.getNetworkObject());
        output.address = get(output,'decodedScript.address.base58','Unknown Address');
        if (wallet.isAddressMine(output.address)) {
            output.isMine = true;
            output.indexOnTx = +outputIndex;
        }
    }
}

/**
 * @typedef DisplayBalance
 * @property {string} tokenUid
 * @property {string} symbol
 * @property {number} sending
 * @property {number} receiving
 */

/**
 *
 * @param {PartialTx} partialTx
 * @param {Record<string, {symbol: string, name: string, tokenUid: string}>} cachedTokens
 * @param {HathorWallet} wallet
 * @returns {DisplayBalance[]}
 */
export function calculateExhibitionData(partialTx, cachedTokens, wallet) {
    const getTokenOrCreate = (tokenUid) => {
        const cachedToken = cachedTokens[tokenUid];
        if (!cachedToken) {
            cachedTokens[tokenUid] = {
                tokenUid,
                symbol: '',
                name: '',
                status: PROPOSAL_DOWNLOAD_STATUS.LOADING,
            };
        }

        return cachedTokens[tokenUid];
    }

    const txProposal = PartialTxProposal.fromPartialTx(partialTx.serialize(), wallet.getNetworkObject());
    const balance = txProposal.calculateBalance(wallet);

    // Calculating the difference between them both
    const balanceArr = [];
    Object.entries(balance).forEach(([tokenUid, tkBalance]) => {
        // XXX: Displaying only the unlocked balance to protect users.
        const {unlocked} = tkBalance.balance;
        const total = unlocked;

        const mapElement = getTokenOrCreate(tokenUid);
        if (total > 0) {
            mapElement.receiving = total;
        } else {
            mapElement.sending = -total;
        }

        balanceArr.push(mapElement);
    });

    return balanceArr;
}

/**
 * Generates a PartialTxInputData class instance with all the signatures from the parameter.
 * @param {PartialTx} partialTx PartialTx class instance
 * @param {string} currentSignatures Serialized signatures
 * @returns {PartialTxInputData} Newly created instance with all the signatures
 */
export function calculateSignaturesObject(partialTx, currentSignatures) {
    const inputData = new PartialTxInputData(
        partialTx.getTx().getDataToSign().toString('hex'),
        partialTx.inputs.length
    );
    if (currentSignatures && currentSignatures.length) {
        inputData.addSignatures(currentSignatures);
    }

    return inputData;
}

/**
 *
 * @param {PartialTx} partialTx
 * @param {string} currentSignatures
 * @returns {boolean}
 */
export function canISign(partialTx, currentSignatures) {
    // An incomplete proposal cannot be signed
    if (!partialTx.isComplete()) {
        return false;
    }

    // Does the proposal have any input?
    if (partialTx.inputs.length < 1) {
        return false;
    }

    // If it has, is any of those inputs mine?
    const myInputs = [];
    partialTx.inputs.forEach((input, index) => {
        if (input.isMine) {
            myInputs.push(index);
        }
    });
    if (myInputs.length < 1) {
        return false;
    }

    // I should merge all signatures here
    // Building the full signatures object with validations
    const inputData = calculateSignaturesObject(partialTx, currentSignatures);

    // Check each of my inputs if it has a signature already
    for (const inputIndex of myInputs) {
        if (!inputData.data[inputIndex]) {
            return true; // Any of my inputs that has no signature indicates this proposal can be signed
        }
    }

    // All inputs from this wallet are already signed
    return false;
}

export function deserializePartialTx(strPartialTx, wallet) {
    const networkObject = wallet.getNetworkObject();
    const partialTx = PartialTx.deserialize(strPartialTx, networkObject);
    enrichTxData(partialTx, wallet);

    return partialTx;
}

/**
 * Assemble a transaction from the serialized partial tx and signatures
 * @param {string} partialTx The serialized partial tx
 * @param {string} signatures The serialized signatures
 * @param {Network} network The network object
 * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/fd1fb5d9757871bdf367e0496cfa85be8175e09d/src/services/atomic-swap.service.js
 */
export const assembleProposal = (partialTx, signatures, network) => {
    const proposal = PartialTxProposal.fromPartialTx(partialTx, network);

    const tx = proposal.partialTx.getTx();
    const inputData = new PartialTxInputData(tx.getDataToSign().toString('hex'), tx.inputs.length);
    inputData.addSignatures(signatures);
    proposal.signatures = inputData;

    return proposal;
};

/**
 * @typedef {{
 *   timelock: number|null,
 *   heightlock: null,
 *   address: string,
 *   tokenId: string,
 *   txId: string,
 *   index: number,
 *   locked: boolean,
 *   value: number,
 *   authorities: number,
 *   addressPath: string,
 * }} ProposalCustomUtxo
 */

/**
 * Processes the transaction as it is stored on the wallet history into a version that is receivable by the TxProposal
 * @param {string} txId
 * @param {string} index
 * @param {HathorWallet} wallet
 * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/fd1fb5d9757871bdf367e0496cfa85be8175e09d/src/controllers/wallet/atomic-swap/tx-proposal.controller.js#L56-L97
 * @returns {null | ProposalCustomUtxo}
 */
export const translateTxToProposalUtxo = (txId, index, wallet) => {
    const txData = wallet.getTx(txId);
    if (!txData) {
        // utxo not in history
        return null;
    }
    const txout = txData.outputs[index];
    if (!oldWallet.canUseUnspentTx(txout, txData.height)) {
        // Cannot use this utxo
        return null;
    }

    const addressIndex = wallet.getAddressIndex(txout.decoded.address);
    const addressPath = addressIndex ? wallet.getAddressPathForIndex(addressIndex) : '';
    let authorities = 0;
    if (oldWallet.isMintOutput(txout)) {
        authorities += TOKEN_MINT_MASK;
    }
    if (oldWallet.isMeltOutput(txout)) {
        authorities += TOKEN_MELT_MASK;
    }

    let tokenId = txout.token;
    if (!tokenId) {
        const tokenIndex = oldWallet.getTokenIndex(txout.token_data) - 1;
        tokenId = txout.token_data === 0
            ? HATHOR_TOKEN_CONFIG.uid
            : txData.tx.tokens[tokenIndex].uid;
    }

    return {
        txId: txId,
        index: index,
        value: txout.value,
        address: txout.decoded.address,
        timelock: txout.decoded.timelock,
        tokenId,
        authorities,
        addressPath,
        heightlock: null,
        locked: false,
    };
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

    walletUtil.setListenedProposals(simplifiedStorage);
}
