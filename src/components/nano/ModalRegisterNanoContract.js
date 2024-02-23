/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import { useDispatch, useSelector } from 'react-redux';
import { saveNC } from '../../actions/index';
import hathorLib from '@hathor/wallet-lib';

/**
 * Component that shows a modal to register a Nano Contract
 *
 * @memberof Components
 */
function ModalRegisterNanoContract() {
  const { nanoContracts, wallet } = useSelector((state) => {
    return {
      nanoContracts: state.nanoContracts,
      wallet: state.wallet
    }
  });

  const dispatch = useDispatch();

  // errorMessage {string} Message to show when error happens on the form
  const [errorMessage, setErrorMessage] = useState('');

  const formRegisterNCRef = useRef(null);

  const idRef = useRef(null);

  useEffect(() => {
    $('#registerNCModal').on('hide.bs.modal', (e) => {
      idRef.current.value = '';
      setErrorMessage('');
    });

    $('#registerNCModal').on('shown.bs.modal', (e) => {
      idRef.current.focus();
    });

    return () => {
      // Removing all event listeners
      $('#registerNCModal').off();
    };

  }, []);

  /**
   * Method called when user clicks the button to register the NC
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  const handleRegister = async (e) => {
    e.preventDefault();

    setErrorMessage('');
    const isValid = formRegisterNCRef.current.checkValidity();
    if (!isValid) {
      formRegisterNCRef.current.classList.add('was-validated')
      return;
    }

    const nanoId = idRef.current.value;

    // Check if this NC is already registered
    if (nanoId in nanoContracts) {
      setErrorMessage(t`This nano contract is already registered.`);
      return;
    }

    // Check if nano contract exists in the full node
    let nanoTx;
    try {
      nanoTx = await wallet.getFullTxById(nanoId);
      if (nanoTx.tx.version !== hathorLib.constants.NANO_CONTRACTS_VERSION || nanoTx.tx.nc_method !== 'initialize') {
        // Not a nano contract ID
        setErrorMessage(t`This transaction is not a nano contract creation.`);
        return;
      }
    } catch(e) {
      setErrorMessage(t`Invalid nano contract to register.`);
      return;
    }

    // Get blueprint name to store in redux
    const blueprintData = await hathorLib.ncApi.getBlueprintInformation(nanoTx.tx.nc_blueprint_id);

    // Use address0 as default address for registered nano contracts
    const address0 = await wallet.getAddressAtIndex(0);
    dispatch(saveNC(nanoId, blueprintData, address0));
    $('#registerNCModal').modal('hide');
  }

  return (
    <div className="modal fade" id="registerNCModal" tabIndex="-1" role="dialog" aria-labelledby="registerNCModal" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">{t`Register a nano contract`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p>{t`To register your nano contract, just write down the ID of the contract.`}</p>
            <form ref={formRegisterNCRef}>
              <div className="form-group">
                <input autoFocus required type="text" className="form-control" ref={idRef} placeholder={t`Nano Contract ID`} />
              </div>
              <div className="row">
                <div className="col-12 col-sm-10">
                    <p className="error-message text-danger">
                      {errorMessage}
                    </p>
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
            <button onClick={handleRegister} type="button" className="btn btn-hathor">{t`Register`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalRegisterNanoContract;