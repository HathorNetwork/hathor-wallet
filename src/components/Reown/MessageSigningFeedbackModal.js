/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useDispatch } from 'react-redux';
import { types } from '../../actions';
import ReactLoading from 'react-loading';
import { colors } from '../../constants';

export const MODAL_ID = 'messageSigningFeedbackModal';

/**
 * Component that shows a modal with feedback for message signing operations
 * Shows loading, success or error message and provides retry option on failure
 */
export function MessageSigningFeedbackModal({ isError, isLoading = true, onClose, manageDomLifecycle }) {
  const dispatch = useDispatch();

  useEffect(() => {
    manageDomLifecycle(`#${MODAL_ID}`);
  }, []);

  const handleRetry = () => {
    dispatch({ type: types.REOWN_SIGN_MESSAGE_RETRY });
    onClose();
  };

  const handleDismiss = () => {
    if (isError) {
      dispatch({ type: types.REOWN_SIGN_MESSAGE_RETRY_DISMISS });
    }
    onClose();
  };

  const renderLoading = () => (
    <>
      <div className="modal-body text-center">
        <ReactLoading type="spin" color={colors.purpleHathor} height={32} width={32} className="d-inline-block" />
        <p className="mt-3">{t`Signing message...`}</p>
      </div>
    </>
  );

  const renderError = () => (
    <>
      <div className="modal-body">
        <p>{t`There was an error signing the message. Would you like to try again?`}</p>
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
        <p>{t`The message was signed successfully.`}</p>
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
              {isLoading ? t`Signing Message` : (isError ? t`Message Signing Failed` : t`Message Signing Successful`)}
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
