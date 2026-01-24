/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  transactionUtils,
  PartialTx,
  PartialTxInputData,
  PartialTxProposal,
  tokensUtils,
  config as hathorLibConfig,
} from "@hathor/wallet-lib";
import { TOKEN_MINT_MASK, TOKEN_MELT_MASK, NATIVE_TOKEN_UID } from "@hathor/wallet-lib/lib/constants";
import { get } from 'lodash';
import walletUtil from "./wallet";
import { PROPOSAL_DOWNLOAD_STATUS } from "../constants";

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

export const PROPOSAL_SIGNATURE_STATUS = {
    OPEN: 'Open',
    PARTIALLY_SIGNED: 'Partially Signed',
    SIGNED: 'Signed',
    SENT: 'Sent',
}

export const ATOMIC_SWAP_SERVICE_ERRORS = {
    ProposalNotFound: 'PROPOSAL_NOT_FOUND',
    DuplicateProposalId: 'DUPLICATE_PROPOSAL_ID',
    InvalidPassword: 'INVALID_PASSWORD',
    IncorrectPassword: 'INCORRECT_PASSWORD',
    VersionConflict: 'VERSION_CONFLICT',
    UnknownError: 'UNKNOWN_ERROR',
}

/**
 * Generates the serialized string of an empty proposal for the current wallet
 * @param {HathorWallet} wallet Current wallet in use
 * @return {string}
 */
export function generateEmptyProposal(wallet) {
    const partialTx = new PartialTx(wallet.getNetworkObject());
    return partialTx.serialize();
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
export async function enrichTxData(partialTx, wallet, strSignatures) {
    const signaturesObj = strSignatures && calculateSignaturesObject(partialTx, strSignatures);

    for (const inputIndex in partialTx.inputs) {
        const input = partialTx.inputs[inputIndex];
        if (await wallet.isAddressMine(input.address)) {
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
        if (await wallet.isAddressMine(output.address)) {
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
 * @returns {Promise<DisplayBalance[]>}
 */
export async function calculateExhibitionData(partialTx, cachedTokens, wallet) {
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

    const txProposal = PartialTxProposal.fromPartialTx(partialTx.serialize(), wallet.storage);
    const balance = await txProposal.calculateBalance();

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

export async function deserializePartialTx(strPartialTx, wallet) {
    const networkObject = wallet.getNetworkObject();
    const partialTx = PartialTx.deserialize(strPartialTx, networkObject);
    await enrichTxData(partialTx, wallet);

    return partialTx;
}

/**
 * Assemble a transaction from the serialized partial tx and signatures
 * @param {string} partialTx The serialized partial tx
 * @param {string} signatures The serialized signatures
 * @param {IStorage} storage The storage object
 * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/fd1fb5d9757871bdf367e0496cfa85be8175e09d/src/services/atomic-swap.service.js
 */
export const assembleProposal = (partialTx, signatures, storage) => {
    const proposal = PartialTxProposal.fromPartialTx(partialTx, storage);

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
export const translateTxToProposalUtxo = async (txId, index, wallet) => {
  const utxo = { txId, index };
  if (!await transactionUtils.canUseUtxo(utxo, wallet.storage)) {
    // Cannot use this utxo
    return null;
  }

  const tx = await wallet.getTx(txId);
  const txout = tx.outputs[index];
  // We use the storage getAddressInfo because the wallet.getAddressInfo
  // has some unnecessary calculations
  const addressInfo = await wallet.storage.getAddressInfo(txout.decoded.address);
  const addressIndex = addressInfo.bip32AddressIndex;

  const addressPath = addressIndex ? await wallet.getAddressPathForIndex(addressIndex) : '';
  let authorities = 0n;
  if (transactionUtils.isMint(txout)) {
    authorities += TOKEN_MINT_MASK;
  }
  if (transactionUtils.isMelt(txout)) {
    authorities += TOKEN_MELT_MASK;
  }

  let tokenId = txout.token;
  if (!tokenId) {
    // This should never happen since the fullnode always sends the token uid.
    const tokenIndex = tokensUtils.getTokenIndexFromData(txout.token_data);
    tokenId = [NATIVE_TOKEN_UID, ...tx.tokens][tokenIndex];
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

/**
 * Calculates the object that will be stored in Redux, containing all the helper values for a more
 * enriched exhibition on the Atomic Swap screens
 * @param {string} proposalId
 * @param {string} password
 * @param {string} partialTx
 * @param {HathorWallet} wallet
 * @param [options]
 * @param {string} [options.signatures] Optional signatures data for the proposal
 * @param {boolean} [options.newProposal=false] Requests new proposal properties to be added
 * @return {ReduxProposalData}
 */
export const generateReduxObjFromProposal = (proposalId, password, partialTx, wallet, options = {}) => {
    /** @type ReduxProposalData */
    const rObj = {
        id: proposalId,
        password: password,
        status: PROPOSAL_DOWNLOAD_STATUS.INVALIDATED, // We do not know the current state from the calculations
        data: { // Only the minimum information. Any other data already retrieved should be added afterward
            id: proposalId,
            partialTx,
            history: [],
        },
        updatedAt: new Date().valueOf(),
    };
    // Building the object to retrieve data from
    const txProposal = PartialTxProposal.fromPartialTx(partialTx, wallet.storage);

    // Calculating the amount of tokens
    const balance = txProposal.calculateBalance(wallet);
    rObj.data.amountTokens = Object.keys(balance).length;

    // Calculating signature status
    let sigStatus;
    const amountInputs = txProposal.partialTx.getTx().inputs.length;
    const amountSigs = options.signatures
      ? options.signatures.split('|').length - 2 // Removing the prefix and txHex, sigs remain
      : 0;
    if (amountSigs < 1) {
        sigStatus = PROPOSAL_SIGNATURE_STATUS.OPEN;
    } else if (amountSigs < amountInputs) {
        sigStatus = PROPOSAL_SIGNATURE_STATUS.PARTIALLY_SIGNED;
    } else {
        sigStatus = PROPOSAL_SIGNATURE_STATUS.SIGNED;
    }
    rObj.data.signatureStatus = sigStatus;

    // Adding new proposal data, if requested
    if (options.newProposal) {
        rObj.data.version = 0;
        rObj.data.timestamp = rObj.updatedAt;
    }

    return rObj;
}

/**
 * Returns the Atomic Swap Service base URL,
 * @param {string} network Network name for fetching the default base server url
 * @returns {void}
 */
export function initializeSwapServiceBaseUrlForWallet(network) {
    // XXX: This storage item is currently unchangeable via the wallet UI, and is available
    //      only for debugging purposes on networks other than mainnet and testnet
    const configUrl = localStorage.getItem('wallet:atomic_swap_service:base_server')
    // Configures Atomic Swap Service url. Prefers explicit config input, then network-based
    if (configUrl) {
        hathorLibConfig.setSwapServiceBaseUrl(configUrl);
    } else {
        hathorLibConfig.setSwapServiceBaseUrl(
          hathorLibConfig.getSwapServiceBaseUrl(network)
        );
    }
}
