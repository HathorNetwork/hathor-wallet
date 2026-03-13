/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { ErrorDetailModal } from './ErrorDetailModal';

/**
 * Collapsible component that provides advanced error options
 * including a button to view detailed error information
 */
export function AdvancedErrorOptions({ errorDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Don't render if there are no error details
  if (!errorDetails) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleShowErrorDetails = () => {
    setIsModalVisible(true);
  };

  const handleDismissModal = () => {
    setIsModalVisible(false);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        className="btn btn-link p-0 text-muted"
        onClick={toggleExpanded}
        style={{ textDecoration: 'none' }}
      >
        <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
        {t`Advanced options`}
      </button>

      {isExpanded && (
        <div className="mt-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleShowErrorDetails}
          >
            <i className="fa fa-exclamation-circle mr-2"></i>
            {t`See error details`}
          </button>
        </div>
      )}

      <ErrorDetailModal
        visible={isModalVisible}
        errorDetails={errorDetails}
        onDismiss={handleDismissModal}
      />
    </div>
  );
}
