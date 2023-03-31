/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from "react";
import { t } from "ttag";
import $ from 'jquery';

export function ModalAtomicExternalChange ({ manageDomLifecycle }) {
    const modalDomId = 'atomicExternalChangeModal';

    useEffect(() => {
        manageDomLifecycle(`#${modalDomId}`);
    }, [])

    return <div><div className="modal fade"
                     id={modalDomId}
                     tabIndex="-1"
                     role="dialog"
                     aria-labelledby={modalDomId}
                     onClick={() => $(`#${modalDomId}`).modal('hide')}
                     aria-hidden="true">
        <div className="modal-dialog" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <h5 className="modal-title">{t`This proposal has changed`}</h5>
                    <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true"><i className="fa fa-close pointer ml-1"></i></span>
                    </button>
                </div>
                <p className="p-4">
                    {t`This proposal was updated elsewhere.`}<br/>
                    {t`Click anywhere to refresh its contents.`}
                </p>
                <div className="modal-footer">
                    <div className="d-flex flex-row">
                        <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`OK`}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
}
