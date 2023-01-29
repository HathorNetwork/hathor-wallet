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
    generateEmptyProposalFromPassword,
    PROPOSAL_DOWNLOAD_STATUS,
    updatePersistentStorage
} from "../../utils/proposals";
import { useDispatch, useSelector } from "react-redux";
import { proposalGenerateRequested } from "../../actions";

export default function NewSwap (props) {
    const [proposalId, setProposalId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const generatedProposal = useSelector(state => state.generatedProposal);
    const allProposals = useSelector(state => state.proposals);
    const wallet = useSelector(state => state.wallet);
    const history = useHistory();
    const dispatch = useDispatch();

    const [errorMessage, setErrorMessage] = useState('');

    const navigateToProposal = (pId) => {
        history.replace(`/wallet/atomic_swap/proposal/${pId}`);
    }

    const createClickHandler = () => {
        if (password.length < 3) {
            setErrorMessage('Please insert a password more than 3 characters long');
            return;
        }

        setIsLoading(true);
        const { partialTx } = generateEmptyProposalFromPassword(wallet);
        dispatch(proposalGenerateRequested(partialTx.serialize(), password));
    }

    // This effect monitors the generated proposal status on the backend
    useEffect(() => {
        // This effect is only necessary when waiting for the proposal creation
        if (!isLoading) {
            return;
        }

        if (generatedProposal.status === PROPOSAL_DOWNLOAD_STATUS.FAILED) {
            setErrorMessage(generatedProposal.errorMessage);
            setIsLoading(false);
            return;
        }

        if (generatedProposal.status === PROPOSAL_DOWNLOAD_STATUS.READY) {
            setProposalId(generatedProposal.proposalId);
        }

    }, [generatedProposal]);

    // This effect monitors all proposals to check if the generated proposal is ready for editing
    useEffect(() => {
        // This effect is only necessary when the proposalId is known
        if (!proposalId) {
            return;
        }
        const newProposal = allProposals[proposalId];

        // If a failure happened, inform the user
        if (newProposal.status === PROPOSAL_DOWNLOAD_STATUS.FAILED) {
            const redirectionMessage = `${newProposal.errorMessage}\n${t`Please copy the proposal identifier above and navigate back to retry loading the proposal.`}`
            setErrorMessage(redirectionMessage);
            setIsLoading(false);
            return;
        }
        // It the proposal is still not ready, ignore it for now
        if (newProposal.status !== PROPOSAL_DOWNLOAD_STATUS.READY) {
            return;
        }

        // The proposal data is loaded already, navigate to it
        updatePersistentStorage(allProposals);
        navigateToProposal(proposalId);
    }, [allProposals])

    return <div className="content-wrapper flex align-items-center">
        <BackButton {...props} />
        <h3 className="mt-4 mb-3">{t`New Atomic Swap Proposal`}</h3>

        <form>
            <div className="form-group col-9">
                <label>{t`Proposal Identifier`}</label>
                <input
                    type="text"
                    name="proposalIdentifierField"
                    value={proposalId || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
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
                    disabled={isLoading || proposalId}
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
