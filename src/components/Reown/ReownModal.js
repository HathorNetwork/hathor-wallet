/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { ConnectModal } from './modals/ConnectModal';
import { SignMessageModal } from './modals/SignMessageModal';
import { SignOracleDataModal } from './modals/SignOracleDataModal';
import { SendNanoContractTxModal } from './modals/SendNanoContractTxModal';
import { SendTransactionModal } from './modals/SendTransactionModal';
import { CreateTokenModal } from './modals/CreateTokenModal';

export const ReownModalTypes = {
  CONNECT: 'CONNECT',
  SIGN_MESSAGE: 'SIGN_MESSAGE',
  SIGN_ORACLE_DATA: 'SIGN_ORACLE_DATA',
  SEND_NANO_CONTRACT_TX: 'SEND_NANO_CONTRACT_TX',
  SEND_TRANSACTION: 'SEND_TRANSACTION',
  CREATE_TOKEN: 'CREATE_TOKEN',
};

export function ReownModal({ manageDomLifecycle, data, type, onAcceptAction, onRejectAction }) {
  const modalDomId = 'reownModal';

  useEffect(() => {
    manageDomLifecycle(`#${modalDomId}`);
  }, []);

  const renderModalContent = () => {
    switch (type) {
      case ReownModalTypes.CONNECT:
        return <ConnectModal data={data} onAccept={onAcceptAction} onReject={onRejectAction} />;

      case ReownModalTypes.SIGN_MESSAGE:
        return <SignMessageModal data={data} onAccept={onAcceptAction} onReject={onRejectAction} />;

      case ReownModalTypes.SIGN_ORACLE_DATA:
        return <SignOracleDataModal data={data} onAccept={onAcceptAction} onReject={onRejectAction} />;

      case ReownModalTypes.SEND_NANO_CONTRACT_TX:
        return (
          <SendNanoContractTxModal 
            data={data}
            onAccept={onAcceptAction} 
            onReject={onRejectAction} 
          />
        );

      case ReownModalTypes.SEND_TRANSACTION:
        return (
          <SendTransactionModal
            data={data}
            firstAddress={firstAddress}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        );

      case ReownModalTypes.CREATE_TOKEN:
        return <CreateTokenModal data={data} onAccept={onAcceptAction} onReject={onRejectAction} />;

      default:
        return null;
    }
  };

  return (
    <div className="modal fade" id={modalDomId} tabIndex="-1" role="dialog" aria-labelledby={modalDomId} aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          {renderModalContent()}
        </div>
      </div>
    </div>
  );
} 
