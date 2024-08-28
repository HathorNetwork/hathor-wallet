/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import AddressList from '../../components/AddressList';
import { NANO_UPDATE_ADDRESS_LIST_COUNT } from '../../constants';

/**
 * Component that shows a modal to select an address
 * to sign a nano contract tx
 *
 * @param props.onAddressSelect Method to be called when the user clicks an address
 * @param props.onClose GlobalModal method added in all modals
 *
 * @memberof Components
 */
function ModalSelectAddressToSignTx({ onClose, onAddressSelect }) {
  const addressToSignModalID = 'selectAddressToSignTxModal';

  useEffect(() => {
    $(`#${addressToSignModalID}`).modal('show');
    $(`#${addressToSignModalID}`).on('hidden.bs.modal', (e) => {
      // We always need to call on close when using global context modal
      // it will remove event listeners
      onClose();
    })
  }, []);

  /**
   * Called when user selects one address, so we close the modal
   * and fills the address to sign input with the selected address
   *
   * @param {string} address Address clicked
   */
  const onAddressClick = async (address) => {
    onClose();
    onAddressSelect(address);
  }

  const renderAddressList = () => {
    return (
      <div>
        <p>{t`Select the address that will be used to sign the transaction`}</p>
        <AddressList
          showNumberOfTransaction={false}
          onAddressClick={onAddressClick}
          count={NANO_UPDATE_ADDRESS_LIST_COUNT}
          isModal={true}
        />
      </div>
    );
  }

  return (
    <div className="modal fade" id={addressToSignModalID} tabIndex="-1" role="dialog" aria-labelledby={addressToSignModalID} aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">{t`Select address`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {renderAddressList()}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalSelectAddressToSignTx;