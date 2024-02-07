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
import walletUtils from '../utils/wallet';
import tokens from '../utils/tokens';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import helpers from '../utils/helpers';
import { TOKEN_DEPOSIT_RFC_URL } from '../constants';
import InputNumber from '../components/InputNumber';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { str2jsx } from '../utils/i18n';
import { useHistory } from "react-router-dom";
import { getGlobalWallet } from "../services/wallet.service";

/**
 * Create a new token
 *
 * @memberof Screens
 */
function CreateToken() {

  const { htrBalance, useWalletService } = useSelector(state => ({
    htrBalance: get(state.tokensBalance, `${hathorLib.constants.HATHOR_TOKEN_CONFIG.uid}.data.available`, 0),
    useWalletService: state.useWalletService,
  }));
  const wallet = getGlobalWallet();

  const dispatch = useDispatch();
  const history = useHistory();
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
      const tokensValue = walletUtils.decimalToInteger(amount)
      if (tokensValue > hathorLib.constants.MAX_OUTPUT_VALUE) {
        const max_output_value_str = hathorLib.numberUtils.prettyValue(hathorLib.constants.MAX_OUTPUT_VALUE);
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
        walletUtils.decimalToInteger(amount),
        { address, pinCode: pin }
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
    await tokens.addToken(token.uid, name, symbol);

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
    history.push('/wallet/');
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
    helpers.openExternalURL(TOKEN_DEPOSIT_RFC_URL);
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
  const htrDeposit = depositPercent * 100;

  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4">Create Token</h3>
      <p className="mt-5">{t`Here you will create a new customized token. After the creation, you will be able to send this new token to other addresses.`}</p>
      <p>{t`Custom tokens share the address space with all other tokens, including HTR. This means that you can send and receive tokens using any valid address.`}</p>
      <p>{t`Remember to make a backup of your new token's configuration string. You will need to send it to other people to allow them to use your new token.`}</p>
      <p>
        {str2jsx(
          t`When creating and minting tokens, a |bold:deposit of ${htrDeposit}%| in HTR is required. If these tokens are later melted, this HTR deposit will be returned. Read more about it |link:here|.`,
          {
            bold: (x, i) => <strong key={i}>{x}</strong>,
            link: (x, i) => <a key={i} href="true" onClick={goToRFC}>{x}</a>,
          }
        )}
      </p>
      <hr className="mb-5 mt-5"/>
      <form ref={formCreateTokenRef} id="formCreateToken">
        <div className="row">
          <div className="form-group col-6">
            <label>{t`Short name`}</label>
            <input required ref={shortNameRef} placeholder={t`MyCoin`} type="text" className="form-control" />
          </div>
          <div className="form-group col-3">
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
             placeholder={hathorLib.numberUtils.prettyValue(0)}
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
        <p>Deposit: {tokens.getDepositAmount(amount, depositPercent)} HTR ({hathorLib.numberUtils.prettyValue(htrBalance)} HTR available)</p>
        <button type="button" className="mt-3 btn btn-hathor" onClick={onClickCreate}>Create</button>
      </form>
      <p className="text-danger mt-3">{errorMessage}</p>
    </div>
  );
}

export default CreateToken;
