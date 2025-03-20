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

export const MODAL_ID = 'transactionFeedbackModal';

/**
 * Component that shows a modal with feedback for transactions
 * Shows loading, success or error message and provides retry option on failure
 */
export function TransactionFeedbackModal({ isError, isLoading = true, errorMessage, onClose, manageDomLifecycle }) {
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
        loading: t`Processing transaction...`,
        error: errorMessage || t`There was an error sending the transaction. Would you like to try again?`,
        success: t`The transaction was sent successfully.`
      }}
      retryAction={types.REOWN_SEND_TX_RETRY}
      retryDismissAction={types.REOWN_SEND_TX_RETRY_DISMISS}
    />
  );
} 