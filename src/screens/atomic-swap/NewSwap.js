/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import BackButton from "../../components/BackButton";
import React, { useEffect, useState } from "react";
import { useHistory } from 'react-router-dom';
import { t } from "ttag";
import Loading from "../../components/Loading";
import {
    generateReduxObjFromProposal,
    generateEmptyProposal,
    PROPOSAL_CREATION_STATUS,
    updatePersistentStorage, PROPOSAL_DOWNLOAD_STATUS
} from "../../utils/atomicSwap";
import { useDispatch, useSelector } from "react-redux";
import { proposalCreateCleanup, proposalCreateRequested } from "../../actions";

export default function NewSwap (props) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const newProposal = useSelector(state => state.newProposal);
    const wallet = useSelector(state => state.wallet);
    const [partialTx, setPartialTx] = useState('');
    const [newProposalId, setNewProposalId] = useState('');

    // Global interactions
    const allProposals = useSelector(state => state.proposals);
    const history = useHistory();
    const dispatch = useDispatch();

    const [errorMessage, setErrorMessage] = useState('');

    const navigateToProposal = (pId) => {
        history.replace(`/wallet/atomic_swap/proposal/${pId}`);
    }

    const createClickHandler = () => {
        if (password.length < 3) {
            setErrorMessage(t`Please insert a password more than 3 characters long`);
            return;
        }

        setIsLoading(true);
        const newPartialTx = generateEmptyProposal(wallet);
        setPartialTx(newPartialTx)
        dispatch(proposalCreateRequested(newPartialTx, password));
    }

    /**
     * Listening to the new proposal's status
     */
    useEffect(() => {
        const creationStatus = newProposal?.status;

        // Error handling
        if (creationStatus === PROPOSAL_CREATION_STATUS.FAILED) {
            setErrorMessage(newProposal.errorMessage)
            setIsLoading(false);
            return;
        }

        // While the proposal is not successfully created, just stay in this screen
        if (creationStatus !== PROPOSAL_CREATION_STATUS.SUCCESS) {
            return;
        }

        // If the proposal was successfully created, calculate its helper values and request temporary data cleanup
        const proposalId = newProposal.proposalId;
        const reduxObj = generateReduxObjFromProposal(
          proposalId,
          password,
          partialTx,
          wallet,
        );
        reduxObj.status = PROPOSAL_DOWNLOAD_STATUS.READY; // We already have all data, no need to fetch again.

        // Adding the new redux object to the listened proposals map
        dispatch(proposalCreateCleanup(reduxObj));
        setNewProposalId(proposalId);
    }, [newProposal])

    /**
     * Listening to the proposals map when the cleanup was requested
     */
    useEffect(() => {
        // Discard this effect if the cleanup was not yet requested, and the proposals map is not being updated
        if (!newProposalId) {
            return;
        }

        // Verify if the new proposal is already on the listened proposals map
        const proposalReduxObj = allProposals[newProposalId];
        if (!proposalReduxObj) {
            return;
        }

        // Update the persistent storage and navigate to the proposal
        updatePersistentStorage(allProposals);
        navigateToProposal(newProposalId);
    }, [allProposals]);

    return <div className="content-wrapper flex align-items-center">
        <BackButton {...props} />
        <h3 className="mt-4 mb-3">{t`New Atomic Swap Proposal`}</h3>

        <form>
            <div className="form-group col-9">
                <label>{t`Proposal Identifier`}</label>
                <input
                    type="text"
                    name="proposalIdentifierField"
                    value="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    disabled={true}
                    className="form-control"
                />
                <small id="identifierDataHelp" className="form-text text-muted">
                    This number is generated automatically on the first upload, and serves as a way to share the proposal you're
                    about to create with its other participants.
                </small>
            </div>

            <div className="form-group col-9">
                <label>{t`Proposal Password`}</label>
                <input
                    type="password"
                    name="proposalPasswordField"
                    placeholder={t`Proposal password`}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-control col-7"
                    required={true}
                />
                <small id="passwordDataHelp" className="form-text text-muted">
                    Please insert a password above, so that this proposal's contents are protected. You will need to share this
                    password with the other participants too.
                </small>
            </div>

            <div className="align-items-center mt-4 pl-3">
                <button
                    type="button"
                    className="btn btn-hathor col-2"
                    disabled={isLoading}
                    onClick={createClickHandler}>
                    {t`Create`}
                </button>
                { isLoading && <Loading className="ml-3 mb-2" delay={10} /> }
            </div>
        </form>

        <div className="mt-3">
            <p className="text-danger mt-3 white-space-pre-wrap">{errorMessage}</p>
        </div>

    </div>
}
