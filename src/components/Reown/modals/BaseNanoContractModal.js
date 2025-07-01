/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { types, unregisteredTokensDownloadRequested } from '../../../actions';
import helpers from '../../../utils/helpers';
import nanoUtils from '../../../utils/nanoContracts';
import { NanoContractActions } from '../NanoContractActions';
import AddressList from '../../AddressList';
import { NANO_UPDATE_ADDRESS_LIST_COUNT } from '../../../constants';
import { constants } from '@hathor/wallet-lib';

/**
 * Component for Blueprint Information Card
 */
const BlueprintInfoCard = ({ nanoContract, blueprintInfo }) => (
  <div className="card mb-4">
    <div className="card-body">
      {nanoContract.ncId && (
        <div className="mb-3">
          <strong>{t`Nano Contract ID`}</strong>
          <div className="text-monospace">
            {helpers.truncateText(nanoContract.ncId, 8, 4)}
            <button
              className="btn btn-link btn-sm p-0 ml-2"
              onClick={() => navigator.clipboard.writeText(nanoContract.ncId)}
            >
              <i className="fa fa-copy"></i>
            </button>
          </div>
        </div>
      )}

      <div className="mb-3">
        <strong>{t`Blueprint ID`}</strong>
        <div className="text-monospace">
          {nanoContract.blueprintId || 'N/A'}
          {nanoContract.blueprintId && (
            <button
              className="btn btn-link btn-sm p-0 ml-2"
              onClick={() => navigator.clipboard.writeText(nanoContract.blueprintId)}
            >
              <i className="fa fa-copy"></i>
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <strong>{t`Blueprint Name`}</strong>
        <div>{blueprintInfo?.name || '-'}</div>
      </div>

      {nanoContract.method && (
        <div className="mb-3">
          <strong>{t`Blueprint Method`}</strong>
          <div>{nanoContract.method}</div>
        </div>
      )}
    </div>
  </div>
);

/**
 * Component for Arguments Table
 */
const ArgumentsTable = ({ args, methodInfo, decimalPlaces }) => {
  if (!args || !args.length) return null;

  const methodInfoArgs = methodInfo?.args || [];

  return (
    <div className="mb-4">
      <h6 className="font-weight-bold mb-3">{t`Arguments`}</h6>
      <div className="card">
        <div className="card-body p-0">
          <table className="table table-sm mb-0">
            <tbody>
              {args.map((arg, index) => {
                const argName = methodInfoArgs[index]?.name || t`Position ${index}`;
                const argType = methodInfoArgs[index]?.type;
                return (
                  <tr key={index}>
                    <td className="border-top-0 pl-3" style={{ width: '30%' }}>
                      <strong>{argName}</strong>
                      {argType && <small className="text-muted d-block">{argType}</small>}
                    </td>
                    <td className="border-top-0 text-monospace" style={{ wordBreak: 'break-all' }}>
                      {nanoUtils.formatNCArgValue(arg, argType, decimalPlaces)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for Caller Address Section
 */
const CallerAddressSection = ({ selectedAddress, onSelectAddress, nanoContracts, nanoContract, dispatch }) => {
  const nanoContractsRegisterMetadata = useSelector((state) => state.nanoContractsRegisterMetadata);
  const isRegistering = nanoContractsRegisterMetadata?.status === 'loading' && nanoContractsRegisterMetadata?.ncId === nanoContract.ncId;
  const registrationError = nanoContractsRegisterMetadata?.status === 'error' && nanoContractsRegisterMetadata?.ncId === nanoContract.ncId;

  return (
    <div className="mb-3">
      <strong>{t`Caller`}</strong>
      <div className="d-flex align-items-center">
        <div className="text-monospace flex-grow-1">{selectedAddress || '-'}</div>
        <button
          className="btn btn-link btn-sm p-0 ml-2"
          onClick={onSelectAddress}
          title={t`Select Address`}
        >
          <i className="fa fa-pencil" style={{ fontSize: '1.2rem' }}></i>
        </button>
      </div>

      {nanoContract.ncId && !nanoContracts[nanoContract.ncId] && (
        <div className="alert alert-info mt-3 mb-0">
          <i className="fa fa-info-circle mr-2"></i>
          {t`This nano contract is not registered in your wallet. Would you like to register it?`}
          <div className="mt-2">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => dispatch({
                type: types.NANOCONTRACT_REGISTER_REQUEST,
                payload: {
                  ncId: nanoContract.ncId,
                  address: selectedAddress
                }
              })}
              disabled={!selectedAddress || isRegistering}
            >
              {isRegistering ? t`Registering...` : t`Register Nano Contract`}
            </button>
          </div>
          {registrationError && (
            <div className="text-danger mt-2">
              <small>{nanoContractsRegisterMetadata.error}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Component for dApp Info
 */
const DAppInfo = ({ dapp }) => (
  <div className="d-flex align-items-center mb-4">
    {dapp?.icon && (
      <img
        src={dapp.icon}
        alt="dApp icon"
        className="mr-3"
        style={{ width: 48, height: 48 }}
      />
    )}
    <div>
      <h6 className="mb-1">{dapp?.proposer || "Unknown"}</h6>
      <small className="text-muted">{dapp?.url || dapp?.chain || ""}</small>
    </div>
  </div>
);

/**
 * Base component for nano contract modal transactions
 */
export function BaseNanoContractModal({
  data,
  onAccept,
  onReject,
  statusConfig,
  renderAdditionalContent,
  prepareAcceptData,
  modalTitle,
  acceptButtonText = t`Accept Transaction`,
  rejectButtonText = t`Reject`,
  showCallerSection = false,
  showDAppWarning = false
}) {
  const dispatch = useDispatch();
  const nanoContract = data?.data || {};

  // Redux selectors
  const blueprintInfo = useSelector((state) => state.blueprintsData[nanoContract.blueprintId]);
  const nanoContracts = useSelector((state) => state.nanoContracts);
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);
  const firstAddress = useSelector((state) => state.reown.firstAddress);
  const registeredTokens = useSelector((state) => state.tokens);

  // Local state
  const [selectedAddress, setSelectedAddress] = useState(firstAddress);
  const [isSelectingAddress, setIsSelectingAddress] = useState(false);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      if (statusConfig?.setReadyAction) {
        dispatch(statusConfig.setReadyAction());
      }
    };
  }, [dispatch, statusConfig]);

  // Fetch blueprint information
  useEffect(() => {
    if (nanoContract.blueprintId) {
      dispatch({
        type: types.BLUEPRINT_FETCH_REQUESTED,
        payload: nanoContract.blueprintId
      });
    }
  }, [nanoContract.blueprintId, dispatch]);

  // Request token data for unknown tokens in actions
  useEffect(() => {
    const unknownTokensUid = [];
    const actionTokensUid = nanoContract.actions?.map((action) => action.token) || [];

    actionTokensUid.forEach((uid) => {
      if (uid && uid !== constants.NATIVE_TOKEN_UID && !registeredTokens.find(t => t.uid === uid)) {
        unknownTokensUid.push(uid);
      }
    });

    if (unknownTokensUid.length > 0) {
      dispatch(unregisteredTokensDownloadRequested(unknownTokensUid));
    }
  }, [nanoContract.actions, registeredTokens, dispatch]);

  // Create nano contract with caller
  const nanoWithCaller = useMemo(() => ({
    ...nanoContract,
    caller: selectedAddress,
  }), [nanoContract, selectedAddress]);

  // Handle address selection
  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setIsSelectingAddress(false);
  };

  const openAddressSelector = () => {
    setIsSelectingAddress(true);
  };

  const handleAddressSelectionCancel = () => {
    setIsSelectingAddress(false);
  };

  // Handle accept action
  const handleAccept = () => {
    const acceptData = prepareAcceptData
      ? prepareAcceptData(nanoWithCaller)
      : nanoWithCaller;

    onAccept(acceptData);
  };

  // Address selection mode
  if (isSelectingAddress) {
    return (
      <>
        <div className="modal-header">
          <h5 className="modal-title">{t`Select Address`}</h5>
          <button type="button" className="close" onClick={handleAddressSelectionCancel}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <p>{t`Select the address that will be used to sign the transaction`}</p>
          <AddressList
            showNumberOfTransaction={false}
            onAddressClick={handleAddressSelect}
            count={NANO_UPDATE_ADDRESS_LIST_COUNT}
            isModal={true}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleAddressSelectionCancel}>
            {t`Cancel`}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{modalTitle}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <DAppInfo dapp={data.dapp} />

        {showDAppWarning && (
          <>
            <p className="font-weight-bold mb-3">{t`Review your transaction from this dApp`}</p>
            <p className="text-muted small mb-4">{t`Stay vigilant and protect your data from potential phishing attempts.`}</p>
          </>
        )}

        <BlueprintInfoCard nanoContract={nanoContract} blueprintInfo={blueprintInfo} />

        {showCallerSection && (
          <div className="card mb-4">
            <div className="card-body">
              <CallerAddressSection
                selectedAddress={selectedAddress}
                onSelectAddress={openAddressSelector}
                nanoContracts={nanoContracts}
                nanoContract={nanoContract}
                dispatch={dispatch}
              />
            </div>
          </div>
        )}

        <ArgumentsTable
          args={nanoContract.args}
          methodInfo={blueprintInfo?.public_methods?.[nanoContract.method]}
          decimalPlaces={decimalPlaces}
        />

        {nanoContract.actions && nanoContract.actions.length > 0 && (
          <div className="mb-4">
            <h6 className="font-weight-bold mb-3">{t`Action List`}</h6>
            <NanoContractActions
              ncActions={nanoContract.actions}
              tokens={nanoContract.tokens}
              error={nanoContract.tokens?.error}
            />
          </div>
        )}

        {renderAdditionalContent && renderAdditionalContent()}
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReject}
          data-dismiss="modal"
        >
          {rejectButtonText}
        </button>
        <button
          type="button"
          className="btn btn-hathor"
          onClick={handleAccept}
        >
          {acceptButtonText}
        </button>
      </div>
    </>
  );
} 
