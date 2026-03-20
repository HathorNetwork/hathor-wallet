/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import BackButton from "../../components/BackButton";
import { t } from "ttag";
import Loading from "../../components/Loading";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { importProposal, proposalFetchRequested } from "../../actions";
import {
    updatePersistentStorage
} from "../../utils/atomicSwap";
import { PROPOSAL_DOWNLOAD_STATUS } from "../../constants";

export default function ImportExisting(props) {
    // Internal state
    const [isLoading, setIsLoading] = useState(false);
    const [proposalId, setProposalId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Global interactions
    const allProposals = useSelector(state => state.proposals);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const navigateToProposal = (pId) => {
        navigate(`/wallet/atomic_swap/proposal/${pId}`, { replace: true });
    }

    const importClickHandler = () => {
        setIsLoading(true);
        dispatch(importProposal(proposalId, password));
        dispatch(proposalFetchRequested(proposalId, password, true));
    }

    useEffect(() => {
        /*
         * This effect will constantly check if the imported proposal is existent and is ready to be viewed.
         * If this happens, it will navigate to it.
         */

        // If the screen state is not loading, it means the user has still not clicked the "Next" button.
        if (!isLoading) {
            return;
        }

        // If the proposal was not loaded, ignore
        const existingProposal = allProposals[proposalId];
        if (!existingProposal
            || existingProposal.status === PROPOSAL_DOWNLOAD_STATUS.LOADING
            || existingProposal.status === PROPOSAL_DOWNLOAD_STATUS.INVALIDATED
        ) {
            return;
        }

        // Error handling
        if (existingProposal.status === PROPOSAL_DOWNLOAD_STATUS.FAILED) {
            setErrorMessage(existingProposal.errorMessage);
            setIsLoading(false);
            return;
        }

        // The proposal was successfully imported: updating persistent storage and navigating to it
        updatePersistentStorage(allProposals);
        navigateToProposal(proposalId);
    })

    return <div className="content-wrapper flex align-items-center">
        <BackButton />
        <h3 className="mt-4 mb-3">{t`New Atomic Swap Proposal`}</h3>

        <form>
            <div className="form-group col-9">
                <label>{t`Proposal Identifier`}</label>
                <input
                    type="text"
                    name="proposalIdentifierField"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    disabled={isLoading}
                    value={proposalId}
                    onChange={e => setProposalId(e.target.value)}
                    className="form-control"
                    required={true}
                />
                <small id="identifierDataHelp" className="form-text text-muted">
                    The proposal identifier to fetch and listen to updates in realtime.
                </small>
            </div>

            <div className="form-group col-9">
                <label>{t`Proposal Password`}</label>
                <input
                    type="password"
                    name="proposalPasswordField"
                    placeholder="xxxxxx"
                    disabled={isLoading}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-control"
                    required={true}
                />
                <small id="passwordDataHelp" className="form-text text-muted">
                    The proposal password, to decrypt it and allow for editing its contents.
                </small>
            </div>

            <div className="row align-items-center mt-4 pl-3">
                <button
                    type="button"
                    className="btn btn-hathor col-2"
                    disabled={isLoading}
                    onClick={importClickHandler}>
                    {t`Import`}
                </button>
                {isLoading && <Loading className="ml-3 mb-2" delay={10}/>}
            </div>
        </form>

        <div className="mt-3">
            <p className="text-danger mt-3 white-space-pre-wrap">{errorMessage}</p>
        </div>
    </div>
}
