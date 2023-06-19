/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef, useEffect } from "react";
import { t } from "ttag";
import InputNumber from "../InputNumber";
import hathorLib, { Address } from "@hathor/wallet-lib";
import { useSelector } from "react-redux";
import walletUtils from '../../utils/wallet';

export function ModalAtomicReceive ({ sendClickHandler, receivableTokens, manageDomLifecycle, onClose }) {
    /** @type HathorWallet */
    const wallet = useSelector(state => state.wallet);
    const [selectedToken, setSelectedToken] = useState(receivableTokens[0]);
    const [address, setAddress] = useState('');
    let amountRef = useRef();
    const [amount, setAmount] = useState(0);
    const [errMessage, setErrMessage] = useState('');
    const modalDomId = 'atomicReceiveModal';

    const renderTokenOptions = () => {
        return receivableTokens.map((token) => {
            return <option value={token.uid} key={token.uid}>{token.symbol}</option>;
        });
    }

    const changeSelect = (e) => {
        const selected = receivableTokens.find((token) => token.uid === e.target.value);
        setSelectedToken(selected);
    }

    /**
     * Validates form fields and return true if all are valid
     * @returns {Promise<boolean>}
     */
    const validateForm = async () => {
        const addressObj = new Address(address);
        if (!addressObj.isValid()) {
            setErrMessage(t`Invalid address.`)
            return false;
        }

        if (amount === 0 || !amount) {
            setErrMessage(t`Must receive a positive amount of tokens`);
            return false;
        }

        if (!await wallet.isAddressMine(address)) {
            setErrMessage(t`Address does not belong to this wallet`);
            return false;
        }

        return true;
    }

    const handleReceive = async (e) => {
        e.preventDefault();

        // Don't submit an invalid form
        if (!validateForm()) {
            return;
        }

        // On success, clean error message and return user input
        setErrMessage('');
        sendClickHandler({ selectedToken, address, amount: walletUtils.decimalToInteger(amount) });
        onClose(`#${modalDomId}`);
    }

    useEffect(() => {
        manageDomLifecycle(`#${modalDomId}`);
    }, [])

    return <div><div className="modal fade"
             id={modalDomId}
             tabIndex="-1"
             role="dialog"
             aria-labelledby={modalDomId}
             aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{t`Receive Tokens`}</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true"><i className="fa fa-close pointer ml-1"></i></span>
                        </button>
                    </div>
                    <div className="modal-body modal-body-atomic-send">
                        <form className="px-4">
                            <div className="row">
                                <label htmlFor="token" className="col-3 my-auto">{t`Token`}: </label>
                                <select className="col-5 form-control"
                                        name="token"
                                        value={selectedToken.uid}
                                        onChange={changeSelect}>
                                    {renderTokenOptions()}
                                </select>
                            </div>
                            <div className="row mt-2">
                                <label htmlFor="address" className="col-3 my-auto">{t`Address`}: </label>
                                <input type="text"
                                       placeholder={t`Address`}
                                       name="address"
                                       value={address}
                                       onChange={e => setAddress(e.target.value)}
                                       className="form-control output-address col-9"
                                />
                            </div>
                            <div className="row mt-2">
                                <label htmlFor="amount" className="col-3 my-auto">{t`Amount`}: </label>
                                <InputNumber key="value"
                                             name="amount"
                                             ref={amountRef}
                                             defaultValue={hathorLib.numberUtils.prettyValue(amount)}
                                             placeholder={hathorLib.numberUtils.prettyValue(0)}
                                             onValueChange={value => setAmount(value)}
                                             className="form-control output-value col-3"/>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        {errMessage && <div className="mt-3">
                            <p className="text-danger mt-3 white-space-pre-wrap">{errMessage}</p>
                        </div>}
                        <div className="d-flex flex-row">
                            <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`Cancel`}</button>
                            <button onClick={handleReceive} type="button" className="btn btn-hathor">{t`Receive`}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}
