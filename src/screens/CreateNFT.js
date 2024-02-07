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
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';

import { walletRefreshSharedAddress } from '../actions';
import walletUtils from '../utils/wallet';
import tokensUtils from '../utils/tokens';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import helpers from '../utils/helpers';
import { str2jsx } from '../utils/i18n';
import { NFT_DATA_MAX_SIZE, NFT_GUIDE_URL, NFT_STANDARD_RFC_URL } from '../constants';
import InputNumber from '../components/InputNumber';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { useHistory } from 'react-router-dom';


/**
 * Create an NFT
 *
 * @memberof Screens
 */
function CreateNFT() {

  const globalModalContext = useContext(GlobalModalContext);
  const history = useHistory();
  const dispatch = useDispatch();

  const addressDivRef = useRef();
  const formCreateNFTRef = useRef();
  const addressRef = useRef();
  const autoselectAddressRef = useRef();
  const nameRef = useRef();
  const symbolRef = useRef();
  const nftDataRef = useRef();
  const createMintAuthorityRef = useRef();
  const createMeltAuthorityRef = useRef();

  const { htrBalance, wallet, useWalletService } = useSelector((state) => {
    const HTR_UID = hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
    const htrBalance = get(state.tokensBalance, `${HTR_UID}.data.available`, 0);

    return {
      htrBalance,
      wallet: state.wallet,
      useWalletService: state.useWalletService,
    };
  });

  /** errorMessage {string} Message to show when error happens on the form */
  const [errorMessage, setErrorMessage] = useState('');
  /** amount {number} Amount of tokens to create */
  const [amount, setAmount] = useState(null);

  /**
   * Validates if the create NFT form is valid
   */
  const formValid = () => {
    const isValid = formCreateNFTRef.current.checkValidity();
    if (isValid) {
      if (addressRef.current.value === '' && !autoselectAddressRef.current.checked) {
        setErrorMessage(t`Must choose an address or auto select`);
        return false;
      }

      // Validating maximum amount
      if (amount > hathorLib.constants.MAX_OUTPUT_VALUE) {
        setErrorMessage(t`Maximum NFT units to mint is ${hathorLib.constants.MAX_OUTPUT_VALUE}`);
        return false;
      }
      return true;
    } else {
      formCreateNFTRef.current.classList.add('was-validated')
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
          title: t`Creating NFT`,
        });
      }
    })
  }

  /**
   * Prepare create NFT transaction data after PIN is validated
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
      address = addressRef.current.value;
    }

    const name = nameRef.current.value;
    const symbol = symbolRef.current.value;
    const nftData = nftDataRef.current.value;
    const createMint = createMintAuthorityRef.current.checked;
    const createMelt = createMeltAuthorityRef.current.checked;

    let transaction;
    try {
      transaction = await wallet.prepareCreateNewToken(
        name,
        symbol,
        parseInt(amount),
        {
          nftData,
          address,
          pinCode: pin,
          createMint,
          createMelt,
        }
      );

      if (useWalletService) {
        return new hathorLib.SendTransactionWalletService(wallet, {
          transaction,
          outputs: transaction.outputs,
          pin,
        });
      }

      return new hathorLib.SendTransaction({ transaction, pin, storage: wallet.storage });
    } catch (e) {
      setErrorMessage(e.message);
    }
  }

  /**
   * Method executed if token is created with success
   *
   * @param {Object} tx Create token transaction data
   */
  const onTokenCreateSuccess = (tx) => {
    const name = nameRef.current.value;
    const symbol = symbolRef.current.value;
    const token = {
      uid: tx.hash,
      name,
      symbol
    };

    // Update redux with added token
    tokensUtils.addToken(token.uid, name, symbol);
    // Must update the shared address, in case we have used one for the change
    dispatch(walletRefreshSharedAddress());
    // Also update the redux state with the NFT metadata for correct exhibition on all screens
    walletUtils.setLocalTokenMetadata(token.uid, {
      id: token.uid,
      nft: true,
    });
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
      title: t`NFT ${token.name} created`,
      handleButton: alertButtonClick,
      buttonName: 'Ok',
      body: (
        <div>
          <p>{t`Your NFT has been successfully created!`}</p>
          <p>{t`You can share the following configuration string with other people to let them register your brand new NFT in their wallets.`}</p>
          <p><SpanFmt>{t`Remember to **make a backup** of this configuration string.`}</SpanFmt></p>
          <p><strong>{configurationString}</strong></p>
        </div>
      ),
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
      $(addressDivRef.current).hide(400);
    } else {
      $(addressDivRef.current).show(400);
    }
  }

  /**
   * Handles amount input change
   */
  const onAmountChange = (newValue) => {
    setAmount(newValue);
  }

  /**
   * Method called when user clicked to see the NFT standard RFC
   *
   * @param {Object} e Event for the click
   */
  const goToRFC = (e) => {
    e.preventDefault();
    helpers.openExternalURL(NFT_STANDARD_RFC_URL);
  }

  /**
   * Method called when user clicked to see the NFT guide
   *
   * @param {Object} e Event for the click
   */
  const goToNFTGuide = (e) => {
    e.preventDefault();
    helpers.openExternalURL(NFT_GUIDE_URL);
  }

  // The htrDeposit will show on the explanation text as 0.01% since NFTs use unit values
  // Then to create 100 units, the deposit is 0.01 HTR, to create 1,000 units the deposit is 0.1 HTR
  // This is in the place of 0.01 HTR to create 1.00 of a custom token.
  // The actual math for the UI value would be htrDeposit * 100 / (10^(2-DECIMAL_PLACES))
  // Since NFT have 0 for DECIMAL_PLACES we get htrDeposit * 100/100 which is htrDeposit
  const htrDeposit = wallet.storage.getTokenDepositPercentage();
  const depositAmount = hathorLib.tokensUtils.getDepositAmount(amount, htrDeposit);
  const nftFee = hathorLib.numberUtils.prettyValue(tokensUtils.getNFTFee());

  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4">Create NFT</h3>
      <p className="mt-5">{t`Here you will create a new NFT. After the creation, you will be able to send the units of this NFT to other addresses.`}</p>
      <p>{t`NFTs share the address space with all other tokens, including HTR. This means that you can send and receive tokens using any valid address.`}</p>
      <p>{t`Remember to make a backup of your new token's configuration string. You will need to send it to other people to allow them to use your NFT.`}</p>
      <p>
        {str2jsx(
          t`When creating and minting NFTs, a |bold:deposit of ${htrDeposit}%| in HTR is required and an additional |bold:fee of ${nftFee} HTR|. If these tokens are later melted, this HTR deposit will be returned (depending on the amount melted) and the fee will never be returned. Read more about the NFT standard |link:here|.`,
          {
            bold: (x, i) => <strong key={i}>{x}</strong>,
            link: (x, i) => <a key={i} href="true" onClick={goToRFC}>{x}</a>,
          }
        )}
      </p>
      <p>
        {str2jsx(
          t`The most common usage for an NFT is to represent a digital asset. Please see |link:this guide| that explains how to create an NFT data (including suggestions on how to upload files to the IPFS network) in the Hathor standard in order to be able to show your asset in our explorer.`,
          {
            link: (x, i) => <a key={i} href="true" onClick={goToNFTGuide}>{x}</a>,
          }
        )}
      </p>
      <hr className="mb-5 mt-5"/>
      <form ref={formCreateNFTRef} id="formCreateNFT">
        <div className="row">
          <div className="form-group col-9">
            <label>{t`NFT Data`}</label>
            <input required ref={nftDataRef} placeholder={t`ipfs://...`} type="text" className="form-control" maxLength={NFT_DATA_MAX_SIZE} />
            <small id="nftDataHelp" className="form-text text-muted">String that uniquely identify your NFT. For example, the IPFS link to your metadata file, a URI to your asset or any string. Max size: {NFT_DATA_MAX_SIZE} characters.</small>
          </div>
        </div>
        <div className="row">
          <div className="form-group col-6">
            <label>{t`Short name`}</label>
            <input required ref={nameRef} placeholder={t`MyCoin`} type="text" className="form-control" />
          </div>
          <div className="form-group col-3">
            <label>{t`Symbol`}</label>
            <input required ref={symbolRef} placeholder={t`MYC (2-5 characters)`} type="text" minLength={2} maxLength={5} className="form-control" />
          </div>
        </div>
        <div className="row">
          <div className="form-group col-4">
            <label>{t`Amount`}</label>
            <InputNumber required className="form-control" precision={0} placeholder="How many NFT units to create" onValueChange={onAmountChange} />
          </div>
          <div className="form-group d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={autoselectAddressRef} id="autoselectAddress" defaultChecked={true} onChange={handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                {t`Select address automatically`}
              </label>
            </div>
          </div>
          <div className="form-group col-5" ref={addressDivRef} style={{display: 'none'}}>
            <label>{t`Destination address`}</label>
            <input ref={addressRef} type="text" placeholder={t`Address`} className="form-control" />
          </div>
        </div>
        <div className="row mt-3">
          <div className="form-group d-flex flex-row align-items-center create-mint-checkbox col-5">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={createMintAuthorityRef} id="createMintAuthority" defaultChecked={false} />
              <label className="form-check-label" htmlFor="createMintAuthority">
                {t`Create a mint authority`}<small id="createMintHelp" className="form-text text-muted">If you want to be able to mint more units of this NFT.</small>
              </label>
            </div>
          </div>
          <div className="form-group d-flex flex-row align-items-center create-melt-checkbox col-4">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={createMeltAuthorityRef} id="createMeltAuthority" defaultChecked={false} />
              <label className="form-check-label" htmlFor="createMeltAuthority">
                {t`Create a melt authority`}<small id="createMeltHelp" className="form-text text-muted">If you want to be able to melt units of this NFT.</small>
              </label>
            </div>
          </div>
        </div>
        <hr className="mb-5 mt-5"/>
        <p><strong>HTR available:</strong> {hathorLib.numberUtils.prettyValue(htrBalance)} HTR</p>
        <p><strong>Deposit:</strong> {hathorLib.numberUtils.prettyValue(depositAmount)} HTR</p>
        <p><strong>Fee:</strong> {nftFee} HTR</p>
        <p><strong>Total:</strong> {hathorLib.numberUtils.prettyValue(tokensUtils.getNFTFee() + depositAmount)} HTR</p>
        <button type="button" className="mt-3 btn btn-hathor" onClick={onClickCreate}>Create</button>
      </form>
      <p className="text-danger mt-3">{errorMessage}</p>
    </div>
  );
}

export default CreateNFT;
