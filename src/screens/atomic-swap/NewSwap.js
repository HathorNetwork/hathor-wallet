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
    generateEmptyProposal,
    updatePersistentStorage, PROPOSAL_DOWNLOAD_STATUS
} from "../../utils/atomicSwap";
import { useDispatch, useSelector } from "react-redux";
import { proposalCreateCleanup, proposalCreateRequested } from "../../actions";

/**
 * This screen will interact with two asynchronous processes when generating a new Swap Proposal:
 * - One for generating the proposal identifier: a process done exclusively on the backend
 * - Other for storing the newly generated proposal on the "listened proposals" state map
 */
export default function NewSwap (props) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const wallet = useSelector(state => state.wallet);

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
        dispatch(proposalCreateRequested(newPartialTx, password));
    }

    /**
     * Waiting for the successful creation and data fetch from the service backend
     * Listening to the `proposals` state object
     */
    useEffect(() => {
        // Discard this effect if the creation was not yet requested from the backend
        if (!isLoading) {
            return;
        }

        // Find which proposal is the one recently created
        let newProposalId;
        for (const [proposalId, proposal] of Object.entries(allProposals)) {
            if (proposal.isNew) {
                newProposalId = proposalId;
                break;
            }
        }

        // XXX: This should never happen.
        if (!newProposalId) {
            setErrorMessage(t`Could not generate the proposal. Please try again later.`)
            setIsLoading(false);
            return;
        }

        // Error handling
        const proposalReduxObj = allProposals[newProposalId];
        if (proposalReduxObj.status === PROPOSAL_DOWNLOAD_STATUS.FAILED) {
            setErrorMessage(proposalReduxObj.errorMessage);
            setIsLoading(false);
            return;
        }

        // If the proposal was not completely loaded, keep waiting
        if (proposalReduxObj.status !== PROPOSAL_DOWNLOAD_STATUS.READY) {
            return;
        }

        // Update the persistent storage with the newly imported proposal and navigate to it
        updatePersistentStorage(allProposals);
        dispatch(proposalCreateCleanup(newProposalId));
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
