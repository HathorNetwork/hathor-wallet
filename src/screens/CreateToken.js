/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useRef, useState } from 'react';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag'
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';

import { walletRefreshSharedAddress } from '../actions';
import tokens from '../utils/tokens';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import helpers from '../utils/helpers';
import { TOKEN_DEPOSIT_RFC_URL, TOKEN_FEE_RFC_URL } from '../constants';
import InputNumber from '../components/InputNumber';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { useNavigate, useParams } from "react-router-dom";
import { getGlobalWallet } from "../modules/wallet";

/**
 * Create a new token
 *
 * @memberof Screens
 */
function CreateToken() {

  const { htrBalance, useWalletService, decimalPlaces } = useSelector(state => ({
    htrBalance: get(state.tokensBalance, `${hathorLib.constants.NATIVE_TOKEN_UID}.data.available`, 0n),
    useWalletService: state.useWalletService,
    decimalPlaces: state.serverInfo.decimalPlaces,
  }));
  const wallet = getGlobalWallet();

  // Get TokenVersion enum from wallet-lib
  const { TokenVersion } = hathorLib;


  const { type } = useParams();
  // Allowlist of valid token versions for token creation
  const allowedTokenVersions = new Set([TokenVersion.DEPOSIT, TokenVersion.FEE]);
  const parsedType = Number(type);
  const tokenVersion = allowedTokenVersions.has(parsedType) ? parsedType : TokenVersion.DEPOSIT;
  const isDepositToken = tokenVersion === TokenVersion.DEPOSIT;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const globalModalContext = useContext(GlobalModalContext);

  const addressWrapperRef = useRef(null);
  const addressInputRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const shortNameRef = useRef(null);
  const symbolRef = useRef(null);
  const autoselectAddressRef = useRef(null);
  const formCreateTokenRef = useRef(null);

  /** errorMessage {string} Message to show when error happens on the form */
  const [errorMessage, setErrorMessage] = useState('');
  /** amount {number} Amount of tokens to create */
  const [amount, setAmount] = useState(null);

  /**
   * Validates if the create token form is valid
   */
  const formValid = () => {
    const isValid = formCreateTokenRef.current.checkValidity();
    if (isValid) {
      if (addressInputRef.current.value === '' && !autoselectAddressRef.current.checked) {
        setErrorMessage(t`Must choose an address or auto select`);
        return false;
      }

      // Validating maximum amount
      if (amount > hathorLib.constants.MAX_OUTPUT_VALUE) {
        const max_output_value_str = hathorLib.numberUtils.prettyValue(hathorLib.constants.MAX_OUTPUT_VALUE, decimalPlaces);
        setErrorMessage(t`Maximum value to mint token is ${max_output_value_str}`);
        return false;
      }
      return true;
    } else {
      formCreateTokenRef.current.classList.add('was-validated')
    }
  }

  /**
   * Opens PIN modal if form is valid
   */
  const onClickCreate = () => {
    if (!formValid()) {
      return;
    }

    setErrorMessage('');
    globalModalContext.showModal(MODAL_TYPES.PIN, {
      onSuccess: ({pin}) => {
        globalModalContext.showModal(MODAL_TYPES.SEND_TX, {
          pin,
          prepareSendTransaction: prepareSendTransaction,
          onSendSuccess: onTokenCreateSuccess,
          title: t`Creating token`,
        });
      }
    })
  }

  /**
   * Prepare create token transaction data after PIN is validated
   *
   * @param {String} pin PIN written by the user
   *
   * @return {hathorLib.SendTransaction} SendTransaction object
   */
  const prepareSendTransaction = async (pin) => {
    // Get the address to send the created tokens
    let address = '';
    if (autoselectAddressRef.current.checked) {
      address = (await wallet.getCurrentAddress({ markAsUsed: true })).address;
    } else {
      address = addressInputRef.current.value;
    }

    let transaction;
    try {
      transaction = await wallet.prepareCreateNewToken(
        shortNameRef.current.value,
        symbolRef.current.value,
        amount,
        { address, pinCode: pin, tokenVersion }
      );

      if (useWalletService) {
        return new hathorLib.SendTransactionWalletService(wallet, {
          transaction,
          outputs: transaction.outputs,
          pin,
        });
      }

      return new hathorLib.SendTransaction({
        transaction,
        pin,
        storage: wallet.storage,
      });
    } catch (e) {
      setErrorMessage(e.message);
    }
  }

  /**
   * Method executed if token is created with success
   *
   * @param {Object} tx Create token transaction data
   */
  const onTokenCreateSuccess = async (tx) => {
    const name = shortNameRef.current.value;
    const symbol = symbolRef.current.value;
    const token = {
      uid: tx.hash,
      name,
      symbol
    };

    // Update redux with added token
    await tokens.addToken(token.uid, name, symbol, tokenVersion);

    // Must update the shared address, in case we have used one for the change
    dispatch(walletRefreshSharedAddress())
    showAlert(token);
  }


  /**
   * Method called after creating a token, then show an alert with explanation of the token
   *
   * @param {Object} token Object with {uid, name, symbol}
   */
  const showAlert = (token) => {
    const configurationString = hathorLib.tokensUtils.getConfigurationString(token.uid, token.name, token.symbol);
    globalModalContext.showModal(MODAL_TYPES.ALERT, {
      title: t`Token ${token.name} created`,
      body: getAlertBody(configurationString),
      handleButton: alertButtonClick,
      buttonName: 'Ok',
    });
  }

  /**
   * Method called after clicking the button in the alert modal, then redirects to the wallet screen
   */
  const alertButtonClick = () => {
    globalModalContext.hideModal();
    navigate('/wallet/');
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  const handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(addressWrapperRef.current).hide(400);
    } else {
      $(addressWrapperRef.current).show(400);
    }
  }

  /**
   * Handles amount input change
   */
  const onAmountChange = (amount) => {
    setAmount(amount);
  }

  /**
   * Method called when user clicked to see the token deposit RFC
   *
   * @param {Object} e Event for the click
   */
  const goToRFC = (e) => {
    e.preventDefault();
    if (isDepositToken) {
      helpers.openExternalURL(TOKEN_DEPOSIT_RFC_URL);
    } else {
      helpers.openExternalURL(TOKEN_FEE_RFC_URL);
    }
  }

  /**
   * Renders the alert body element
   * @param {string} configurationString
   * @returns {JSX.Element}
   */
  const getAlertBody = (configurationString) => {
    return (
      <div>
        <p>{t`Your token has been successfully created!`}</p>
        <p>{t`You can share the following configuration string with other people to let them use your brand new token.`}</p>
        <p><SpanFmt>{t`Remember to **make a backup** of this configuration string.`}</SpanFmt></p>
        <p><strong>{configurationString}</strong></p>
      </div>
    )
  }

  const depositPercent = wallet.storage.getTokenDepositPercentage();
  const depositPercentDisplay = depositPercent * 100;
  const nativeTokenConfig = wallet.storage.getNativeTokenData();
  const availableBalanceText = `${hathorLib.numberUtils.prettyValue(htrBalance, decimalPlaces)} ${nativeTokenConfig.symbol} ${t`available`}`;
  const requiredFeeAmountText = `${hathorLib.numberUtils.prettyValue(hathorLib.constants.FEE_PER_OUTPUT, decimalPlaces)} ${nativeTokenConfig.symbol}`;

  /**
   * Calculates the required HTR amount to create a token
   * @param {bigint} [mintAmount] - Amount of tokens to mint
   * @returns {bigint} Required HTR amount in smallest unit
   */
  const getRequiredAmount = (mintAmount) => {
    if (isDepositToken) {
      // Deposit tokens require a percentage of the minted amount
      return mintAmount ? hathorLib.tokensUtils.getDepositAmount(mintAmount, depositPercent) : 0n;
    }
    // Fee tokens require a fixed 0.01 HTR network fee
    return hathorLib.constants.FEE_PER_OUTPUT;
  };

  const requiredAmount = getRequiredAmount(amount);
  const hasInsufficientBalance = requiredAmount > htrBalance;

  /**
   * Returns the balance validation message when insufficient balance
   * @returns {string|null} Validation message or null if balance is sufficient
   */
  const getBalanceValidationMessage = () => {
    if (!hasInsufficientBalance) {
      return null;
    }
    if (isDepositToken) {
      return t`Required deposit exceeds your available balance.`;
    }
    return t`Required network fee exceeds your available balance.`;
  };

  const balanceValidationMessage = getBalanceValidationMessage();

  /**
   * Renders the info box explaining the token type choice
   */
  const renderTokenTypeInfoBox = () => {
    const infoBoxStyle = {
      backgroundColor: '#daf1ff',
      borderRadius: '8px',
      padding: '8px 16px',
      fontSize: '14px',
    };

    if (isDepositToken) {
      return (
        <div className="d-flex align-items-center mt-4 mb-4" style={infoBoxStyle}>
          <i className="fa fa-info-circle mr-2" style={{ color: '#0066cc' }} aria-hidden="true"></i>
          <div>
            {t`You chose to create a `}<strong>{t`Deposit-Based Token`}</strong>{t`, which requires a ${depositPercentDisplay}% ${nativeTokenConfig.symbol} deposit. This ensures that all future transactions with this token have no additional fees. `}
            <a href="#" onClick={goToRFC} style={{ color: '#8C46FF', fontWeight: 'bold' }}>{t`Learn more.`}</a>
          </div>
        </div>
      );
    }

    return (
      <div className="d-flex align-items-center mt-4 mb-4" style={infoBoxStyle}>
        <i className="fa fa-info-circle mr-2" style={{ color: '#0066cc' }} aria-hidden="true"></i>
        <div>
          {t`You chose to create a `}<strong>{t`Fee-Based Token`}</strong>{t`, so a small fee will be applied to each future transaction of this token. `}
          <a href="#" onClick={goToRFC} style={{ color: '#8C46FF', fontWeight: 'bold' }}>{t`Learn more.`}</a>
        </div>
      </div>
    );
  };

  const renderFeeModelInfo = () => {
    let infoLabel = `${t`Network fee`}: ${requiredFeeAmountText} (${availableBalanceText})`;
    if (isDepositToken) {
      infoLabel = `${t`Deposit:`} ${tokens.getDepositAmount(amount, depositPercent, decimalPlaces)} ${nativeTokenConfig.symbol} (${availableBalanceText})`;
    }
    return <p className="mb-0">{infoLabel}</p>;
  }

  const formContainerStyle = {
    border: '1px solid #b7bfc7',
    borderRadius: '8px',
    padding: '16px',
  };

  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4 mb-4">{isDepositToken ? t`Create Deposit Token` : t`Create Fee Token`}</h3>
      <form ref={formCreateTokenRef} id="formCreateToken">
        <div className="rounded p-3 mb-3" style={formContainerStyle}>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Short name`}</label>
              <input required ref={shortNameRef} placeholder={t`MyCoin`} type="text" className="form-control" />
            </div>
            <div className="form-group col-4">
              <label>{t`Symbol`}</label>
              <input required ref={symbolRef} placeholder={t`MYC (2-5 characters)`} type="text" minLength={2} maxLength={5} className="form-control" />
            </div>
          </div>
          <div className="row">
            <div className="form-group col-4">
              <label>{t`Amount`}</label>
              <InputNumber
               required
               className="form-control"
               onValueChange={onAmountChange}
              />
            </div>
            <div className="form-group d-flex flex-row align-items-center address-checkbox">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={autoselectAddressRef} id="autoselectAddress" defaultChecked={true} onChange={handleCheckboxAddress} />
                <label className="form-check-label" htmlFor="autoselectAddress">
                  {t`Select address automatically`}
                </label>
              </div>
            </div>
            <div className="form-group col-5" ref={addressWrapperRef} style={{display: 'none'}}>
              <label>{t`Destination address`}</label>
              <input ref={addressInputRef} type="text" placeholder={t`Address`} className="form-control" />
            </div>
          </div>
          {renderFeeModelInfo()}
          {balanceValidationMessage && (
            <p className="text-danger mt-2 mb-0" role="alert">{balanceValidationMessage}</p>
          )}
        </div>
        {renderTokenTypeInfoBox()}
        <button
          type="button"
          className="btn btn-hathor text-uppercase"
          style={{ width: '260px', padding: '16px', fontSize: '14px' }}
          onClick={onClickCreate}
          disabled={hasInsufficientBalance}
        >
          {isDepositToken ? t`Create Deposit Token` : t`Create Fee Token`}
        </button>
      </form>
      <p className="text-danger mt-3">{errorMessage}</p>
    </div>
  );
}

export default CreateToken;
