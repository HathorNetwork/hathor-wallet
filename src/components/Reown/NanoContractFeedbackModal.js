/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { types } from '../../actions';
import { FeedbackModal } from './FeedbackModal';

export const MODAL_ID = 'nanoContractFeedbackModal';

/**
 * Component that shows a modal with feedback for nano contract transactions
 * Shows loading, success or error message and provides retry option on failure
 */
export function NanoContractFeedbackModal({ isError, isLoading = true, onClose, manageDomLifecycle }) {
  return (
    <FeedbackModal
      modalId={MODAL_ID}
      isError={isError}
      isLoading={isLoading}
      onClose={onClose}
      manageDomLifecycle={manageDomLifecycle}
      titles={{
        loading: t`Processing Transaction`,
        error: t`Transaction Failed`,
        success: t`Transaction Successful`
      }}
      messages={{
        loading: t`Processing nano contract transaction...`,
        error: t`There was an error sending the nano contract transaction. Would you like to try again?`,
        success: t`The nano contract transaction was sent successfully.`
      }}
      retryAction={types.REOWN_NEW_NANOCONTRACT_RETRY}
      retryDismissAction={types.REOWN_NEW_NANOCONTRACT_RETRY_DISMISS}
    />
  );
} 
