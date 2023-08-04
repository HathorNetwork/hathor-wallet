/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import { Link } from 'react-router-dom';
import HathorAlert from '../components/HathorAlert';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import { str2jsx } from '../utils/i18n';
import version from '../utils/version';
import { connect } from "react-redux";
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../constants';
import { walletReset } from '../actions';
import LOCAL_STORE from '../storage';

const mapStateToProps = (state) => {
  return {
    useWalletService: state.useWalletService,
    registeredTokens: state.tokens,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    walletReset: () => dispatch(walletReset()),
  };
};

/**
 * Settings screen
 *
 * @memberof Screens
 */
class Settings extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.alertCopiedRef = React.createRef();
  }

  /**
   * confirmData {Object} data for the notification confirm modal (title, body and handleYes)
   * isNotificationOne {boolean} state to update if notification is turned on or off
   * now {Date} state to store the date which is updated every second
   * showTimestamp {boolean} If should show timestamp or full date in date and time
   */
  state = {
    confirmData: {},
    isNotificationOn: null,
    zeroBalanceTokensHidden: null,
    now: new Date(),
    showTimestamp: false,
  }

  // Stores the setTimeout interval of the date update
  dateSetTimeoutInterval = null

  componentDidMount() {
    this.setState({
      isNotificationOn: wallet.isNotificationOn(),
      zeroBalanceTokensHidden: wallet.areZeroBalanceTokensHidden()
    });

    this.dateSetTimeoutInterval = setInterval(() => {
      this.setState({ now: new Date() });
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.dateSetTimeoutInterval);
  }

  /**
   * Method called when user confirmed the reset, then we reset all data and redirect to Welcome screen
   */
  handleReset = () => {
    this.context.hideModal();
    this.props.walletReset();
    this.props.history.push('/welcome/');
  }

  /**
   * When user clicks Reset button we open a modal to confirm it
   */
  resetClicked = () => {
    this.context.showModal(MODAL_TYPES.RESET_ALL_DATA, {
      success: this.handleReset,
    });
  }

  /**
   * When user clicks Add Passphrase button we redirect to Passphrase screen
   */
  addPassphrase = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      this.context.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED, {
        title: t`Complete action on your hardware wallet`,
        children: (
          <div>
            <p>{t`You can set your passphrase directly on your hardware wallet.`}</p>
            <p>
              {str2jsx(t`|fn:More info| about this on Ledger.`,
                       {fn: (x, i) => <a key={i} onClick={this.openLedgerLink} href="true">{x}</a>})}
            </p>
          </div>
        )
      });
    } else {
      this.props.history.push('/wallet/passphrase/');
    }
  }

  /**
   * When user clicks Export Registered Tokens button, then we save all config strings in a txt file
   */
  exportTokens = () => {
    // The file text will be the configuration strings of each registered token, one each line
    //
    // First we get all token configs from registered tokens array,
    // remove the HTR token with filter, then map to each configuration string
    const configurationStrings = this.props.registeredTokens.filter((token) => {
      return token.uid !== hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
    }).map((token) => {
      return hathorLib.tokensUtils.getConfigurationString(token.uid, token.name, token.symbol);
    });

    // The text will be all the configuration strings, one for each line
    const text = configurationStrings.join('\n');

    // Create the hidden a element to trigger the download
    const element = document.createElement('a');
    const file = new Blob([text], {
      type: 'text/plain'
    });
    element.href = URL.createObjectURL(file);
    element.download = 'Hathor Wallet - Tokens.txt';
    document.body.appendChild(element);
    element.click();
    element.remove();
  }

  /**
   * When user clicks Change Server button we redirect to Change Server screen
   */
  changeServer = () => {
    this.props.history.push('/server/');
  }

  /**
   * Called when user clicks to change notification settings
   * Sets modal state, depending on the current settings and open it
   *
   * @param {Object} e Event emitted on link click
   */
  toggleNotificationSettings = (e) => {
    e.preventDefault();
    let newState = {};
    if (wallet.isNotificationOn()) {
      newState = {
        confirmData: {
          title: t`Turn notifications off`,
          body: t`Are you sure you don't want to receive wallet notifications?`,
          handleYes: this.handleToggleNotificationSettings
        }
      };
    } else {
      newState = {
        confirmData: {
          title: t`Turn notifications on`,
          body: t`Are you sure you want to receive wallet notifications?`,
          handleYes: this.handleToggleNotificationSettings
        }
      };
    }

    this.setState(newState, () => {
      this.context.showModal(MODAL_TYPES.CONFIRM, {
        title: this.state.confirmData.title,
        body: this.state.confirmData.body,
        handleYes: this.state.confirmData.handleYes,
      });
    })
  }

  /**
   * Called when user clicks to change the "Hide zero-balance tokens" flag.
   * Sets modal state, depending on the current settings and open it.
   *
   * @param {Object} e Event emitted on link click
   */
  toggleZeroBalanceTokens = (e) => {
    e.preventDefault();
    let newState = {};

    if (wallet.areZeroBalanceTokensHidden()) {
      newState = {
        confirmData: {
          title: t`Show zero-balance tokens`,
          body: t`Are you sure you want to show all tokens, including those with zero balance?`,
          handleYes: this.handleToggleZeroBalanceTokens
        },
      };
    } else {
      newState = {
        confirmData: {
          title: t`Hide zero-balance tokens`,
          body: t`Are you sure you want to hide tokens with zero balance?`,
          handleYes: this.handleToggleZeroBalanceTokens
        },
      };
    }

    this.setState(newState, () => {
      this.context.showModal(MODAL_TYPES.CONFIRM, {
        title: this.state.confirmData.title,
        body: this.state.confirmData.body,
        handleYes: this.state.confirmData.handleYes,
      });
    });
  }

  /**
   * Activates or deactivates the option to hide zero-balance tokens from the UI.
   */
  handleToggleZeroBalanceTokens = () => {
    const areZeroBalanceTokensHidden = wallet.areZeroBalanceTokensHidden();

    if (areZeroBalanceTokensHidden) {
      wallet.showZeroBalanceTokens();
    } else {
      wallet.hideZeroBalanceTokens();
    }
    this.setState({ zeroBalanceTokensHidden: !areZeroBalanceTokensHidden });
    this.context.hideModal();
  }

  /**
   * Called after user confirms the notification toggle action
   * Toggle user notification settings, update screen state and close the confirm modal
   */
  handleToggleNotificationSettings = () => {
    if (wallet.isNotificationOn()) {
      wallet.turnNotificationOff();
    } else {
      wallet.turnNotificationOn();
    }
    this.setState({ isNotificationOn: wallet.isNotificationOn() });
    this.context.hideModal();
  }

  /**
   * Method called to open external Ledger page.
   *
   * @param {Object} e Event for the click
   */
  openLedgerLink = (e) => {
    e.preventDefault();
    const url = 'https://support.ledger.com/hc/en-us/articles/115005214529-Advanced-passphrase-security';
    helpers.openExternalURL(url);
  }

  /**
   * Called when user clicks to untrust all tokens, then opens the modal
   */
  untrustClicked = () => {
    this.context.showModal(MODAL_TYPES.RESET_TOKEN_SIGNATURES);
  }

  /**
   * Method called on copy to clipboard success
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.alertCopiedRef.current.show(1000);
    }
  }

  /**
   * Method called to open Terms of Service URL
   *
   * @param {Object} e Event for the click
   */
  goToTermsOfService = (e) => {
    e.preventDefault();
    helpers.openExternalURL(TERMS_OF_SERVICE_URL);
  }

  /**
   * Method called to open Privacy Policy URL
   *
   * @param {Object} e Event for the click
   */
  goToPrivacyPolicy = (e) => {
    e.preventDefault();
    helpers.openExternalURL(PRIVACY_POLICY_URL);
  }

  render() {
    const serverURL = this.props.useWalletService ? hathorLib.config.getWalletServiceBaseUrl() : hathorLib.config.getServerUrl();
    const wsServerURL = this.props.useWalletService ? hathorLib.config.getWalletServiceBaseWsUrl() : '';
    const ledgerCustomTokens = (!LOCAL_STORE.isHardwareWallet()) && version.isLedgerCustomTokenAllowed();
    const uniqueIdentifier = helpers.getUniqueId();

    return (
      <div className="content-wrapper settings">
        <BackButton {...this.props} />
        <div>
          <p onDoubleClick={() => this.setState({ showTimestamp: !this.state.showTimestamp })}><strong>{t`Date and time:`}</strong> {this.state.showTimestamp ? hathorLib.dateFormatter.dateToTimestamp(this.state.now) : this.state.now.toString()}</p>
        </div>
        <div>
          <p><SpanFmt>{t`**Server:** You are connected to ${serverURL}`}</SpanFmt></p>
          {
            this.props.useWalletService && (
              <p><SpanFmt>{t`**Real-time server:** You are connected to ${wsServerURL}`}</SpanFmt></p>
            )
          }
          <button className="btn btn-hathor" onClick={this.changeServer}>{t`Change server`}</button>
        </div>
        <hr />

        <div>
          <h4>{t`Advanced Settings`}</h4>
          <div className="d-flex flex-column align-items-start mt-4">
            <p><strong>{t`Allow notifications:`}</strong> {this.state.isNotificationOn ? <span>{t`Yes`}</span> : <span>{t`No`}</span>} <a className='ml-3' href="true" onClick={this.toggleNotificationSettings}> {t`Change`} </a></p>
            <p>
              <strong>{t`Hide zero-balance tokens:`}</strong> {
              this.state.zeroBalanceTokensHidden
                ? <span>{t`Yes`}</span>
                : <span>{t`No`}</span>
              }
              <a className="ml-3" href="true" onClick={this.toggleZeroBalanceTokens}> {t`Change`} </a>
              <i className="fa fa-question-circle pointer ml-3"
                 title={t`When selected, any tokens with a balance of zero will not be displayed anywhere in the wallet.`}>
              </i>
            </p>
            <p><strong>{t`Automatically report bugs to Hathor:`}</strong> {wallet.isSentryAllowed() ? <span>{t`Yes`}</span> : <span>{t`No`}</span>} <Link className='ml-3' to='/permission/'> {t`Change`} </Link></p>
            <CopyToClipboard text={uniqueIdentifier} onCopy={this.copied}>
              <span>
                <p><strong>{t`Unique identifier`}:</strong> {uniqueIdentifier} <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i></p>
              </span>
            </CopyToClipboard>
            <button className="btn btn-hathor" onClick={this.exportTokens}>{t`Export Registered Tokens`}</button>
            <button className="btn btn-hathor mt-4" onClick={this.addPassphrase}>{t`Set a passphrase`}</button>
            {ledgerCustomTokens && <button className="btn btn-hathor mt-4" onClick={this.untrustClicked}>{t`Untrust all tokens on Ledger`}</button> }
            <button className="btn btn-hathor mt-4" onClick={this.resetClicked}>{t`Reset all data`}</button>
          </div>
        </div>
        <hr />

        <div className="pb-5">
          <div><a href="true" onClick={this.goToTermsOfService}>Terms of Service</a></div>
          <div><a href="true" onClick={this.goToPrivacyPolicy}>Privacy Policy</a></div>
        </div>
        <HathorAlert ref={this.alertCopiedRef} text={t`Copied to clipboard!`} type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
