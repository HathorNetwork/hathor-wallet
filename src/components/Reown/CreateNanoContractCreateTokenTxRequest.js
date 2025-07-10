/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import {
  setNewNanoContractStatusReady,
  setNewNanoContractStatusLoading,
  setNewNanoContractStatusSuccess,
  setNewNanoContractStatusFailure,
  setReownFirstAddress
} from '../../actions';
import { BASE_STATUS } from '../../constants';
import CreateTokenRequestData from './CreateTokenRequestData';
import NanoContractRequestData from './NanoContractRequestData';
import { getGlobalWallet } from '../../modules/wallet';
import { DAppInfo } from './DAppInfo';

/**
 * Component for displaying and processing Nano Contract and Token creation requests
 */
export function CreateNanoContractCreateTokenTxRequest({ route }) {
  const { createNanoContractCreateTokenTxRequest, onAccept, onReject } = route.params;
  const dispatch = useDispatch();

  // Get Redux state
  const {
    nanoContractStatus,
    firstAddress,
    retrying
  } = useSelector((state) => ({
    nanoContractStatus: state.reown.nanoContractStatus,
    firstAddress: state.reown.firstAddress,
    retrying: state.reown.retrying
  }));

  // Component state
  const [ncAddress, setNcAddress] = useState(null);
  const [error, setError] = useState(null);

  // Extract nano contract and token data from the request
  const nanoContract = createNanoContractCreateTokenTxRequest?.data?.nanoContract || {};
  const token = createNanoContractCreateTokenTxRequest?.data?.token || {};

  // Get wallet instance
  const wallet = getGlobalWallet();

  // Setup component
  useEffect(() => {
    // Cleanup function to reset state when component unmounts
    return () => {
      dispatch(setNewNanoContractStatusReady());
    };
  }, []);

  // Fetch first address if not available
  useEffect(() => {
    if (!firstAddress) {
      const getFirstAddress = async () => {
        try {
          const address = await wallet.getAddressAtIndex(0);
          dispatch(setReownFirstAddress(address));
        } catch (e) {
          console.error('Error fetching first address:', e);
          setError(t`Could not fetch wallet address.`);
        }
      };

      getFirstAddress();
    }
  }, [firstAddress, wallet, dispatch]);

  // Set the nano contract address when first address is available
  useEffect(() => {
    if (firstAddress && !ncAddress) {
      setNcAddress(firstAddress);
    }
  }, [firstAddress, ncAddress]);

  // Check if transaction is ready to be processed
  const isTxReady = () => nanoContractStatus === BASE_STATUS.READY;
  const isTxProcessing = () => nanoContractStatus === BASE_STATUS.LOADING;
  const isTxSuccessful = () => nanoContractStatus === BASE_STATUS.SUCCESS;
  const isTxFailed = () => nanoContractStatus === BASE_STATUS.ERROR;

  /**
   * Handle acceptance of the request
   */
  const handleAccept = async () => {
    if (!ncAddress) {
      setError(t`Please select an address for the nano contract.`);
      return;
    }

    setError(null);

    // Prepare data for the combined transaction
    const txData = {
      nanoContract: {
        ...nanoContract,
        address: ncAddress
      },
      token
    };

    // Accept the request with the transaction data
    onAccept(txData);
  };

  /**
   * Handle rejection of the request
   */
  const handleReject = () => {
    onReject();
  };

  // Common styles for components
  const commonStyles = {
    card: {
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    cardSplit: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '12px'
    },
    button: {
      backgroundColor: '#0dbf64',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 16px',
      cursor: 'pointer',
      marginRight: '8px'
    },
    secondaryButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 16px',
      cursor: 'pointer'
    },
    errorText: {
      color: '#dc3545',
      marginTop: '8px'
    },
    successText: {
      color: '#0dbf64',
      marginTop: '8px'
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ marginBottom: '16px' }}>{t`Create Nano Contract & Token`}</h2>

      {/* dApp info */}
      <div style={commonStyles.card}>
        <h3 style={commonStyles.sectionTitle}>{t`dApp Information`}</h3>
        <DAppInfo 
          dapp={createNanoContractCreateTokenTxRequest?.dapp} 
          className="" 
        />
      </div>

      {/* Transaction Status */}
      {!isTxReady() && (
        <div style={commonStyles.card}>
          <h3 style={commonStyles.sectionTitle}>{t`Transaction Status`}</h3>
          {isTxProcessing() && (
            <p>{t`Processing your transaction...`}</p>
          )}
          {isTxSuccessful() && (
            <p style={commonStyles.successText}>{t`Transaction completed successfully!`}</p>
          )}
          {isTxFailed() && (
            <p style={commonStyles.errorText}>
              {error || t`Transaction failed. Please try again.`}
              {retrying && <span>{t` Retrying...`}</span>}
            </p>
          )}
        </div>
      )}

      {/* Nano Contract Data */}
      <div style={commonStyles.card}>
        <h3 style={commonStyles.sectionTitle}>{t`Nano Contract Data`}</h3>

        {/* Address selection */}
        {isTxReady() && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Nano Contract Address`}</p>
            <select
              value={ncAddress || ''}
              onChange={(e) => setNcAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da'
              }}
              disabled={!isTxReady()}
            >
              <option value="">{t`Select an address`}</option>
              {firstAddress && (
                <option value={firstAddress}>{firstAddress}</option>
              )}
            </select>
          </div>
        )}

        <NanoContractRequestData data={nanoContract} />
      </div>

      {/* Token Data */}
      <div style={commonStyles.card}>
        <h3 style={commonStyles.sectionTitle}>{t`Create Token Data`}</h3>
        <CreateTokenRequestData data={token} />
      </div>

      {/* Buttons */}
      {isTxReady() && (
        <div style={{ marginTop: '16px', display: 'flex' }}>
          <button
            style={commonStyles.button}
            onClick={handleAccept}
            disabled={!isTxReady() || !ncAddress}
          >
            {t`Accept`}
          </button>
          <button
            style={commonStyles.secondaryButton}
            onClick={handleReject}
            disabled={!isTxReady()}
          >
            {t`Reject`}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && isTxReady() && (
        <p style={commonStyles.errorText}>{error}</p>
      )}
    </div>
  );
} 
