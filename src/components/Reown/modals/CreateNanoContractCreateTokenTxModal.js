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
import CreateTokenRequestData from '../CreateTokenRequestData';

/**
 * Component for Token Data Card
 */
const TokenDataCard = ({ token }) => (
  <div className="mb-4">
    <h6 className="font-weight-bold mb-3">{t`Create Token Data`}</h6>
    <div className="card">
      <div className="card-body">
        <CreateTokenRequestData data={token} />
      </div>
    </div>
  </div>
);

/**
 * Modal for handling combined nano contract creation and token creation requests from dApps
 * 
 * @param {Object} data Data about the session and nano contract/token to be created
 * @param {Function} onAccept Function to call when the user accepts the request
 * @param {Function} onReject Function to call when the user rejects the request
 */
export function CreateNanoContractCreateTokenTxModal({ data, onAccept, onReject }) {
  const requestData = data?.data || {};
  const nanoContract = requestData.nano || {};
  const token = requestData.token || {};

  // Restructure data for BaseNanoContractModal
  const restructuredData = {
    ...data,
    data: nanoContract
  };

  const statusConfig = {
    setReadyAction: setNewNanoContractStatusReady,
  };

  const renderAdditionalContent = () => (
    <TokenDataCard token={token} />
  );

  // Prepare the final payload with caller information
  const prepareAcceptData = (nanoWithCaller) => {
    return {
      ...requestData,
      nano: nanoWithCaller
    };
  };

  return (
    <BaseNanoContractModal
      data={restructuredData}
      onAccept={onAccept}
      onReject={onReject}
      statusConfig={statusConfig}
      renderAdditionalContent={renderAdditionalContent}
      prepareAcceptData={prepareAcceptData}
      modalTitle={t`CREATE NANO CONTRACT & TOKEN`}
      acceptButtonText={t`Accept Transaction`}
      rejectButtonText={t`Reject`}
      showCallerSection={false}
    />
  );
} 