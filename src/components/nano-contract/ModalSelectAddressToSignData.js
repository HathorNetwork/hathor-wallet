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
import hathorLib from '@hathor/wallet-lib';
import { NANO_UPDATE_ADDRESS_LIST_COUNT } from '../../constants';
import { getGlobalWallet } from '../../modules/wallet';
import PinInput from '../PinInput';

/**
 * Component that shows a modal to select an address
 * to sign a nano contract signed data parameter
 *
 * @param props.onSuccess Method to be called when the sign succeeds
 * @param props.onClose GlobalModal method added in all modals
 *
 * @memberof Components
 */
function ModalSelectAddressToSignData({ onClose, onSuccess }) {
  const wallet = getGlobalWallet();

  const addressToSignModalID = 'selectAddressToSignModal';

  // {number} step The modal has 2 steps: step 0 is the address selection to sign the data,
  //               step1 is the data and PIN input, so we can sign the data and close the modal
  const [step, setStep] = useState(0);
  // {Object} address Selected address to sign the data {'address': string, 'index': number}
  const [address, setAddress] = useState(null);
  // {string} in case there's an error in the sign process
  const [error, setError] = useState('');

  const formSignDataRef = useRef(null);
  const pinRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    $(`#${addressToSignModalID}`).modal('show');
    $(`#${addressToSignModalID}`).on('hidden.bs.modal', (e) => {
      setStep(0);
      // We always need to call on close when using global context modal
      // it will remove event listeners
      onClose();
    })
  }, []);

  /**
   * Called when user selects one address, so we continue to next step
   *
   * @param {string} address Address clicked
   */
  const onAddressClick = async (address) => {
    const addressIndex = await wallet.getAddressIndex(address);
    setAddress({ address, index: addressIndex});
    setStep(1);
  }

  /**
   * Method called when user clicks the button to sign the data
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  const signData = async (e) => {
    e.preventDefault();

    const isValid = formSignDataRef.current.checkValidity();
    if (!isValid) {
      formSignDataRef.current.classList.add('was-validated')
      return;
    }

    const pin = pinRef.current.refs.pin.value;
    // Incorrect PIN, show error message and do nothing else
    if (!await wallet.checkPin(pin)) {
      // TODO move side effects to saga
      setError(t`Invalid PIN`);
      return;
    }

    const data = dataRef.current.value;
    const oracleData = hathorLib.nanoUtils.getOracleBuffer(address.address, wallet.getNetworkObject());
    const nanoSerializer = new hathorLib.NanoContractSerializer();
    const dataSerialized = nanoSerializer.serializeFromType(data, 'str');
    // TODO getOracleInputData method should be able to receive the PIN as optional parameter as well
    wallet.pinCode = pin;
    const inputData = await hathorLib.nanoUtils.getOracleInputData(oracleData, dataSerialized, wallet);
    wallet.pinCode = null;
    const signedData = `${hathorLib.bufferUtils.bufferToHex(inputData)},${data},str`;
    onSuccess(signedData);
    onClose();
  }

  const renderSteps = () => {
    switch (step) {
      case 0:
        return renderAddressList();
      case 1:
        return renderDataInput();
      default:
        return null;
    }
  }

  const renderAddressList = () => {
    return (
      <div>
        <p>{t`Please select the address that will be used to sign the data`}</p>
        <AddressList
          showNumberOfTransaction={false}
          onAddressClick={onAddressClick}
          count={NANO_UPDATE_ADDRESS_LIST_COUNT}
          isModal={true}
        />
      </div>
    );
  }

  const renderDataInput = () => {
    return (
      <div>
        <p><strong>Address selected: </strong>{address.address} (Index {address.index})</p>
        <form ref={formSignDataRef}>
          <div className="form-group">
            <label>{t`Data to sign`}</label>
            <input required ref={dataRef} type="text" className="form-control" />
          </div>
          <div className="form-group">
            <PinInput ref={pinRef} />
          </div>
          <div className="row">
            <div className="col-12 col-sm-10">
                <p className="error-message text-danger">
                  { error }
                </p>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="modal fade" id={addressToSignModalID} tabIndex="-1" role="dialog" aria-labelledby={addressToSignModalID} aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">{t`Sign Data with Address`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {renderSteps()}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
            { step === 1 && <button onClick={signData} type="button" className="btn btn-hathor">{t`Sign Data`}</button> }
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalSelectAddressToSignData;