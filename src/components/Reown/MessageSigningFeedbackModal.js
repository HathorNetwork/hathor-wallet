/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';
import { types, setReownError } from '../../actions';
import { FeedbackModal } from './FeedbackModal';

export const MODAL_ID = 'messageSigningFeedbackModal';

/**
 * Component that shows a modal with feedback for message signing operations
 * Shows loading, success or error message and provides retry option on failure
 */
export function MessageSigningFeedbackModal({ isError, isLoading = true, onClose, manageDomLifecycle }) {
  const dispatch = useDispatch();
  const errorDetails = useSelector((state) => state.reown.error);

  const handleClose = () => {
    // Clear error state
    dispatch(setReownError(null));
    onClose();
  };

  return (
    <FeedbackModal
      modalId={MODAL_ID}
      isError={isError}
      isLoading={isLoading}
      onClose={handleClose}
      manageDomLifecycle={manageDomLifecycle}
      titles={{
        loading: t`Signing Message`,
        error: t`Message Signing Failed`,
        success: t`Message Signing Successful`
      }}
      messages={{
        loading: t`Signing message...`,
        error: t`There was an error signing the message. Would you like to try again?`,
        success: t`The message was signed successfully.`
      }}
      retryAction={types.REOWN_SIGN_MESSAGE_RETRY}
      retryDismissAction={types.REOWN_SIGN_MESSAGE_RETRY_DISMISS}
      errorDetails={errorDetails}
    />
  );
} 
