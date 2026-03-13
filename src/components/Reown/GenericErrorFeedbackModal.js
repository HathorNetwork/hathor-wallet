/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';
import { setReownError } from '../../actions';
import { AdvancedErrorOptions } from './AdvancedErrorOptions';

export const MODAL_ID = 'genericErrorFeedbackModal';

/**
 * Component that shows a modal with a generic error message for Reown RPC failures
 * Used as fallback when no specific error handler exists for the error type
 */
export function GenericErrorFeedbackModal({ onClose, manageDomLifecycle, errorMessage }) {
  const dispatch = useDispatch();
  const errorDetails = useSelector((state) => state.reown.error);

  useEffect(() => {
    manageDomLifecycle(`#${MODAL_ID}`);
  }, [manageDomLifecycle]);

  const handleClose = () => {
    dispatch(setReownError(null));
    onClose();
  };

  return (
    <div
      className="modal fade"
      id={MODAL_ID}
      tabIndex="-1"
      role="dialog"
      aria-labelledby={MODAL_ID}
      aria-hidden="true"
      data-backdrop="static"
      data-keyboard="false"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t`Request Failed`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleClose}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p>{errorMessage || t`An error occurred while processing the request.`}</p>
            <AdvancedErrorOptions errorDetails={errorDetails} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-hathor" onClick={handleClose}>
              {t`Close`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
