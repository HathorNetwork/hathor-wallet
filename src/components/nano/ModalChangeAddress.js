/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import PropTypes from 'prop-types';
import AddressList from '../../components/AddressList';
import { CHANGE_ADDRESS_LIST_COUNT } from '../../constants';
import { connect } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import { editAddressNC } from '../../actions/index';
import { getGlobalWallet } from '../../modules/wallet';

/**
 * Component that shows a modal to change the address of a Nano Contract
 *
 * @memberof Components
 */
function ModalChangeAddress(props) {
  const dispatch = useDispatch();
  const wallet = getGlobalWallet();
  const nanoContracts = useSelector(state => state.nanoContracts);
  const oldAddress = nanoContracts[props.nanoContractID].address;

  // {number} step The modal has 3 steps: 0 is the warning screen, 1 is the address list and 2 is the confirmation
  const [step, setStep] = useState(0);
  // {Object} newAddress New nano contract selected address data {'address': string, 'index': number}
  const [newAddress, setNewAddress] = useState(null);
  // {number} oldAddressIndex the index of the old selected address. Need to be as a state because of the async/await call to the wallet method
  const [oldAddressIndex, setOldAddressIndex] = useState(null);

  useEffect(() => {
    $('#changeAddressModal').on('hidden.bs.modal', (e) => {
      setStep(0);
    })

    async function getAndSetOldAddressIndex() {
      const oldAddressIndex = await wallet.getAddressIndex(oldAddress);
      setOldAddressIndex(oldAddressIndex);
    }

    getAndSetOldAddressIndex();

    return () => {
      // Removing all event listeners
      $('#changeAddressModal').off();
    };

  }, []);

  /**
   * Called when user clicks to continue after reading the warning message in step 0
   *
   * @param {Object} e Event emitted on click
   */
  const goToStep1 = (e) => {
    e.preventDefault();
    setStep(1);
  }

  /**
   * Called when user clicks in one of the addresses in step 1
   *
   * @param {string} address Address clicked
   */
  const onAddressClick = async (address) => {
    const newAddressIndex = await wallet.getAddressIndex(address);
    setNewAddress({ address, index: newAddressIndex});
    setStep(2);
  }

  /**
   * Called when user clicks to change the address in step 2
   *
   * @param {Object} e Event emitted on click
   */
  const executeChange = async (e) => {
    e.preventDefault();
    dispatch(editAddressNC(props.nanoContractID, newAddress.address));
    await wallet.storage.updateNanoContractRegisteredAddress(props.nanoContractID, newAddress.address);
    $('#changeAddressModal').modal('hide');
  }

  const renderSteps = () => {
    switch (step) {
      case 0:
        return renderWarning();
      case 1:
        return renderAddressList();
      case 2:
        return renderConfirmation();
      default:
        return null;
    }
  }

  const renderWarning = () => {
    return (
      <div>
        <p>{t`You can have only one address associated with a nano contract at a time. If you decide to change your address, any action that you execute in this nano contract will be associated with this new address.`}</p>
        <p>{t`It's important that you remember which address you are using to execute the nano contract methods.`}</p>
        <p><strong>{t`Please continue only if you understand your risks and know what you are doing.`}</strong></p>
        <div className="d-flex flex-row justify-content-center">
          <a href="true" onClick={goToStep1}>{t`Continue`}</a>
        </div>
      </div>
    );
  }

  const renderAddressList = () => {
    return (
      <div>
        <p>{t`Please select the new address below`}</p>
        <AddressList showNumberOfTransaction={false} onAddressClick={onAddressClick} count={CHANGE_ADDRESS_LIST_COUNT} />
      </div>
    );
  }

  const renderConfirmation = () => {
    return (
      <div>
        <p>{t`Please confirm the information below`}</p>
        <p><strong>Old address: </strong>{oldAddress} (Index {oldAddressIndex})</p>
        <p><strong>New address: </strong>{newAddress.address} (Index {newAddress.index})</p>
        <div className="d-flex flex-row justify-content-center">
          <a href="true" onClick={executeChange}>{t`Change address`}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="modal fade" id="changeAddressModal" tabIndex="-1" role="dialog" aria-labelledby="changeAddressModal" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">{t`Change address`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {renderSteps()}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * nanoContractID: ID of nano contract to change address
 * onAddressChanged: function executed after address is changed
 */
ModalChangeAddress.propTypes = {
  nanoContractID: PropTypes.string.isRequired,
};

export default ModalChangeAddress;