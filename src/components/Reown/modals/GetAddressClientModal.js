/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { DAppInfo } from '../DAppInfo';
import AddressList from '../../AddressList';
import { NANO_UPDATE_ADDRESS_LIST_COUNT } from '../../../constants';
import { getGlobalWallet } from '../../../modules/wallet';

/**
 * Modal for address selection when dApp requests user to pick an address.
 * Shows an address list and lets the user select one to share.
 */
export function GetAddressClientModal({ data, onAccept, onReject }) {
  const wallet = getGlobalWallet();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  /**
   * Called when user selects an address from the list
   * @param {string} address The selected address
   */
  const onAddressClick = async (address) => {
    const addressIndex = await wallet.getAddressIndex(address);
    setSelectedAddress(address);
    setSelectedIndex(addressIndex);
  };

  /**
   * Called when user confirms the selection
   */
  const handleAccept = () => {
    if (selectedAddress) {
      onAccept({ address: selectedAddress, index: selectedIndex });
    }
  };

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`Select Address`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <DAppInfo dapp={data.dapp} />
        <p>{t`The dApp is requesting you to select an address to share:`}</p>

        {selectedAddress ? (
          <div className="bg-light p-3 rounded mb-3">
            <div className="mb-2">
              <strong>{t`Selected Address:`}</strong>
            </div>
            <div className="text-monospace small text-break">
              {selectedAddress}
            </div>
            {selectedIndex !== null && (
              <div className="small text-muted mt-1">
                {t`Index:`} {selectedIndex}
              </div>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mt-2"
              onClick={() => {
                setSelectedAddress(null);
                setSelectedIndex(null);
              }}
            >
              {t`Change Selection`}
            </button>
          </div>
        ) : (
          <div className="address-list-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <AddressList
              showNumberOfTransaction={false}
              onAddressClick={onAddressClick}
              count={NANO_UPDATE_ADDRESS_LIST_COUNT}
              isModal={true}
            />
          </div>
        )}

        <p className="mt-3 text-muted small">
          {t`By allowing, you grant this dApp permission to see the selected address.`}
        </p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button
          type="button"
          className="btn btn-hathor"
          onClick={handleAccept}
          disabled={!selectedAddress}
        >
          {t`Allow`}
        </button>
      </div>
    </>
  );
}
