/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag'

import logo from '../assets/images/hathor-logo.png';
import wallet from '../utils/wallet';
import SpanFmt from '../components/SpanFmt';
import InitialImages from '../components/InitialImages';
import HathorAlert from '../components/HathorAlert';
import { str2jsx } from '../utils/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { updateLedgerClosed } from '../actions/index';
import LOCAL_STORE from '../storage';
import { useNavigate } from 'react-router-dom';
import { LEDGER_GUIDE_URL, WEB3AUTH_FEATURE_TOGGLE } from '../constants';
import helpers from '../utils/helpers';

/**
 * Screen used to select between hardware wallet or software wallet
 *
 * @memberof Screens
 */
function WalletType() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const ledgerClosed = useSelector((state) => state.ledgerWasClosed);
  const web3authEnabled = useSelector(
    (state) => state.featureToggles?.[WEB3AUTH_FEATURE_TOGGLE] || false
  );

  useEffect(() => {
    // Update Sentry when user started wallet now
    wallet.updateSentryState();
    return () => {
      // In case the user has not dismissed the alert, we will reset the state.
      dispatch(updateLedgerClosed(false));
    }
  }, []);

  /**
   * Go to software wallet warning screen
   */
  const goToSoftwareWallet = () => {
    LOCAL_STORE.setHardwareWallet(false);
    navigate('/software_warning/');
  }

  /**
   * Go to hardware wallet start screen
   */
  const goToHardwareWallet = () => {
    navigate('/hardware_wallet/');
  }

  /**
   * Go to the Web3Auth login screen (Sign in with social).
   */
  const goToWeb3AuthLogin = () => {
    LOCAL_STORE.setHardwareWallet(false);
    navigate('/web3auth_login/');
  }

  /**
   * Method called to open ledger guide
   *
   * @param {Object} e Event for the click
   */
  const openLedgerGuide = (e) => {
    e.preventDefault();
    const url = new URL(LEDGER_GUIDE_URL);
    helpers.openExternalURL(url.href);
  }

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="inside-div">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
            <div>
              <p className="mt-4 mb-4">{t`Hathor Wallet supports two types of wallet: software and hardware.`}</p>
              <p className="mt-4 mb-4">
                {str2jsx(t`|bold:Hardware wallets| are dedicated external devices that store your private information. We currently support the Ledger hardware wallet and the ledger app must be installed in developer mode for now. For a tutorial about how to use the ledger app with Hathor Wallet check out |fn:this page|.`,
                  {
                    bold: (x, i) => <strong key={i}>{x}</strong>,
                    fn: (x, i) => <a key={i} onClick={openLedgerGuide} href="true">{x}</a>
                  }
                )}
              </p>
              <p className="mt-4 mb-4"><SpanFmt>{t`**Software wallets**, on the other hand, store the information on your computer.`}</SpanFmt></p>
              <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
                <button onClick={goToHardwareWallet} type="button" className="btn btn-hathor mr-3">{t`Hardware wallet`}</button>
                <button onClick={goToSoftwareWallet} type="button" className="btn btn-hathor">{t`Software wallet`}</button>
              </div>
              {web3authEnabled && (
                <div className="d-flex align-items-center flex-column w-100 mt-3">
                  <button onClick={goToWeb3AuthLogin} type="button" className="btn btn-hathor">{t`Sign in with social`}</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <InitialImages />
      </div>
      {ledgerClosed &&
        <HathorAlert
          type='warning'
          extraClasses='hathor-floating-alert show'
          onDismiss={() => { dispatch(updateLedgerClosed(false)) }}
          text={t`Ledger disconnected! Either the app was closed or the connection was lost!`}
        />
      }
    </div>
  )
}

export default WalletType;
