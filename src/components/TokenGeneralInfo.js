/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useCallback, useRef } from 'react';
import { t } from 'ttag';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import hathorLib from '@hathor/wallet-lib';
import HathorAlert from '../components/HathorAlert';
import wallet from "../utils/wallet";
import { useGlobalModalContext, MODAL_TYPES } from './GlobalModal';
import TokenInfoBox from './TokenInfoBox';

/**
 * @property {string} errorMessage Message to show in case of error getting token info
 * @property {number} totalSupply Token total supply
 * @property {boolean} canMint If this token can still be minted
 * @property {boolean} canMelt If this token can still be melted
 * @property {number} transactionsCount Total number of transactions of this token
 */
export default function TokenGeneralInfo ({
  token,
  showAlwaysShowTokenCheckbox,
  canMint,
  canMelt,
  transactionsCount,
  tokenMetadata,
  totalSupply,
  showConfigString,
  errorMessage,
}) {
  const [successMessage, setSuccessMessage]  = useState('');

  const context = useGlobalModalContext();

  const alertSuccessRef = useRef();

  /**
   * Handles the click on the "Always show this token" link
   * @param {Event} e
   */
  const toggleAlwaysShow = useCallback((e) => {
    e.preventDefault();

    if (wallet.isTokenAlwaysShow(token.uid)) {
      context.showModal(MODAL_TYPES.CONFIRM, {
        title: t`Disable always show`,
        body: t`Are you sure you don't want to always show token ${token.symbol}? If you continue you won't see this token if it has zero balance and you selected to hide zero balance tokens.`,
        handleYes: () => handleToggleAlwaysShow(),
      });
    } else {
      context.showModal(MODAL_TYPES.CONFIRM, {
        title: t`Enable always show`,
        body: t`Are you sure you want to always show token ${token.symbol}?`,
        handleYes: () => handleToggleAlwaysShow(),
      });
    }

  }, [token, context]);

  /**
   * Activates or deactivates always show on this token
   */
  const handleToggleAlwaysShow = () => {
    const newValue = !wallet.isTokenAlwaysShow(token.uid);
    wallet.setTokenAlwaysShow(token.uid, newValue);
    context.hideModal();
  };

  /**
   * Called when user clicks to download the qrcode
   * Add the href from the qrcode canvas
   *
   * @param {Object} e Event emitted by the link clicked
   */
  const downloadQrCode = (e) => {
    e.currentTarget.href = document.getElementsByTagName('canvas')[0].toDataURL();
  };

  /**
   * Show alert success message
   *
   * @param {string} message Success message
   */
  const showSuccess = (message) => {
    setSuccessMessage(message);
    alertSuccessRef.current.show(3000);
  };

  /**
   * Method called on copy to clipboard success
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  const copied = (_text, result) => {
    if (result) {
      // If copied with success
      showSuccess(t`Configuration string copied to clipboard!`);
    }
  };

  if (errorMessage) {
    return (
      <div className="content-wrapper flex align-items-start">
        <p className="text-danger">{errorMessage}</p>
      </div>
    );
  }

  if (!token) return null;

  const renderTokenInfo = () => {
    return (
      <TokenInfoBox
        token={token}
        totalSupply={totalSupply}
        canMint={canMint}
        canMelt={canMelt}
        transactionsCount={transactionsCount}
        tokenMetadata={tokenMetadata}
      >
        {showAlwaysShowTokenCheckbox && renderAlwaysShowTokenCheckbox()}
      </TokenInfoBox>
    );
  };

  const renderAlwaysShowTokenCheckbox = () => {
    return (
      <p className="mt-2 mb-4">
        <strong>{t`Always show this token:`}</strong> {
        wallet.isTokenAlwaysShow(token.uid)
          ? <span>{t`Yes`}</span>
          : <span>{t`No`}</span>
      }
        <a className="ml-3" href="true" onClick={toggleAlwaysShow}> {t`Change`} </a>
        <i className="fa fa-question-circle pointer ml-3"
           title={t`If selected, it will override the "Hide zero-balance tokens" settings.`}>
        </i>
      </p>
    );
  };

  const renderConfigString = () => {
    const configurationString = hathorLib.tokensUtils.getConfigurationString(token.uid, token.name, token.symbol);

    const getShortConfigurationString = () => {
      const configArr = configurationString.split(':');
      return `${configArr[0]}:${configArr[1]}...${configArr[3]}`;
    };

    return (
      <div className='d-flex flex-row align-items-center justify-content-center mt-4 w-100'>
        <div className='d-flex flex-column align-items-center config-string-wrapper'>
          <p><strong>{t`Configuration String`}</strong></p>
          <span className="mb-2">
            {getShortConfigurationString()}
            <CopyToClipboard text={configurationString} onCopy={copied}>
              <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i>
            </CopyToClipboard>
          </span>
          <QRCode size={200} value={configurationString} />
          <a className="mt-2" onClick={(e) => downloadQrCode(e)} download={`${token.name} (${token.symbol}) - ${configurationString}`} href="true">{t`Download`} <i className="fa fa-download ml-1" title={t`Download QRCode`}></i></a>
        </div>
        <HathorAlert ref={alertSuccessRef} text={successMessage} type="success" />
      </div>
    );
  }

  return (
    <div className="flex align-items-center">
      <div className='d-flex flex-column align-items-start justify-content-between token-detail-top'>
        <div className='d-flex flex-column justify-content-between mr-3'>
          {renderTokenInfo()}
        </div>
        {showConfigString && renderConfigString()}
      </div>
    </div>
  )
}
