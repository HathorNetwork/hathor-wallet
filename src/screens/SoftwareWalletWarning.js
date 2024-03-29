/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef } from 'react';
import { t } from 'ttag';

import logo from '../assets/images/hathor-logo.png';
import SoftwareWalletWarningMessage from '../components/SoftwareWalletWarningMessage';
import InitialImages from '../components/InitialImages';
import { useNavigate } from 'react-router-dom';


/**
 * Confirm that want to continue to software wallet
 *
 * @memberof Screens
 */
function SoftwareWalletWarning() {
  /**
   * formValidated {boolean} If checkbox form was validated
   */
  const [formValidated, setFormValidated] = useState(false);

  const navigate = useNavigate();
  const confirmFormRef = useRef(null);

  const create = () => {
    let isValid = confirmFormRef.current.checkValidity();
    if (isValid) {
      navigate('/signin/');
    } else {
      setFormValidated(true);
    }
  }

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="d-flex align-items-center flex-column inside-div">
          <img className="hathor-logo" src={logo} alt="" />
          <div className="d-flex align-items-start flex-column">
            <div>
              <SoftwareWalletWarningMessage />
              <form ref={confirmFormRef} className={`w-100 mb-4 ${formValidated && 'was-validated'}`}>
                <div className="form-check">
                  <input required type="checkbox" className="form-check-input" id="confirmWallet" />
                  <label className="form-check-label" htmlFor="confirmWallet">{t`Ok, I got it! I want to continue using a software wallet.`}</label>
                </div>
              </form>
              <div className="d-flex justify-content-between flex-row w-100">
                <button onClick={() => navigate(-1)} type="button" className="btn btn-secondary">{t`Back`}</button>
                <button onClick={create} type="button" className="btn btn-hathor">{t`Continue`}</button>
              </div>
            </div>
          </div>
        </div>
        <InitialImages />
      </div>
    </div>
  )
}

export default SoftwareWalletWarning;
