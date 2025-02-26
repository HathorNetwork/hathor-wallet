/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import $ from 'jquery';
import { t } from 'ttag';
import { useDispatch } from 'react-redux';
import { types } from '../../actions';
import ReactLoading from 'react-loading';
import { colors } from '../../constants';

export const MODAL_ID = 'nanoContractFeedbackModal';

/**
 * Component that shows a modal with feedback for nano contract transactions
 * Shows loading, success or error message and provides retry option on failure
 */
export function NanoContractFeedbackModal({ isError, isLoading = true, onClose, manageDomLifecycle }) {
  const dispatch = useDispatch();

  useEffect(() => {
    manageDomLifecycle(`#${MODAL_ID}`);
  }, []);

  const handleRetry = () => {
    dispatch({ type: types.REOWN_NEW_NANOCONTRACT_RETRY });
    onClose();
  };

  const handleDismiss = () => {
    if (isError) {
      dispatch({ type: types.REOWN_NEW_NANOCONTRACT_RETRY_DISMISS });
    }
    onClose();
  };

  const renderLoading = () => (
    <>
      <div className="modal-body text-center">
        <ReactLoading type="spin" color={colors.purpleHathor} height={32} width={32} className="d-inline-block" />
        <p className="mt-3">{t`Processing nano contract transaction...`}</p>
      </div>
    </>
  );

  const renderError = () => (
    <>
      <div className="modal-body">
        <p>{t`There was an error sending the nano contract transaction. Would you like to try again?`}</p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={handleDismiss}>
          {t`Dismiss`}
        </button>
        <button type="button" className="btn btn-hathor" onClick={handleRetry}>
          {t`Retry`}
        </button>
      </div>
    </>
  );

  const renderSuccess = () => (
    <>
      <div className="modal-body">
        <p>{t`The nano contract transaction was sent successfully.`}</p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-hathor" onClick={handleDismiss}>
          {t`Close`}
        </button>
      </div>
    </>
  );

  const renderContent = () => {
    if (isLoading) {
      return renderLoading();
    }
    
    return isError ? renderError() : renderSuccess();
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
            <h5 className="modal-title">
              {isLoading ? t`Processing Transaction` : (isError ? t`Transaction Failed` : t`Transaction Successful`)}
            </h5>
            {!isLoading && (
              <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={handleDismiss}>
                <span aria-hidden="true">&times;</span>
              </button>
            )}
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 
