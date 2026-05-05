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
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, REOWN_FEATURE_TOGGLE, SINGLE_ADDRESS_FEATURE_TOGGLE, ADDRESS_MODE } from '../constants';
import { walletReset, reloadWalletRequested } from '../actions';
import { getGlobalWallet } from '../modules/wallet';
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
  const singleAddressEnabled = useSelector(state => state.featureToggles[SINGLE_ADDRESS_FEATURE_TOGGLE]);
  const addressMode = useSelector(state => state.addressMode);
  const network = useSelector(state => state.networkSettings.data.network);
  const connectedSessionsCount = Object.keys(reownSessions).length;
  const isHardwareWallet = LOCAL_STORE.isHardwareWallet();

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
    if (isHardwareWallet) {
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
   * When user clicks Import Tokens button, open the token import modal
   */
  const importTokens = () => {
    context.showModal(MODAL_TYPES.TOKEN_IMPORT, {});
  };

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

  const openAddressModeModal = () => {
    context.showModal(MODAL_TYPES.ADDRESS_MODE, {
      currentMode: addressMode,
      onSave: handleAddressModeChange,
    });
  };

  const handleAddressModeChange = async (newMode) => {
    context.hideModal();

    try {
      const globalWallet = getGlobalWallet();

      if (newMode === ADDRESS_MODE.SINGLE) {
        await globalWallet.enableSingleAddressMode();
      } else {
        await globalWallet.enableMultiAddressMode();
      }

      wallet.setAddressMode(network, newMode);

      // Trigger wallet reload — reloadWalletRequested re-dispatches the original
      // startWalletRequested action (which has the correct PIN/password),
      // and the saga will re-read addressMode from localStorage
      dispatch(reloadWalletRequested());
    } catch (e) {
      console.error('Error changing address mode:', e);
      context.showModal(MODAL_TYPES.ALERT, {
        title: t`Error`,
        body: t`Failed to change address mode. Please try again.`,
      });
    }
  };

  const serverURL = useWalletService ? hathorLib.config.getWalletServiceBaseUrl() : hathorLib.config.getServerUrl();
  const wsServerURL = useWalletService ? hathorLib.config.getWalletServiceBaseWsUrl() : '';
  const ledgerCustomTokens = isHardwareWallet && version.isLedgerCustomTokenAllowed();
  const uniqueIdentifier = helpers.getUniqueId();

  const rawNetworkName = hathorLib.config.getNetwork().name || 'mainnet';
  const networkName = rawNetworkName.charAt(0).toUpperCase() + rawNetworkName.slice(1);

  return (
    <div className="content-wrapper settings">
      <BackButton />

      <h4>{t`General Settings`}</h4>
      <div className="settings-section">
        <p>
          <strong>{t`Network:`}</strong>{' '}
          {t`Connected to`} <strong>{networkName}</strong> ({serverURL})
          {useWalletService && (
            <span> | {wsServerURL}</span>
          )}
          <a className="settings-change-link" href="true" onClick={(e) => { e.preventDefault(); changeNetwork(); }}>{t`Change`}</a>
        </p>
        <p>
          <strong>{t`Allow notifications:`}</strong>{' '}
          {isNotificationOn ? <span>{t`Yes`}</span> : <span>{t`No`}</span>}
          <a className="settings-change-link" href="true" onClick={toggleNotificationSettings}>{t`Change`}</a>
        </p>
      </div>

      <hr />

      <h4>{t`Advanced Settings`}</h4>
      <div className="settings-section">
        <p>
          <strong>{t`Hide zero-balance tokens:`}</strong>{' '}
          {zeroBalanceTokensHidden ? <span>{t`Yes`}</span> : <span>{t`No`}</span>}
          <a className="settings-change-link" href="true" onClick={toggleZeroBalanceTokens}>{t`Change`}</a>
          <i className="fa fa-question-circle pointer ml-3"
             title={t`When selected, any tokens with a balance of zero will not be displayed anywhere in the wallet.`}>
          </i>
        </p>
        <p>
          <strong>{t`Automatically report bugs to Hathor:`}</strong>{' '}
          {wallet.isSentryAllowed() ? <span>{t`Yes`}</span> : <span>{t`No`}</span>}
          <Link className="settings-change-link" to='/permission/'>{t`Change`}</Link>
        </p>
        {singleAddressEnabled && (
          <p>
            <strong>{t`Address Mode:`}</strong>{' '}
            {addressMode === ADDRESS_MODE.SINGLE ? t`Single address` : t`Multi address`}
            <a className="settings-change-link" href="true" onClick={(e) => { e.preventDefault(); openAddressModeModal(); }}>
              {t`Change`}
            </a>
          </p>
        )}
        {!useWalletService && reownEnabled && (
          <p>
            <strong>{t`Reown:`}</strong>{' '}
            {t`Connected Sessions: ${connectedSessionsCount}`}
            <a className="settings-change-link" href="true" onClick={(e) => { e.preventDefault(); goToReown(); }}>{t`Manage sessions`}</a>
          </p>
        )}
        <a className="settings-action-link" href="true" onClick={(e) => { e.preventDefault(); importTokens(); }}>{t`Import tokens`}</a>
        <a className="settings-action-link" href="true" onClick={(e) => { e.preventDefault(); exportTokens(); }}>{t`Export registered tokens`}</a>
        <a className="settings-action-link" href="true" onClick={(e) => { e.preventDefault(); addPassphrase(); }}>{t`Set a passphrase`}</a>
        {ledgerCustomTokens && <a className="settings-action-link" href="true" onClick={(e) => { e.preventDefault(); untrustClicked(); }}>{t`Untrust all tokens on Ledger`}</a>}
      </div>

      <hr />

      <div className="settings-info">
        <CopyToClipboard text={uniqueIdentifier} onCopy={copyClicked}>
          <span>
            <p><strong>{t`Unique identifier:`}</strong> {uniqueIdentifier} <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i></p>
          </span>
        </CopyToClipboard>
        <p onDoubleClick={() => setShowTimestamp(!showTimestamp)}><strong>{t`Date and time:`}</strong> {showTimestamp ? hathorLib.dateFormatter.dateToTimestamp(now) : now.toString()}</p>
      </div>

      {!isHardwareWallet && <button type="button" className="settings-reset-button" onClick={resetClicked}>{t`Reset wallet`}</button>}

      <div className="settings-footer">
        <div><a href="true" onClick={goToTermsOfService}>{t`Terms of Service`}</a></div>
        <div><a href="true" onClick={goToPrivacyPolicy}>{t`Privacy Policy`}</a></div>
      </div>

      <HathorAlert ref={alertCopiedRef} text={t`Copied to clipboard!`} type="success" />
    </div>
  );
}

export default Settings;
