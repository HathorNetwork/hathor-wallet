/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { types, unregisteredTokensStoreSuccess } from '../../../actions';
import helpers from '../../../utils/helpers';
import { NanoContractActions } from '../NanoContractActions';
import AddressList from '../../AddressList';
import { NANO_UPDATE_ADDRESS_LIST_COUNT } from '../../../constants';
import { constants, nanoUtils, numberUtils, dateUtils, scriptsUtils, bufferUtils, bigIntUtils } from '@hathor/wallet-lib';
import { DAppInfo } from '../DAppInfo';
import { SignedDataDisplay } from '../SignedDataDisplay';

/**
 * Parse script data from hex string
 */
const parseScriptData = (scriptData, network) => {
  try {
    const script = bufferUtils.hexToBuffer(scriptData);
    return scriptsUtils.parseScript(script, network);
  } catch (error) {
    // Avoid throwing exception when we can't parse the script no matter the reason
    return null;
  }
};

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
            {nanoContract.ncId}
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
          {blueprintInfo?.id || ''}
          {blueprintInfo?.id && (
            <button
              className="btn btn-link btn-sm p-0 ml-2"
              onClick={() => navigator.clipboard.writeText(blueprintInfo.id)}
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
const ArgumentsTable = ({ args, decimalPlaces, tokens, network }) => {
  if (!args || !args.length) return null;

  /**
   * Render argument value based on its type
   */
  const renderArgumentValue = (arg) => {
    const { type, parsed: value } = arg;

    // Handle SignedData types with custom component
    if (type && type.startsWith('SignedData')) {
      return <SignedDataDisplay value={value} />;
    }

    // For all other types, render as text with proper styling
    let displayValue = value;

    if (type === 'Amount') {
      displayValue = numberUtils.prettyValue(value, decimalPlaces);
    } else if (type === 'Timestamp') {
      displayValue = dateUtils.parseTimestamp(value);
    } else if (type === 'TxOutputScript') {
      const parsedScript = parseScriptData(value, network);
      if (parsedScript && parsedScript.getType() === 'data') {
        displayValue = `${parsedScript.data} (${value})`;
      } else if (parsedScript) {
        displayValue = `${parsedScript.address.base58} (${value})`;
      }
    } else if (type === 'TokenUid') {
      if (value === constants.NATIVE_TOKEN_UID) {
        displayValue = `${constants.DEFAULT_NATIVE_TOKEN_CONFIG.symbol} (${value})`;
      } else if (tokens && value in tokens) {
        displayValue = `${tokens[value].symbol} (${value})`;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle objects and arrays by converting to JSON string with BigInt support
      displayValue = bigIntUtils.JSONBigInt.stringify(value, null, 2);
    }

    return (
      <span className="text-monospace" style={{ wordBreak: 'break-all' }}>
        {displayValue}
      </span>
    );
  };

  return (
    <div className="mb-4">
      <h6 className="font-weight-bold mb-3">{t`Arguments`}</h6>
      <div className="card">
        <div className="card-body p-0">
          <table className="table table-sm mb-0">
            <tbody>
              {args.map((arg, index) => {
                return (
                  <tr key={index}>
                    <td className="border-top-0 pl-3" style={{ width: '30%' }}>
                      <strong>{arg.name}</strong>
                      <small className="text-muted d-block">{arg.type}</small>
                    </td>
                    <td className="border-top-0">
                      {renderArgumentValue(arg)}
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
  showCallerSection = false
}) {
  const dispatch = useDispatch();
  const nanoContract = data?.data || {};

  // Redux selectors
  const blueprintInfo = useSelector((state) => state.blueprintsData[nanoContract.blueprintId]);
  const nanoContracts = useSelector((state) => state.nanoContracts);
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);
  const firstAddress = useSelector((state) => state.reown.firstAddress);
  const registeredTokens = useSelector((state) => state.tokens);
  const unregisteredTokens = useSelector((state) => state.unregisteredTokens);
  const network = useSelector((state) => state.serverInfo.network);

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
    if (!blueprintInfo) {
      dispatch({
        type: types.BLUEPRINT_FETCH_REQUESTED,
        payload: nanoContract.blueprintId
      });
    }
  }, [blueprintInfo, nanoContract, dispatch]);

  // Collect unregistered tokens from tokenDetails Map
  useEffect(() => {
    let unregisteredTokensMap = {};
    const tokenDetails = data?.data?.tokenDetails;
    if (tokenDetails) {
      unregisteredTokensMap = [...tokenDetails].reduce((acc, [uid, tokenDetail]) => {
        const tokenInfo = tokenDetail.tokenInfo;
        if (tokenInfo && !registeredTokens.find(t => t.uid === uid)) {
          acc[uid] = { ...tokenInfo, uid };
        }
        return acc;
      }, {});
    }

    // Dispatch success action with the unregistered tokens
    if (Object.keys(unregisteredTokensMap).length > 0) {
      dispatch(unregisteredTokensStoreSuccess(unregisteredTokensMap));
    }
  }, [data, registeredTokens, dispatch]);

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
        <DAppInfo dapp={data.dapp} className="d-flex align-items-center mb-4" />

        <p className="font-weight-bold mb-3">{t`Review your transaction from this dApp`}</p>
        <p className="text-muted small mb-4">{t`Stay vigilant and protect your data from potential phishing attempts.`}</p>

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
          args={nanoContract.parsedArgs}
          decimalPlaces={decimalPlaces}
          tokens={registeredTokens.reduce((acc, token) => {
            acc[token.uid] = token;
            return acc;
          }, {})}
          network={network}
        />

        {nanoContract.actions && nanoContract.actions.length > 0 && (
          <div className="mb-4">
            <h6 className="font-weight-bold mb-3">{t`Action List`}</h6>
            <NanoContractActions
              ncActions={nanoContract.actions}
            />
          </div>
        )}

        {renderAdditionalContent && renderAdditionalContent()}

        {nanoContract?.pushTx === false && (
          <p className="text-muted small mt-3 mb-0">
            {t`This transaction will only be built, not pushed to the network.`}
          </p>
        )}
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
