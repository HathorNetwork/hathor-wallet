/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import { t } from 'ttag';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import { Link, useNavigate } from 'react-router-dom';
import HathorAlert from '../components/HathorAlert';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import { str2jsx } from '../utils/i18n';
import version from '../utils/version';
import { useDispatch, useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, REOWN_FEATURE_TOGGLE } from '../constants';
import { walletReset } from '../actions';
import LOCAL_STORE from '../storage';

/**
 * Settings screen
 *
 * @memberof Screens
 */
function Settings() {
  const context = useContext(GlobalModalContext);
  const alertCopiedRef = useRef();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /** isNotificationOne {boolean} state to update if notification is turned on or off */
  const [isNotificationOn, setIsNotificationOn] = useState(null);
  /** zeroBalanceTokensHidden {boolean} if zero balance tokens are hidden or not */
  const [zeroBalanceTokensHidden, setZeroBalanceTokensHidden] = useState(null);
  /** now {Date} state to store the date which is updated every second */
  const [now, setNow] = useState(new Date());
  /** showTimestamp {boolean} If should show timestamp or full date in date and time */
  const [showTimestamp, setShowTimestamp] = useState(false);

  const { useWalletService, registeredTokens } = useSelector(state => ({
    useWalletService: state.useWalletService,
    registeredTokens: state.tokens,
  }))

  const reownEnabled = useSelector(state => state.featureToggles[REOWN_FEATURE_TOGGLE]);
  const reownSessions = useSelector(state => state.reown.sessions);
  const connectedSessionsCount = Object.keys(reownSessions).length;

  useEffect(() => {
    setIsNotificationOn(wallet.isNotificationOn());
    setZeroBalanceTokensHidden(wallet.areZeroBalanceTokensHidden());

    // Updates the screen date and time
    const dateInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(dateInterval);
    }
  }, []);

  /**
   * Method called when user confirmed the reset, then we reset all data and redirect to Welcome screen
   */
  const handleReset = () => {
    context.hideModal();
    dispatch(walletReset());
    navigate('/welcome/');
  }

  /**
   * When user clicks Reset button we open a modal to confirm it
   */
  const resetClicked = () => {
    context.showModal(MODAL_TYPES.RESET_ALL_DATA, {
      success: handleReset,
    });
  }

  /**
   * When user clicks Add Passphrase button we redirect to Passphrase screen
   */
  const addPassphrase = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      context.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED, {
        title: t`Complete action on your hardware wallet`,
        children: (
          <div>
            <p>{t`You can set your passphrase directly on your hardware wallet.`}</p>
            <p>
              {str2jsx(t`|fn:More info| about this on Ledger.`,
                       {fn: (x, i) => <a key={i} onClick={openLedgerLink} href="true">{x}</a>})}
            </p>
          </div>
        )
      });
    } else {
      navigate('/wallet/passphrase/');
    }
  }

  /**
   * When user clicks Export Registered Tokens button, then we save all config strings in a txt file
   */
  const exportTokens = () => {
    // The file text will be the configuration strings of each registered token, one each line
    //
    // First we get all token configs from registered tokens array,
    // remove the HTR token with filter, then map to each configuration string
    const configurationStrings = registeredTokens.filter((token) => {
      return token.uid !== hathorLib.constants.NATIVE_TOKEN_UID;
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
   * When user clicks Change Network button we redirect to Network Settings screen
   */
  const changeNetwork = () => {
    navigate('/network_settings/');
  }

  /**
   * Called when user clicks to change notification settings
   * Sets modal state, depending on the current settings and open it
   *
   * @param {Object} e Event emitted on link click
   */
  const toggleNotificationSettings = (e) => {
    e.preventDefault();
    let title, body;

    if (wallet.isNotificationOn()) {
      title = t`Turn notifications off`;
      body = t`Are you sure you don't want to receive wallet notifications?`;
    } else {
      title = t`Turn notifications on`;
      body = t`Are you sure you want to receive wallet notifications?`;
    }

    context.showModal(MODAL_TYPES.CONFIRM, {
      title,
      body,
      handleYes: handleToggleNotificationSettings,
    });
  }

  /**
   * Called when user clicks to change the "Hide zero-balance tokens" flag.
   * Sets modal state, depending on the current settings and open it.
   *
   * @param {Object} e Event emitted on link click
   */
  const toggleZeroBalanceTokens = (e) => {
    e.preventDefault();
    let title, body;

    if (wallet.areZeroBalanceTokensHidden()) {
      title = t`Show zero-balance tokens`;
      body = t`Are you sure you want to show all tokens, including those with zero balance?`;
    } else {
      title = t`Hide zero-balance tokens`;
      body = t`Are you sure you want to hide tokens with zero balance?`;
    }

    context.showModal(MODAL_TYPES.CONFIRM, {
      title,
      body,
      handleYes: handleToggleZeroBalanceTokens,
    });
  }

  /**
   * Activates or deactivates the option to hide zero-balance tokens from the UI.
   */
  const handleToggleZeroBalanceTokens = () => {
    const areZeroBalanceTokensHidden = wallet.areZeroBalanceTokensHidden();

    if (areZeroBalanceTokensHidden) {
      wallet.showZeroBalanceTokens();
    } else {
      wallet.hideZeroBalanceTokens();
    }
    setZeroBalanceTokensHidden(!areZeroBalanceTokensHidden);
    context.hideModal();
  }

  /**
   * Called after user confirms the notification toggle action
   * Toggle user notification settings, update screen state and close the confirm modal
   */
  const handleToggleNotificationSettings = () => {
    if (wallet.isNotificationOn()) {
      wallet.turnNotificationOff();
    } else {
      wallet.turnNotificationOn();
    }
    setIsNotificationOn(wallet.isNotificationOn());
    context.hideModal();
  }

  /**
   * Method called to open external Ledger page.
   *
   * @param {Object} e Event for the click
   */
  const openLedgerLink = (e) => {
    e.preventDefault();
    const url = 'https://support.ledger.com/hc/en-us/articles/115005214529-Advanced-passphrase-security';
    helpers.openExternalURL(url);
  }

  /**
   * Called when user clicks to untrust all tokens, then opens the modal
   */
  const untrustClicked = () => {
    context.showModal(MODAL_TYPES.RESET_TOKEN_SIGNATURES);
  }

  /**
   * Method called on copy to clipboard success
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  const copyClicked = (text, result) => {
    if (result) {
      // If copied with success
      alertCopiedRef.current.show(1000);
    }
  }

  /**
   * Method called to open Terms of Service URL
   *
   * @param {Object} e Event for the click
   */
  const goToTermsOfService = (e) => {
    e.preventDefault();
    helpers.openExternalURL(TERMS_OF_SERVICE_URL);
  }

  /**
   * Method called to open Privacy Policy URL
   *
   * @param {Object} e Event for the click
   */
  const goToPrivacyPolicy = (e) => {
    e.preventDefault();
    helpers.openExternalURL(PRIVACY_POLICY_URL);
  }

  const goToReown = () => {
    navigate('/reown/connect');
  }

  const serverURL = useWalletService ? hathorLib.config.getWalletServiceBaseUrl() : hathorLib.config.getServerUrl();
  const wsServerURL = useWalletService ? hathorLib.config.getWalletServiceBaseWsUrl() : '';
  const ledgerCustomTokens = LOCAL_STORE.isHardwareWallet() && version.isLedgerCustomTokenAllowed();
  const uniqueIdentifier = helpers.getUniqueId();

  return (
    <div className="content-wrapper settings">
      <BackButton />
      <div>
        <p onDoubleClick={() => setShowTimestamp(!showTimestamp)}><strong>{t`Date and time:`}</strong> {showTimestamp ? hathorLib.dateFormatter.dateToTimestamp(now) : now.toString()}</p>
      </div>
      <div>
        <p><SpanFmt>{t`**Server:** You are connected to ${serverURL}`}</SpanFmt></p>
        {
          useWalletService && (
            <p><SpanFmt>{t`**Real-time server:** You are connected to ${wsServerURL}`}</SpanFmt></p>
          )
        }
        <button className="btn btn-hathor" onClick={changeNetwork}>{t`Change network`}</button>
      </div>
      <hr />

      {!useWalletService && reownEnabled && (
        <div>
          <h4>{t`Reown`}</h4>
          <div className="d-flex flex-row align-items-center mb-2">
            <span>{t`Connected Sessions: ${connectedSessionsCount}`}</span>
          </div>
          <button className="btn btn-hathor" onClick={goToReown}>{t`Manage sessions`}</button>
          <hr />
        </div>
      )}

      <div>
        <h4>{t`Advanced Settings`}</h4>
        <div className="d-flex flex-column align-items-start mt-4">
          <p><strong>{t`Allow notifications:`}</strong> {isNotificationOn ? <span>{t`Yes`}</span> : <span>{t`No`}</span>} <a className='ml-3' href="true" onClick={toggleNotificationSettings}> {t`Change`} </a></p>
          <p>
            <strong>{t`Hide zero-balance tokens:`}</strong> {
            zeroBalanceTokensHidden
              ? <span>{t`Yes`}</span>
              : <span>{t`No`}</span>
            }
            <a className="ml-3" href="true" onClick={toggleZeroBalanceTokens}> {t`Change`} </a>
            <i className="fa fa-question-circle pointer ml-3"
               title={t`When selected, any tokens with a balance of zero will not be displayed anywhere in the wallet.`}>
            </i>
          </p>
          <p><strong>{t`Automatically report bugs to Hathor:`}</strong> {wallet.isSentryAllowed() ? <span>{t`Yes`}</span> : <span>{t`No`}</span>} <Link className='ml-3' to='/permission/'> {t`Change`} </Link></p>
          <CopyToClipboard text={uniqueIdentifier} onCopy={copyClicked}>
            <span>
              <p><strong>{t`Unique identifier`}:</strong> {uniqueIdentifier} <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i></p>
            </span>
          </CopyToClipboard>
          <button className="btn btn-hathor mt-4" onClick={exportTokens}>{t`Export Registered Tokens`}</button>
          <button className="btn btn-hathor mt-4" onClick={addPassphrase}>{t`Set a passphrase`}</button>
          {ledgerCustomTokens && <button className="btn btn-hathor mt-4" onClick={untrustClicked}>{t`Untrust all tokens on Ledger`}</button> }
          <button className="btn btn-hathor mt-4" onClick={resetClicked}>{t`Reset all data`}</button>
        </div>
      </div>
      <hr />

      <div className="pb-5">
        <div><a href="true" onClick={goToTermsOfService}>Terms of Service</a></div>
        <div><a href="true" onClick={goToPrivacyPolicy}>Privacy Policy</a></div>
      </div>
      <HathorAlert ref={alertCopiedRef} text={t`Copied to clipboard!`} type="success" />
    </div>
  );
}

export default Settings;
