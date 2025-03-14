/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useDispatch } from 'react-redux';
import ReactLoading from 'react-loading';
import { colors } from '../../constants';

/**
 * Generic component that shows a modal with feedback for various operations
 * Shows loading, success or error message and provides retry option on failure
 */
export function FeedbackModal({ 
  modalId,
  isError, 
  isLoading = true, 
  onClose, 
  manageDomLifecycle,
  titles = {
    loading: t`Processing`,
    error: t`Operation Failed`,
    success: t`Operation Successful`
  },
  messages = {
    loading: t`Processing operation...`,
    error: t`There was an error. Would you like to try again?`,
    success: t`The operation completed successfully.`
  },
  retryAction,
  retryDismissAction
}) {
  const dispatch = useDispatch();

  useEffect(() => {
    manageDomLifecycle(`#${modalId}`);
  }, [modalId, manageDomLifecycle]);

  const handleRetry = () => {
    if (retryAction) {
      dispatch({ type: retryAction });
    }
    onClose();
  };

  const handleDismiss = () => {
    if (isError && retryDismissAction) {
      dispatch({ type: retryDismissAction });
    }
    onClose();
  };

  const renderLoading = () => (
    <>
      <div className="modal-body text-center">
        <ReactLoading type="spin" color={colors.purpleHathor} height={32} width={32} className="d-inline-block" />
        <p className="mt-3">{messages.loading}</p>
      </div>
    </>
  );

  const renderError = () => (
    <>
      <div className="modal-body">
        <p>{messages.error}</p>
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
        <p>{messages.success}</p>
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
      id={modalId} 
      tabIndex="-1" 
      role="dialog" 
      aria-labelledby={modalId} 
      aria-hidden="true"
      data-backdrop="static"
      data-keyboard="false"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isLoading ? titles.loading : (isError ? titles.error : titles.success)}
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