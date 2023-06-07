/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useDispatch, useSelector } from "react-redux";
import BackButton from "../../components/BackButton";
import { t } from "ttag";
import React, { useContext, useEffect, useRef, useState } from "react";
import HathorAlert from "../../components/HathorAlert";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
    assembleProposal,
    calculateExhibitionData,
    calculateSignaturesObject,
    canISign,
    deserializePartialTx,
    enrichTxData
} from "../../utils/atomicSwap";
import { ProposalBalanceTable } from "../../components/atomic-swap/ProposalBalanceTable";
import helpers from "../../utils/helpers";
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';
import { PartialTxProposal, PartialTx } from "@hathor/wallet-lib";
import { cloneDeep, get } from 'lodash';
import { TOKEN_DOWNLOAD_STATUS } from "../../sagas/tokens";
import Loading from "../../components/Loading";
import { proposalTokenFetchRequested } from "../../actions";

/**
 * @param {string} props.match.params.proposalId Proposal identifier
 * @constructor
 */
export default function EditSwap(props) {
    //-------------------------------------------------------
    // Initialization, local state and redux state
    //-------------------------------------------------------
    const proposalId = props.match.params.proposalId;

    /** @type ReduxProposalData */
    const proposal = useSelector(state => state.proposals[proposalId]);
    /** @type HathorWallet */
    const wallet = useSelector(state => state.wallet);
    /** @type {Record<string, {status:string, data: {available:number, locked:number}}>} */
    const externalTokenBalances = useSelector(state => state.tokensBalance);
    /** @type {Record<string, { uid: string, symbol: string, name: string }>} */
    const registeredTokens = useSelector(state => state.tokens);
    const tokensCache = useSelector(state => state.tokensCache);
    const [hidePassword, setHidePassword] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const clipboardModalRef = useRef();
    const modalContext = useContext(GlobalModalContext);
    const [hasTxChange, setHasTxChange] = useState(false);
    const [hasSigChange, setHasSigChange] = useState(false);
    const [hasWalletInteraction, setHasWalletInteraction] = useState(false);

    /*
     * The proposal editing will happen entirely on a local state, without interfering on the global
     * state. Only when explicitly saving will this persistence happen.
     */
    const [partialTx, setPartialTx] = useState(new PartialTx(wallet.getNetworkObject()));
    const [txBalances, setTxBalances] = useState([]);
    const [signaturesObj, setSignaturesObj] = useState(null);
    const [hasAtLeastOneSig, setHasAtLeastOneSig] = useState(false);
    const dispatch = useDispatch();

    const discardSignaturesAlertMessage = t`All existing signatures will be discarded.`;

    //-------------------------------------------------------
    // Rendering
    //-------------------------------------------------------

    // Renders the header with the "proposalId" and "password" fields that can be copied to clipboard
    const renderCopiableHeader = () => {
        const showClipboardModal = () => {
            clipboardModalRef.current.show(2000);
        };

        return <table className="table table-borderless col-9">
            <tbody>
            <tr>
                <td className="text-nowrap"><b>Proposal Id:</b></td>
                <td className="text-wrap">
                    <CopyToClipboard
                        text={proposalId}
                        onCopy={showClipboardModal}>
                          <span>
                              {proposalId}
                              <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i>
                          </span>
                    </CopyToClipboard>
                </td>
            </tr>
            <tr>
                <td><b>Password:</b></td>
                <td>{hidePassword
                    ? "••••••••••••"
                    : <CopyToClipboard
                        text={proposal.password}
                        onCopy={showClipboardModal}>
                          <span>
                              {proposal.password}
                              <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i>
                          </span>
                    </CopyToClipboard>}
                    <span onClick={() => setHidePassword(!hidePassword)}>
                {hidePassword
                    ? <i className="fa fa-eye pointer ml-1" title={t`Show password`}></i>
                    : <i className="fa fa-eye-slash pointer ml-1" title={t`Hide password`}></i>}
                    </span>
                </td>
            </tr>
            </tbody>
        </table>
    }

    // Will render all the inputs and outputs for all the tokens involved in this proposal
    const renderAllTokenInputsAndOutputs = () => {
        const renderInputs = (inputs) => {
            return inputs.map((input) => {
                return <tr key={`${input.hash}-${input.index}`}>
                    <td>
                        {input.hash}
                        {input.isSigned && <i
                            className="fa fa-check-circle-o ml-1"
                            title={t`This input is signed`}></i>}
                    </td>
                    <td className="text-right">
                        {helpers.renderValue(input.value, false)}
                    </td>
                    <td className="text-right">
                        {input.index}
                    </td>
                    <td className="text-center">
                        {input.isMine && <i
                            className="fa fa-check ml-1"
                            title={t`This input belongs to this wallet`}></i>
                        }
                    </td>
                </tr>
            })
        }

        const renderOutputs = (outputs) => {
            return outputs.map((output,index) => {
                return <tr key={`${output.address}-${index}`}>
                    <td>{output.address}</td>
                    <td className="text-right">{helpers.renderValue(output.value, false)}</td>
                    <td className="text-center">
                        {output.isMine && output.isChange && <i
                            className="fa fa-check ml-1"
                            title={t`This output is for a change on this wallet`}></i>}
                    </td>
                    <td className="text-center">
                        {output.isMine && <i
                            className="fa fa-check ml-1"
                            title={t`This output belongs to this wallet`}></i>}
                    </td>
                </tr>
            })
        }

        const txTokensBalance = partialTx.calculateTokenBalance();
        if (Object.keys(txTokensBalance).length < 1) {
            return <div className="mt-3">
                <h5>{t`No tokens exchanged on this proposal`}</h5>
            </div>
        }

        const tokenDomGroup = [];
        for (const tokenUid of Object.keys(txTokensBalance)) {
            const tokenInputs = partialTx.inputs.filter(i => i.token === tokenUid);
            const tokenOutputs = partialTx.outputs.filter(o => o.token === tokenUid);
            const tokenData = get(tokensCache, tokenUid, {
                status: TOKEN_DOWNLOAD_STATUS.LOADING,
                tokenUid,
                symbol: '',
                name: '',
            });

            tokenDomGroup.push(<div className="mt-5" key={`${tokenUid}_group`}>
                <h5><b>{t`Token`}:</b> {
                    tokenData.status !== TOKEN_DOWNLOAD_STATUS.READY
                        ? <Loading className='d-inline-block' height={24} width={24} delay={10} />
                        : tokenData.symbol}
                </h5>
                { tokenUid !== '00' && <small id="identifierDataHelp" className="form-text text-muted">
                    Token UID: {tokenUid} {tokenData.status === TOKEN_DOWNLOAD_STATUS.READY && `- ${tokensCache[tokenUid].name}`}
                </small>}

                <div className="mt-2">
                    <b>Inputs</b>
                    <table className="table table-sm mw-100">
                        <thead><tr>
                            <td>Transaction Id</td>
                            <td className="text-right">Value</td>
                            <td className="text-right">Index</td>
                            <td className="text-center">Is mine?</td>
                        </tr></thead>
                        <tbody>
                            {tokenInputs.length
                                ? renderInputs(tokenInputs)
                                : <tr><td colSpan="4">{t`No Inputs`}</td></tr>
                            }
                        </tbody>
                    </table>

                    <b>Outputs</b>
                    <table className="table table-sm mw-100">
                        <thead>
                        <tr>
                            <td>Address</td>
                            <td className="text-right">Value</td>
                            <td className="text-center">Is change?</td>
                            <td className="text-center">Is mine?</td>
                        </tr>
                        </thead>
                        <tbody>
                            {tokenOutputs.length
                                ? renderOutputs(tokenOutputs)
                                : <tr><td colSpan="4">{t`No Outputs`}</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>)
        }

        return tokenDomGroup;
    }

    const [showSignButton, setShowSignButton] = useState(false);
    const [showSendTxButton, setShowSendTxButton] = useState(false);

    //-------------------------------------------------------
    // Handlers
    //-------------------------------------------------------

    /**
     *
     * @param {{uid:string, symbol:string}} selectedToken
     * @param {string} changeAddress
     * @param {number} amount
     * @param {Utxo[]} utxos
     */
    const sendOperationHandler = async ({ selectedToken, changeAddress, amount, utxos }) => {
        const txProposal = PartialTxProposal.fromPartialTx(partialTx.serialize(), wallet.storage);

        // Tokens added here will not be marked as selected, only when saved/updated
        await txProposal.addSend(selectedToken.uid, amount, {
            utxos,
            changeAddress: changeAddress,
            markAsSelected: false
        });


        await enrichTxData(txProposal.partialTx, wallet);
        setPartialTx(txProposal.partialTx);
        setSignaturesObj(null);
        setHasTxChange(true);
        setHasSigChange(true);
        setTxBalances(calculateExhibitionData(txProposal.partialTx, tokensCache, wallet));
    }

    /**
     *
     * @param {{uid:string, symbol:string}} selectedToken
     * @param {string} address
     * @param {number} amount
     */
    const receiveOperationHandler = async ({ selectedToken, address, amount }) => {
        const txProposal = PartialTxProposal.fromPartialTx(partialTx.serialize(), wallet.storage);
        await txProposal.addReceive(selectedToken.uid, amount, { address });
        await enrichTxData(txProposal.partialTx, wallet);
        setPartialTx(txProposal.partialTx);
        setSignaturesObj(null);
        setHasTxChange(true);
        setHasSigChange(true);
        setTxBalances(calculateExhibitionData(txProposal.partialTx, tokensCache, wallet));
    }

    const handleSendClick = () => {
        function calculateTokenBalances(external) {
            let sendableTokens = [...registeredTokens];
            const tokenBalances = cloneDeep(external);
            txBalances.forEach(singleBalance => {
                if (singleBalance.sending > 0) {
                    /*
                     * This wallet is already sending this token.
                     * If the user asks to send it again, the remaining funds could be available
                     * only from a single utxo and cause an error.
                     * Better to disable this token from being sent and force the user to remove
                     * an existing input and output to re-send it again.
                     */
                    delete tokenBalances[singleBalance.tokenUid];

                    // TODO: Optimize this token removal feature
                    sendableTokens = sendableTokens.filter(t => t.uid !== singleBalance.tokenUid);
                }
            })
            return { tokenBalances, sendableTokens };
        }

        const confirmHandler = () => {
            const { tokenBalances, sendableTokens } = calculateTokenBalances(externalTokenBalances);
            modalContext.showModal(MODAL_TYPES.ATOMIC_SEND, {
                sendClickHandler: sendOperationHandler,
                sendableTokens,
                tokenBalances: tokenBalances,
                wallet,
            });
        }

        if (hasAtLeastOneSig) {
            modalContext.showModal(MODAL_TYPES.CONFIRM, {
                title: 'Discard existing signatures',
                body: discardSignaturesAlertMessage,
                handleYes: confirmHandler
            });
        } else {
            confirmHandler();
        }
    }

    const handleReceiveClick = () => {
        const confirmHandler = () => {
            modalContext.showModal(MODAL_TYPES.ATOMIC_RECEIVE, {
                sendClickHandler: receiveOperationHandler,
                receivableTokens: registeredTokens,
            });
        }

        if (hasAtLeastOneSig) {
            modalContext.showModal(MODAL_TYPES.CONFIRM, {
                title: 'Discard existing signatures',
                body: discardSignaturesAlertMessage,
                handleYes: confirmHandler
            });
        } else {
            confirmHandler();
        }
    }

    const signOperationHandler = async ({ pin }) => {
        const newProposal = PartialTxProposal.fromPartialTx(
            partialTx.serialize(),
            wallet.storage
        );
        await newProposal.signData(pin);
        const mySignatures = newProposal.signatures.serialize();

        let newSignaturesObj;
        if (signaturesObj) {
            newSignaturesObj = calculateSignaturesObject(newProposal.partialTx, signaturesObj.serialize());
            newSignaturesObj.addSignatures(mySignatures);
        } else {
            newSignaturesObj = calculateSignaturesObject(newProposal.partialTx, mySignatures);
        }
        setSignaturesObj(newSignaturesObj);
        setHasSigChange(true);

        // Updating the signed inputs on the partialTx metadata
        await enrichTxData(newProposal.partialTx, wallet, newSignaturesObj.serialize());
        setPartialTx(newProposal.partialTx);
    }

    const handleSignButton = () => {
        modalContext.showModal(MODAL_TYPES.PIN, {
            onSuccess: signOperationHandler,
        });
    }

    const handleSaveClick = async () => {
        // Save to local redux
        if (hasTxChange) {
            // Update the selection mark on all old inputs
            const oldPartialTx = deserializePartialTx(proposal.data.partialTx, wallet);
            oldPartialTx.inputs.forEach(old => {
                const updatedInput = partialTx.inputs.find(updated => updated.hash === old.hash);

                if (!updatedInput) {
                    // This input was removed: unmark it
                    await wallet.markUtxoSelected(old.hash, old.index, false);
                }
            })

            // Mark all the current inputs as selected
            partialTx.inputs.forEach(i => {
                if (i.isMine) {
                    await wallet.markUtxoSelected(i.hash, i.index, true);
                }
            })

            // Update the global redux state
            proposal.data.partialTx = partialTx.serialize();

            // Reset the local change flag
            setHasTxChange(false);
        }

        if (hasSigChange) {
            proposal.data.signatures = signaturesObj && signaturesObj.serialize();
            setHasSigChange(false);
        }

        // TODO: Call upload saga
    }

    const handleShowDetails = (e) => {
        e.preventDefault();
        setShowDetails(!showDetails);
    }

    const handleRemoveInteractions = () => {
        let confirmationMessage = 'Do you want to remove from this proposal all inputs and outputs that belong to this wallet?';
        if (hasAtLeastOneSig) {
            confirmationMessage += ` ${discardSignaturesAlertMessage}`;
        }

        modalContext.showModal(MODAL_TYPES.CONFIRM, {
            title: 'Remove all my inputs and outputs',
            body: confirmationMessage,
            handleYes: async () => {
                // Unlocking the utxo for this wallet session
                for (const inputToRemove of partialTx.inputs.filter((input) => input.isMine)) {
                  await wallet.markUtxoSelected(inputToRemove.hash, inputToRemove.index, false)
                }

                // Removing the inputs from the local state
                partialTx.inputs = partialTx.inputs.filter(input => {
                    return !input.isMine;// If isMine, return false to remove it from the filter
                });

                // Removing the outputs from the local state
                partialTx.outputs = partialTx.outputs.filter(output => {
                    return !output.isMine;
                });

                // Generate a new partialTx and store it
                const newPartialTx = PartialTx.deserialize(partialTx.serialize(), wallet.getNetworkObject());
                setTxBalances(calculateExhibitionData(newPartialTx, tokensCache, wallet));
                await enrichTxData(newPartialTx, wallet);
                setPartialTx(newPartialTx);
                setSignaturesObj(null);
                setHasSigChange(true);
                setHasTxChange(true);

                modalContext.hideModal();
            },
        });
    }

    //-------------------------------------------------------
    // Effects
    //-------------------------------------------------------

    useEffect(() => {
      deserializePartialTx(proposal.data.partialTx, wallet).then(enrichedPartialTx => {
        setPartialTx(enrichedPartialTx);
        setTxBalances(calculateExhibitionData(enrichedPartialTx, tokensCache, wallet));
        setSignaturesObj(proposal.data.signatures && proposal.data.signatures.length
          ? calculateSignaturesObject(enrichedPartialTx, proposal.data.signatures)
          : null);
      });
    }, []);

    // Re-fetching all the tokens involved in every proposal change and calculating ability to sign
    useEffect(() => {
        // Getting token uids with an existing method
        const balance = partialTx.calculateTokenBalance();

        // Requesting the symbol and name for each of them
        Object.entries(balance).map(([tokenUid]) => dispatch(proposalTokenFetchRequested(tokenUid)))

        // If there is any balance, it means we have at least one input/output for this wallet
        setHasWalletInteraction(txBalances.length > 0);

        // Finding out if there is at least one signed input on the proposal
        setHasAtLeastOneSig(
            signaturesObj
            && signaturesObj.data
            && Object.keys(signaturesObj.data).length > 0);

        // Deciding to show the "Sign" button
        // TODO: Decide if this can decision be calculated solely by the enriched partialTx
        const canISign1 = canISign(partialTx, signaturesObj && signaturesObj.serialize());
        setShowSignButton(canISign1);

        // Deciding to show the "Send Proposal" button
        if (!canISign1 && signaturesObj && partialTx.isComplete()) {
            // If the tx is complete, has at least one signature AND the user can't sign
            // it means only the other participants' signatures need checking
            const fullProposalObj = assembleProposal(
                partialTx.serialize(),
                signaturesObj.serialize(),
                wallet.storage
            );
            setShowSendTxButton(fullProposalObj.isComplete());
        }
    }, [partialTx]);

    // Enriching local exhibition data with updated token symbol and name
    useEffect(() => {
        setTxBalances(calculateExhibitionData(partialTx, tokensCache, wallet));
    }, [tokensCache])

    // Main screen render
    return <div className="content-wrapper flex align-items-center">
        <BackButton {...props} />
        <h3 className="mt-4 mb-3">{t`Editing Atomic Swap Proposal`}</h3>

        {renderCopiableHeader()}

        <h4 className="col-3 text-center">{t`Summary`}</h4>
        <ProposalBalanceTable partialTx={partialTx} wallet={wallet} balance={txBalances} />

        <hr/>

        <div className="row mt-4 mb-4 ml-1">
            {(hasTxChange || hasSigChange) &&
                <button type="button"
                    onClick={handleSaveClick}
                    className="btn btn-secondary col-2 mr-3">
                {t`Save and Upload`}
            </button>}
            <button type="button"
                    onClick={handleSendClick}
                    className="btn btn-secondary col-2 mr-3">
                {t`Send`}
            </button>
            <button type="button"
                    onClick={handleReceiveClick}
                    className="btn btn-secondary col-2 mr-3">
                {t`Receive`}
            </button>
            { hasWalletInteraction && <button type="button"
                     onClick={handleRemoveInteractions}
                     className="btn btn-secondary col-2 mr-3">
                {t`Remove all my inputs and outputs`}
            </button>}
            { showSignButton &&
            <button type="button"
                    onClick={handleSignButton}
                    className="btn btn-hathor col-2">
                {t`Sign my Inputs`}
            </button> }
            { showSendTxButton &&
            <button type="button"
                    className="btn btn-hathor col-2">
                {t`Send Transaction`}
            </button> }
        </div>
        { showDetails
            ? <a href='' onClick={handleShowDetails}>Hide details</a>
            : <a href='' onClick={handleShowDetails}>Show details</a>
        }

        { showDetails && <div>
        <hr/>

        <h4>{t`Proposal Details`}</h4>

        {renderAllTokenInputsAndOutputs()}
        </div>}

        <hr className="mt-5"/>

        <h4><i>Debug data:</i></h4>
        <a href="#" onClick={() => {
            modalContext.showModal(MODAL_TYPES.ATOMIC_EXTERNAL_CHANGE, {
            });
        }}>SHOW EXTERNAL CHANGE MODAL</a>

        <p>PartialTx</p>
        <pre>{partialTx.serialize()}</pre>
        <p>Signatures</p>
        <pre>{signaturesObj && signaturesObj.serialize()}</pre>

        <HathorAlert ref={clipboardModalRef} text={t`Copied to clipboard!`} type="success"/>
    </div>
}
