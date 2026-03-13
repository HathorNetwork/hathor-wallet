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

export const MODAL_ID = 'tokenCreationFeedbackModal';

/**
 * Component that shows a modal with feedback for token creation transactions
 * Shows loading, success or error message and provides retry option on failure
 */
export function TokenCreationFeedbackModal({ isError, isLoading = true, onClose, manageDomLifecycle }) {
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
        loading: t`Processing Token Creation`,
        error: t`Token Creation Failed`,
        success: t`Token Creation Successful`
      }}
      messages={{
        loading: t`Processing token creation transaction...`,
        error: t`There was an error creating the token. Would you like to try again?`,
        success: t`The token was created successfully.`
      }}
      retryAction={types.REOWN_CREATE_TOKEN_RETRY}
      retryDismissAction={types.REOWN_CREATE_TOKEN_RETRY_DISMISS}
      errorDetails={errorDetails}
    />
  );
} 
