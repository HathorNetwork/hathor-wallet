/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { types } from '../../actions';
import { getGlobalWallet } from '../../modules/wallet';
import { ConnectModal } from './modals/ConnectModal';
import { SignMessageModal } from './modals/SignMessageModal';
import { SignOracleDataModal } from './modals/SignOracleDataModal';
import { SendNanoContractTxModal } from './modals/SendNanoContractTxModal';
import { CreateTokenModal } from './modals/CreateTokenModal';

export const ReownModalTypes = {
  CONNECT: 'CONNECT',
  SIGN_MESSAGE: 'SIGN_MESSAGE',
  SIGN_ORACLE_DATA: 'SIGN_ORACLE_DATA',
  SEND_NANO_CONTRACT_TX: 'SEND_NANO_CONTRACT_TX',
  CREATE_TOKEN: 'CREATE_TOKEN',
};

export function ReownModal({ manageDomLifecycle, data, type, onAcceptAction, onRejectAction }) {
  const modalDomId = 'reownModal';
  const dispatch = useDispatch();
  const [firstAddress, setFirstAddress] = useState('');
  const blueprintInfo = useSelector((state) => state.blueprintsData[data?.data?.blueprintId]);

  useEffect(() => {
    manageDomLifecycle(`#${modalDomId}`);
  }, []);

  useEffect(() => {
    if (data?.data?.blueprintId) {
      dispatch({ 
        type: types.BLUEPRINT_FETCH_REQUESTED, 
        payload: data.data.blueprintId
      });
    }
  }, [data?.data?.blueprintId]);

  useEffect(() => {
    const loadFirstAddress = async () => {
      const wallet = getGlobalWallet();
      if (wallet.isReady()) {
        const address = await wallet.getAddressAtIndex(0);
        setFirstAddress(address);
      }
    };
    loadFirstAddress();
  }, []);

  const handleAccept = () => {
    if (type === ReownModalTypes.SEND_NANO_CONTRACT_TX) {
      // Process the nano contract transaction
      // Create a new object with the same properties
      const ncData = {
        blueprintId: data.data.blueprintId,
        method: data.data.method,
        args: data.data.args,
        actions: data.data.actions,
        caller: firstAddress
      };
      onAcceptAction(ncData);
    } else {
      onAcceptAction(data);
    }
  };

  const handleReject = () => {
    onRejectAction();
  };

  const renderModalContent = () => {
    switch (type) {
      case ReownModalTypes.CONNECT:
        return <ConnectModal data={data} onAccept={handleAccept} onReject={handleReject} />;

      case ReownModalTypes.SIGN_MESSAGE:
        return <SignMessageModal data={data} onAccept={handleAccept} onReject={handleReject} />;

      case ReownModalTypes.SIGN_ORACLE_DATA:
        return <SignOracleDataModal data={data} onAccept={handleAccept} onReject={handleReject} />;

      case ReownModalTypes.SEND_NANO_CONTRACT_TX:
        return (
          <SendNanoContractTxModal 
            data={data} 
            firstAddress={firstAddress}
            onAccept={handleAccept} 
            onReject={handleReject} 
          />
        );

      case ReownModalTypes.CREATE_TOKEN:
        return <CreateTokenModal data={data} onAccept={handleAccept} onReject={handleReject} />;

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
