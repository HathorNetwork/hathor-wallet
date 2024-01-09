/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import BackButton from "../../components/BackButton";
import React, { useEffect, useState } from "react";
import { t } from "ttag";
import Loading from "../../components/Loading";
import {
    generateEmptyProposal,
} from "../../utils/atomicSwap";
import { useDispatch, useSelector } from "react-redux";
import { proposalCreateRequested } from "../../actions";

export default function NewSwap (props) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const wallet = useSelector(state => state.wallet);

    // Global interactions
    const lastFailedRequest = useSelector(state => state.lastFailedRequest);
    const dispatch = useDispatch();

    const [errorMessage, setErrorMessage] = useState('');

    const createClickHandler = () => {
        if (password.length < 3) {
            setErrorMessage(t`Please insert a password more than 3 characters long`);
            return;
        }

        setErrorMessage('');
        setIsLoading(true);
        const newPartialTx = generateEmptyProposal(wallet);
        dispatch(proposalCreateRequested(newPartialTx, password));
    }

    useEffect(() => {
        // Shows the error message if it happens
        if (lastFailedRequest && lastFailedRequest.message) {
            setErrorMessage(lastFailedRequest.message);
            setIsLoading(false);
        }
    }, [lastFailedRequest]);

    return <div className="content-wrapper flex align-items-center">
        <BackButton />
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
