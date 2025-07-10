/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { BaseNanoContractModal } from './BaseNanoContractModal';
import { setNewNanoContractStatusReady } from '../../../actions';

/**
 * Modal for handling nano contract transaction requests from dApps
 * 
 * @param {Object} data Data about the session and nano contract to be executed
 * @param {Function} onAccept Function to call when the user accepts the request
 * @param {Function} onReject Function to call when the user rejects the request
 */
export function SendNanoContractTxModal({ data, onAccept, onReject }) {
  // Status configuration for the base component
  const statusConfig = {
    setReadyAction: setNewNanoContractStatusReady,
  };

  // Function to prepare the accept data with the caller address
  const prepareAcceptData = (nanoWithCaller) => nanoWithCaller;

  return (
    <BaseNanoContractModal
      data={data}
      onAccept={onAccept}
      onReject={onReject}
      statusConfig={statusConfig}
      prepareAcceptData={prepareAcceptData}
      modalTitle={t`NEW NANO CONTRACT TRANSACTION`}
      acceptButtonText={t`Accept Transaction`}
      rejectButtonText={t`Reject`}
      showCallerSection={true}
    />
  );
} 
