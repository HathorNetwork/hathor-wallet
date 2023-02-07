/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from "react";
import { t } from "ttag";
import hathorLib from "@hathor/wallet-lib";
import PinInput from "../PinInput";

export function ModalAtomicPin ({ confirmClickHandler, manageDomLifecycle, onClose }) {
    const [pin, setPin] = useState('');
    const [errMessage, setErrMessage] = useState('');
    const modalDomId = 'atomicPinModal';
    const pinRef = useRef();

    /**
     * Validates form fields and return true if all are valid
     * @returns {boolean}
     */
    const validateForm = () => {
        if (pin.length !== 6) {
            setErrMessage(t`Invalid PIN`)
            return false;
        }

        if (!hathorLib.wallet.isPinCorrect(pin)) {
            setErrMessage(t`Invalid PIN`);
            return false;
        }

        return true;
    }

    const handleConfirm = async (e) => {
        e.preventDefault();

        // Don't submit an invalid form
        if (!validateForm()) {
            return;
        }

        setErrMessage('');
        confirmClickHandler({ pin });
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
                    <h5 className="modal-title">{t`Write your PIN`}</h5>
                    <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true"><i className="fa fa-close pointer ml-1"></i></span>
                    </button>
                </div>
                <div className="modal-body modal-body-atomic-send">
                    <form
                        onSubmit={handleConfirm}
                        noValidate
                        className={errMessage.length > 0 ? 'was-validated' : ''}
                    >
                        <div className="form-group">
                            <PinInput
                                ref={pinRef}
                                handleChangePin={e => setPin(e.target.value)}
                            />
                        </div>
                        <div className="row">
                            <div className="col-12 col-sm-10">
                                <p className="error-message text-danger">
                                    {errMessage}
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <div className="d-flex flex-row">
                        <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`Cancel`}</button>
                        <button onClick={handleConfirm} type="button" className="btn btn-hathor">{t`Go`}</button>
                    </div>

                </div>
            </div>
        </div>
    </div>
    </div>
}
