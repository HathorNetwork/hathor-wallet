/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import BackButton from "../../components/BackButton";
import { t } from "ttag";
import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from 'react-router-dom';
import Loading from "../../components/Loading";
import { proposalFetchRequested, proposalRemoved } from "../../actions";
import {
    updatePersistentStorage
} from "../../utils/atomicSwap";
import { PROPOSAL_DOWNLOAD_STATUS } from "../../constants";
import walletUtil from "../../utils/wallet";
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';

export default function ProposalList (props) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const modalContext = useContext(GlobalModalContext);

    /** @type {Record<string, ReduxProposalData>} */
    const proposals = useSelector(state => state.proposals)

    const navigateToProposal = (pId) => {
        navigate(`/wallet/atomic_swap/proposal/${pId}`)
    }

    const navigateToNewProposal = () => {
        navigate(`/wallet/atomic_swap/proposal/create`)
    }

    const importExistingProposal = () => {
        navigate(`/wallet/atomic_swap/proposal/import`)
    }

    /**
     * @param {Event} e React synthetic onClick event
     * @param {string} pId Proposal identifier to remove from list
     */
    const removeProposalClickHandler = (e, pId) => {
        e.stopPropagation();
        modalContext.showModal(MODAL_TYPES.CONFIRM, {
            title: 'Remove proposal from list',
            body: 'Do you want to remove this proposal from the list? You will not be informed of its updates anymore.',
            handleYes: () => {
                dispatch(proposalRemoved(pId));

                const newList = { ...proposals };
                delete newList[pId];
                updatePersistentStorage(newList);

                modalContext.hideModal();
            },
        });
    }

    const generateProposalList = () => {

        const elems = [];
        for (const [proposalId, proposal] of Object.entries(proposals)) {
            const pId = proposalId;
            const password = proposal.password;
            const pAmountTokens = proposal.data
              ? proposal.data.amountTokens || 0
              : undefined;
            const pStatus = proposal.data?.signatureStatus;
            const isLoading = proposal.status === PROPOSAL_DOWNLOAD_STATUS.LOADING || proposal.status === PROPOSAL_DOWNLOAD_STATUS.INVALIDATED;
            const isLoaded = proposal.status === PROPOSAL_DOWNLOAD_STATUS.READY;
            const isFailed = proposal.status === PROPOSAL_DOWNLOAD_STATUS.FAILED;

            const rowClass = isFailed ? 'table-warning' : '';


            const handleRowClick = () => {
                // Ignore clicks while the proposal is still loading
                if (isLoading) {
                    return;
                }

                // Retry a failed proposal fetch
                if (isFailed) {
                    dispatch(proposalFetchRequested(pId, password))
                    return;
                }

                // Navigate to a fetched proposal
                navigateToProposal(pId);
            }

            elems.push(<tr
                className={rowClass}
                onClick={handleRowClick}
                role="button"
                key={pId}>
                <td>{pId}</td>
                { isLoading && <td colSpan="2"><Loading className='mt-auto' height={24} width={24} delay={10} /></td> }
                { isFailed && <td colSpan="2">Failed to load proposal. Click to retry.</td> }
                { isLoaded && <td className="text-center">{pAmountTokens}</td> }
                { isLoaded && <td className="text-center">{pStatus}</td> }
                <td className="text-center">
                    <i className="fa fa-remove pointer ml-1" title={t`Remove`}
                        onClick={e => removeProposalClickHandler(e, pId)}></i>
                </td>
            </tr>)
        }

        return elems;
    }

    // Initializing
    useEffect(() => {
        let startingProposalList = proposals;

        // Ensuring the local storage is populated on first load
        if (Object.keys(startingProposalList).length < 1) {
            const localStorage = walletUtil.getListenedProposals();
            startingProposalList = { ...localStorage };
        }

        // Make sure all proposals are loaded
        Object.entries(startingProposalList)
            .forEach(([pId, p]) => dispatch(proposalFetchRequested(pId, p.password)));
    }, []);

    return (
        <div className="content-wrapper flex align-items-center">
            <BackButton />
            <h3 className="mt-4">{t`Manage Atomic Swap`}</h3>
            <div className="mt-4">
                <button
                    type="button"
                    className="btn btn-hathor mr-3"
                    onClick={importExistingProposal}>
                    {t`Import Existing Proposal`}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={navigateToNewProposal}>
                    {t`Create New Proposal`}
                </button>
            </div>

            <h4 className="mt-4">{t`Currently participating in:`}</h4>
            { !Object.keys(proposals).length
                ? <span>No proposals. Start a new one!</span>
                : <table className="table table-hover">
                <thead>
                    <tr>
                        <th scope="col" className="align-middle">Proposal Id</th>
                        <th scope="col" className="align-middle text-center">Tokens<br/>Exchanged</th>
                        <th scope="col" className="align-middle text-center" colSpan="2">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {generateProposalList()}
                </tbody>
            </table> }
        </div>
    );
}
