/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import logo from '../assets/images/hathor-logo.png';
import wallet from '../utils/wallet';
import { HATHOR_WEBSITE_URL } from '../constants';
import SpanFmt from '../components/SpanFmt';
import InitialImages from '../components/InitialImages';
import HathorAlert from '../components/HathorAlert';
import { str2jsx } from '../utils/i18n';
import { connect } from "react-redux";
import { updateLedgerClosed } from '../actions/index';
import LOCAL_STORE from '../storage';

const mapStateToProps = (state) => {
  return {
    ledgerClosed: state.ledgerWasClosed,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    updateLedgerClosed: data => dispatch(updateLedgerClosed(data)),
  };
};

/**
 * Screen used to select between hardware wallet or software wallet
 *
 * @memberof Screens
 */
class WalletType extends React.Component {
  componentDidMount() {
    // Update Sentry when user started wallet now
    wallet.updateSentryState();
  }

  componentWillUnmount() {
    // In case the user has not dismissed the alert, we will reset the state.
    this.props.updateLedgerClosed(false);
  }

  /**
   * Go to software wallet warning screen
   */
  goToSoftwareWallet = () => {
    LOCAL_STORE.setHardwareWallet(false);
    this.props.history.push('/software_warning/');
  }

  /**
   * Go to hardware wallet start screen
   */
  goToHardwareWallet = () => {
    this.props.history.push('/hardware_wallet/');
  }

  render() {
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
                      fn: (x, i) => <a key={i} onClick={this.openLedgerGuide} href="true">{x}</a>
                    }
                  )}
                </p>
                <p className="mt-4 mb-4"><SpanFmt>{t`**Software wallets**, on the other hand, store the information on your computer.`}</SpanFmt></p>
                <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
                  <button onClick={this.goToHardwareWallet} type="button" className="btn btn-hathor mr-3">{t`Hardware wallet`}</button>
                  <button onClick={this.goToSoftwareWallet} type="button" className="btn btn-hathor">{t`Software wallet`}</button>
                </div>
              </div>
            </div>
          </div>
          <InitialImages />
        </div>
        {this.props.ledgerClosed &&
          <HathorAlert
            type='warning'
            extraClasses='hathor-floating-alert show'
            onDismiss={() => { this.props.updateLedgerClosed(false) }}
            text={t`Ledger disconnected! Either the app was closed or the connection was lost!`}
          />
        }
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(WalletType);
