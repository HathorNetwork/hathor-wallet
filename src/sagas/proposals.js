/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { all, call, delay, fork, put, select, take, takeEvery } from 'redux-saga/effects';
import { channel } from "redux-saga";
import {
    proposalFetchFailed, proposalFetchRequested,
    proposalFetchSuccess,
    proposalGenerateFailed,
    types
} from "../actions";
import { specificTypeAndPayload } from "./helpers";
import { get } from 'lodash';
import {
    getRandomInt,
    PROPOSAL_DOWNLOAD_STATUS,
    PROPOSAL_SIGNATURE_STATUS
} from "../utils/proposals";
import { swapService } from '@hathor/wallet-lib';
import { t } from "ttag";

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

        // Mocked responses
        yield delay(getRandomInt(200,2000));

        if (password?.startsWith('404')) {
            yield put(proposalFetchFailed(proposalId, "Proposal not found"));
            return;
        }

        if (password?.startsWith('403')) {
            yield put(proposalFetchFailed(proposalId, "Incorrect password"));
            return;
        }

        const signatureStatusNames = Object.entries(PROPOSAL_SIGNATURE_STATUS).map(e => e[1])
        const mockResponse = {
            id: proposalId,
            partialTx: 'PartialTx|0001000000000000000000000063d184550000000000||',
            signatures: null,
            amountTokens: 0,
            signatureStatus: PROPOSAL_SIGNATURE_STATUS.OPEN,
            timestamp: undefined,
            history: []
        };

        yield put(proposalFetchSuccess(proposalId, mockResponse));
    } catch (e) {
        console.error(`Proposal fetching error`, e);
        yield put(proposalFetchFailed(proposalId, t`An error occurred while fetching this proposal.`));
    }
}

/**
 * @param {string} action.partialTx Serialized partialTx to send to the backend
 * @param {string} action.password Unencrypted password
 * @returns {Generator<*, void, *>}
 */
function* createProposal(action) {
    const { partialTx, password } = action;

    try {
        const newProposal = yield swapService.create(partialTx, password);
        if (!newProposal.success) {
            yield put(proposalGenerateFailed(t`An error occurred while creating this proposal`));
            return;
        }
        const proposalId = newProposal.id;
        yield put(proposalFetchRequested(proposalId, password));
    }
    catch (e) {
        console.error(`Error on create proposal`, e);
        yield put(proposalGenerateFailed(t`An error occurred while creating this proposal`));
    }
}

export function* saga() {
    yield all([
        fork(fetchProposalDataQueue),
        takeEvery(types.PROPOSAL_GENERATE_REQUESTED, createProposal)
    ]);
}
