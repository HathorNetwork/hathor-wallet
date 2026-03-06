/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { cleanNanoContractRegisterMetadata, registerNanoContract } from '../../actions/index';
import { getGlobalWallet } from "../../modules/wallet";
import { NANOCONTRACT_REGISTER_STATUS, colors } from '../../constants';
import ReactLoading from 'react-loading';

/**
 * Component that shows a modal to register a Nano Contract
 *
 * @memberof Components
 */
function ModalRegisterNanoContract({ onClose }) {
  const dispatch = useDispatch();
  const wallet = getGlobalWallet();

  const registerNCModalID = 'registerNCModal';

  const [ncId, setNcId] = useState('');
  const ncRegisterMetadata = useSelector(state => state.nanoContractsRegisterMetadata);
  const ncRegisterStatus = get(ncRegisterMetadata, 'status', null);

  const formRegisterNCRef = useRef(null);

  const idRef = useRef(null);

  useEffect(() => {
    $(`#${registerNCModalID}`).modal('show');
    $(`#${registerNCModalID}`).on('hidden.bs.modal', (e) => {
      dispatch(cleanNanoContractRegisterMetadata());
      idRef.current.value = '';
      // We always need to call on close when using global context modal
      onClose(`#${registerNCModalID}`);
    });

    $(`#${registerNCModalID}`).on('shown.bs.modal', (e) => {
      idRef.current.focus();
    });
  }, []);

  useEffect(() => {
    // When registration succeeds, we hide the modal
    if (ncRegisterStatus === NANOCONTRACT_REGISTER_STATUS.SUCCESS) {
      onClose(`#${registerNCModalID}`);
      dispatch(cleanNanoContractRegisterMetadata());
    }
  }, [ncRegisterStatus]);

  /**
   * Method called when user clicks the button to register the NC
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  const handleRegister = async (e) => {
    e.preventDefault();

    const isValid = formRegisterNCRef.current.checkValidity();
    if (!isValid) {
      formRegisterNCRef.current.classList.add('was-validated')
      return;
    }

    // Use address0 as default address for registered nano contracts
    const address0 = await wallet.getAddressAtIndex(0);

    const ncIdValue = idRef.current.value;
    setNcId(ncIdValue);

    dispatch(registerNanoContract(ncIdValue, address0));
  }

  return (
    <div className="modal fade" id={registerNCModalID} tabIndex="-1" role="dialog" aria-labelledby={registerNCModalID} aria-hidden="true">
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
                <input autoFocus required type="text" pattern="[a-fA-F\d]{64}" className="form-control" ref={idRef} placeholder={t`Nano Contract ID`} />
              </div>
              <div className="row">
                <div className="col-12 col-sm-10">
                    <p className="error-message text-danger">
                      {ncRegisterStatus === NANOCONTRACT_REGISTER_STATUS.ERROR && ncRegisterMetadata.error}
                    </p>
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            {ncRegisterStatus === NANOCONTRACT_REGISTER_STATUS.LOADING && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200}/>}
            <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
            <button onClick={handleRegister} type="button" className="btn btn-hathor">{t`Register`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalRegisterNanoContract;
