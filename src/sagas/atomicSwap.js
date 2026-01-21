/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { all, call, fork, put, select, take, takeEvery, } from 'redux-saga/effects';
import { channel } from "redux-saga";
import {
    importProposal,
    lastFailedRequest,
    proposalFetchFailed,
    proposalFetchSuccess,
    proposalUpdated,
    setNavigateTo,
    types
} from "../actions";
import { specificTypeAndPayload } from "./helpers";
import { get } from 'lodash';
import {
    ATOMIC_SWAP_SERVICE_ERRORS,
    generateReduxObjFromProposal,
    updatePersistentStorage,
} from "../utils/atomicSwap";
import { PROPOSAL_DOWNLOAD_STATUS } from "../constants";
import { t } from "ttag";
import { swapService } from '@hathor/wallet-lib'
import { getGlobalWallet } from "../modules/wallet";

const CONCURRENT_FETCH_REQUESTS = 5;

/**
 * This saga will create a channel to queue PROPOSAL_FETCH_REQUESTED actions and
 * consumers that will run in parallel consuming those actions.
 *
 * More information about channels can be read on https://redux-saga.js.org/docs/api/#takechannel
 */
function* fetchProposalDataQueue() {
    const fetchProposalDataChannel = yield call(channel);

    // Fork CONCURRENT_FETCH_REQUESTS threads to download proposal data
    for (let i = 0; i < CONCURRENT_FETCH_REQUESTS; i += 1) {
        yield fork(fetchProposalDataConsumer, fetchProposalDataChannel);
    }

    while (true) {
        const action = yield take(types.PROPOSAL_FETCH_REQUESTED);
        yield put(fetchProposalDataChannel, action);
    }
}

/**
 * This saga will consume the fetchProposalDataChannel for PROPOSAL_FETCH_REQUEST actions
 * and wait until the PROPOSAL_FETCH_SUCCESS action is dispatched with the specific proposalId
 */
function* fetchProposalDataConsumer(fetchProposalDataChannel) {
    while (true) {
        const action = yield take(fetchProposalDataChannel);

        yield fork(fetchProposalData, action);
        // Wait until the success action is dispatched before consuming another action
        yield take(
            specificTypeAndPayload([
                types.PROPOSAL_FETCH_SUCCESS,
                types.PROPOSAL_FETCH_FAILED,
            ], {
                proposalId: action.proposalId,
            }),
        );
    }
}

/**
 * @param {string} action.proposalId
 * @param {string} action.password
 * @param {string} [action.force=false]
 */
function* fetchProposalData(action) {
    const { proposalId, password, force } = action;

    try {
        const proposalData = yield select((state) => get(state.proposals, proposalId));

        // Cache hit, do not request from server
        if (!force && proposalData && proposalData.oldStatus === PROPOSAL_DOWNLOAD_STATUS.READY) {
            // The data is already loaded, we should dispatch success
            yield put(proposalFetchSuccess(proposalId, proposalData.data));
            return;
        }

        // Fetch data from the backend
        const responseData = yield swapService.get(proposalId, password);
        yield put(proposalFetchSuccess(proposalId, responseData));

        // On success, build the proposal object locally and enrich it
        const wallet = getGlobalWallet();
        const newData = generateReduxObjFromProposal(
          proposalId,
          password,
          responseData.partialTx,
          wallet,
        );

        // Adding the newly generated metadata to the proposal
        const enrichedData = { ...responseData, ...newData.data };
        yield put(proposalUpdated(proposalId, enrichedData));
    } catch (e) {
        let errorMessage;
        const backendErrorData = e.response?.data || {};
        switch (backendErrorData.code) {
            case ATOMIC_SWAP_SERVICE_ERRORS.ProposalNotFound:
                errorMessage = t`Proposal not found.`;
                break;
            case ATOMIC_SWAP_SERVICE_ERRORS.IncorrectPassword:
                errorMessage = t`Incorrect password.`;
                break;
            default:
                errorMessage = t`An error occurred while fetching this proposal.`;
        }
        yield put(proposalFetchFailed(proposalId, errorMessage));
    }
}

/**
 * Makes the request to the backend to create a proposal and returns its results via saga events
 * @param {string} action.partialTx
 * @param {string} action.password
 */
function* createProposalOnBackend(action) {
    const { password, partialTx } = action;

    try {
        // Cleaning up the error handling redux object
        yield put(lastFailedRequest(undefined))

        // Request an identifier from the service backend
        const { success, id: proposalId } = yield swapService.create(partialTx, password);

        // Error handling
        if (!success) {
            yield put(lastFailedRequest({
                message: t`An error occurred while creating this proposal.`
            }))
            return;
        }

        // Generate a minimal redux object on the application state
        yield(put(importProposal(proposalId, password)));

        // Enrich the PartialTx with exhibition metadata
        const wallet = getGlobalWallet();
        const newProposalReduxObj = generateReduxObjFromProposal(
          proposalId,
          password,
          partialTx,
          wallet,
          { newProposal: true }
        );

        // Insert generated data into state as a fetch saga results
        yield put(proposalFetchSuccess(proposalId, newProposalReduxObj.data));

        // Update the persistent storage with the new addition
        const allProposals = yield select((state) => state.proposals);
        updatePersistentStorage(allProposals);

        // Navigating to the Edit Swap screen with this proposal
        yield put(setNavigateTo(`/wallet/atomic_swap/proposal/${proposalId}`, true));
    } catch (e) {
        yield put(lastFailedRequest({ message: e.message }));
    }
}



export function* saga() {
    yield all([
        fork(fetchProposalDataQueue),
        takeEvery(types.PROPOSAL_CREATE_REQUESTED, createProposalOnBackend)
    ]);
}
