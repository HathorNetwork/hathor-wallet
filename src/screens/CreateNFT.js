/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag'
import { connect } from "react-redux";
import { get } from 'lodash';

import { walletRefreshSharedAddress } from '../actions';
import wallet from '../utils/wallet';
import tokens from '../utils/tokens';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import helpers from '../utils/helpers';
import { str2jsx } from '../utils/i18n';
import { NFT_GUIDE_URL, NFT_STANDARD_RFC_URL, NFT_DATA_MAX_SIZE } from '../constants';
import InputNumber from '../components/InputNumber';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';


const mapStateToProps = (state) => {
  const HTR_UID = hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
  const htrBalance = get(state.tokensBalance, `${HTR_UID}.data.available`, 0);

  return {
    htrBalance,
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};

const mapDispatchToProps = (dispatch) => ({
  walletRefreshSharedAddress: () => dispatch(walletRefreshSharedAddress()),
});


/**
 * Create an NFT
 *
 * @memberof Screens
 */
class CreateNFT extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.addressDivRef = React.createRef();
    this.formCreateNFTRef = React.createRef();
    this.addressRef = React.createRef();
    this.autoselectAddressRef = React.createRef();
    this.nameRef = React.createRef();
    this.symbolRef = React.createRef();
    this.nftDataRef = React.createRef();
    this.createMintAuthorityRef = React.createRef();
    this.createMeltAuthorityRef = React.createRef();

    /**
     * errorMessage {string} Message to show when error happens on the form
     * name {string} Name of the created token
     * configurationString {string} Configuration string of the created token
     * amount {number} Amount of tokens to create
     */
    this.state = {
      errorMessage: '',
      name: '',
      configurationString: '',
      amount: null,
    };
  }

  /**
   * Validates if the create NFT form is valid
   */
  formValid = () => {
    const isValid = this.formCreateNFTRef.current.checkValidity();
    if (isValid) {
      if (this.addressRef.current.value === '' && !this.autoselectAddressRef.current.checked) {
        this.setState({ errorMessage: t`Must choose an address or auto select` });
        return false;
      }

      // Validating maximum amount
      if (this.state.amount > hathorLib.constants.MAX_OUTPUT_VALUE) {
        this.setState({ errorMessage: t`Maximum NFT units to mint is ${hathorLib.constants.MAX_OUTPUT_VALUE}` });
        return false;
      }
      return true;
    } else {
      this.formCreateNFTRef.current.classList.add('was-validated')
    }
  }

  /**
   * Opens PIN modal if form is valid
   */
  onClickCreate = () => {
    if (!this.formValid()) {
      return;
    }

    this.setState({ errorMessage: '' });
    this.context.showModal(MODAL_TYPES.PIN, {
      onSuccess: ({pin}) => {
        this.context.showModal(MODAL_TYPES.SEND_TX, {
          pin,
          prepareSendTransaction: this.prepareSendTransaction,
          onSendSuccess: this.onTokenCreateSuccess,
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
  prepareSendTransaction = async (pin) => {
    // Get the address to send the created tokens
    let address = '';
    if (this.autoselectAddressRef.current.checked) {
      address = (await this.props.wallet.getCurrentAddress({ markAsUsed: true })).address;
    } else {
      address = this.addressRef.current.value;
    }

    const name = this.nameRef.current.value;
    const symbol = this.symbolRef.current.value;
    const nftData = this.nftDataRef.current.value;
    const createMint = this.createMintAuthorityRef.current.checked;
    const createMelt = this.createMeltAuthorityRef.current.checked;

    let transaction;
    try {
      transaction = await this.props.wallet.prepareCreateNewToken(
        name,
        symbol,
        parseInt(this.state.amount),
        {
          nftData,
          address,
          pinCode: pin,
          createMint,
          createMelt,
        }
      );

      if (this.props.useWalletService) {
        return new hathorLib.SendTransactionWalletService(this.props.wallet, {
          transaction,
          outputs: transaction.outputs,
          pin,
        });
      }

      return new hathorLib.SendTransaction({ transaction, pin, storage: this.props.wallet.storage });
    } catch (e) {
      this.setState({ errorMessage: e.message });
    }
  }

  /**
   * Method executed if token is created with success
   *
   * @param {Object} tx Create token transaction data
   */
  onTokenCreateSuccess = (tx) => {
    const name = this.nameRef.current.value;
    const symbol = this.symbolRef.current.value;
    const token = {
      uid: tx.hash,
      name,
      symbol
    };

    // Update redux with added token
    tokens.addToken(token.uid, name, symbol);
    // Must update the shared address, in case we have used one for the change
    this.props.walletRefreshSharedAddress();
    // Also update the redux state with the NFT metadata for correct exhibition on all screens
    wallet.setLocalTokenMetadata(token.uid, {
      id: token.uid,
      nft: true,
    });
    this.showAlert(token);
  }


  /**
   * Method called after creating a token, then show an alert with explanation of the token
   *
   * @param {Object} token Object with {uid, name, symbol}
   */
  showAlert = (token) => {
    this.setState({ name: token.name, configurationString: hathorLib.tokensUtils.getConfigurationString(token.uid, token.name, token.symbol) }, () => {
      this.context.showModal(MODAL_TYPES.ALERT, {
        title: t`NFT ${this.state.name} created`,
        handleButton: this.alertButtonClick,
        buttonName: 'Ok',
        body: (
          <div>
            <p>{t`Your NFT has been successfully created!`}</p>
            <p>{t`You can share the following configuration string with other people to let them register your brand new NFT in their wallets.`}</p>
            <p><SpanFmt>{t`Remember to **make a backup** of this configuration string.`}</SpanFmt></p>
            <p><strong>{this.state.configurationString}</strong></p>
          </div>
        ),
      });
    });
  }

  /**
   * Method called after clicking the button in the alert modal, then redirects to the wallet screen
   */
  alertButtonClick = () => {
    this.context.hideModal();
    this.props.history.push('/wallet/');
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.addressDivRef.current).hide(400);
    } else {
      $(this.addressDivRef.current).show(400);
    }
  }

  /**
   * Handles amount input change
   */
  onAmountChange = (newValue) => {
    this.setState({ amount: newValue });
  }

  /**
   * Method called when user clicked to see the NFT standard RFC
   *
   * @param {Object} e Event for the click
   */
  goToRFC = (e) => {
    e.preventDefault();
    helpers.openExternalURL(NFT_STANDARD_RFC_URL);
  }

  /**
   * Method called when user clicked to see the NFT guide
   *
   * @param {Object} e Event for the click
   */
  goToNFTGuide = (e) => {
    e.preventDefault();
    helpers.openExternalURL(NFT_GUIDE_URL);
  }

  render = () => {
    // The htrDeposit will show on the explanation text as 0.01% since NFTs use unit values
    // Then to create 100 units, the deposit is 0.01 HTR, to create 1,000 units the deposit is 0.1 HTR
    // This is in the place of 0.01 HTR to create 1.00 of a custom token.
    // The actual math for the UI value would be htrDeposit * 100 / (10^(2-DECIMAL_PLACES))
    // Since NFT have 0 for DECIMAL_PLACES we get htrDeposit * 100/100 which is htrDeposit
    const htrDeposit = this.props.wallet.storage.getTokenDepositPercentage();
    const depositAmount = hathorLib.tokensUtils.getDepositAmount(this.state.amount, htrDeposit);
    const nftFee = hathorLib.numberUtils.prettyValue(tokens.getNFTFee());

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">Create NFT</h3>
        <p className="mt-5">{t`Here you will create a new NFT. After the creation, you will be able to send the units of this NFT to other addresses.`}</p>
        <p>{t`NFTs share the address space with all other tokens, including HTR. This means that you can send and receive tokens using any valid address.`}</p>
        <p>{t`Remember to make a backup of your new token's configuration string. You will need to send it to other people to allow them to use your NFT.`}</p>
        <p>
          {str2jsx(
            t`When creating and minting NFTs, a |bold:deposit of ${htrDeposit}%| in HTR is required and an additional |bold:fee of ${nftFee} HTR|. If these tokens are later melted, this HTR deposit will be returned (depending on the amount melted) and the fee will never be returned. Read more about the NFT standard |link:here|.`,
            {
              bold: (x, i) => <strong key={i}>{x}</strong>,
              link: (x, i) => <a key={i} href="true" onClick={this.goToRFC}>{x}</a>,
            }
          )}
        </p>
        <p>
          {str2jsx(
            t`The most common usage for an NFT is to represent a digital asset. Please see |link:this guide| that explains how to create an NFT data (including suggestions on how to upload files to the IPFS network) in the Hathor standard in order to be able to show your asset in our explorer.`,
            {
              link: (x, i) => <a key={i} href="true" onClick={this.goToNFTGuide}>{x}</a>,
            }
          )}
        </p>
        <hr className="mb-5 mt-5"/>
        <form ref={this.formCreateNFTRef} id="formCreateNFT">
          <div className="row">
            <div className="form-group col-9">
              <label>{t`NFT Data`}</label>
              <input required ref={this.nftDataRef} placeholder={t`ipfs://...`} type="text" className="form-control" maxLength={NFT_DATA_MAX_SIZE} />
              <small id="nftDataHelp" className="form-text text-muted">String that uniquely identify your NFT. For example, the IPFS link to your metadata file, a URI to your asset or any string. Max size: {NFT_DATA_MAX_SIZE} characters.</small>
            </div>
          </div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Short name`}</label>
              <input required ref={this.nameRef} placeholder={t`MyCoin`} type="text" className="form-control" />
            </div>
            <div className="form-group col-3">
              <label>{t`Symbol`}</label>
              <input required ref={this.symbolRef} placeholder={t`MYC (2-5 characters)`} type="text" minLength={2} maxLength={5} className="form-control" />
            </div>
          </div>
          <div className="row">
            <div className="form-group col-4">
              <label>{t`Amount`}</label>
              <InputNumber required className="form-control" precision={0} placeholder="How many NFT units to create" onValueChange={this.onAmountChange} />
            </div>
            <div className="form-group d-flex flex-row align-items-center address-checkbox">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.autoselectAddressRef} id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
                <label className="form-check-label" htmlFor="autoselectAddress">
                  {t`Select address automatically`}
                </label>
              </div>
            </div>
            <div className="form-group col-5" ref={this.addressDivRef} style={{display: 'none'}}>
              <label>{t`Destination address`}</label>
              <input ref={this.addressRef} type="text" placeholder={t`Address`} className="form-control" />
            </div>
          </div>
          <div className="row mt-3">
            <div className="form-group d-flex flex-row align-items-center create-mint-checkbox col-5">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.createMintAuthorityRef} id="createMintAuthority" defaultChecked={false} />
                <label className="form-check-label" htmlFor="createMintAuthority">
                  {t`Create a mint authority`}<small id="createMintHelp" className="form-text text-muted">If you want to be able to mint more units of this NFT.</small>
                </label>
              </div>
            </div>
            <div className="form-group d-flex flex-row align-items-center create-melt-checkbox col-4">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.createMeltAuthorityRef} id="createMeltAuthority" defaultChecked={false} />
                <label className="form-check-label" htmlFor="createMeltAuthority">
                  {t`Create a melt authority`}<small id="createMeltHelp" className="form-text text-muted">If you want to be able to melt units of this NFT.</small>
                </label>
              </div>
            </div>
          </div>
          <hr className="mb-5 mt-5"/>
          <p><strong>HTR available:</strong> {hathorLib.numberUtils.prettyValue(this.props.htrBalance)} HTR</p>
          <p><strong>Deposit:</strong> {hathorLib.numberUtils.prettyValue(depositAmount)} HTR</p>
          <p><strong>Fee:</strong> {nftFee} HTR</p>
          <p><strong>Total:</strong> {hathorLib.numberUtils.prettyValue(tokens.getNFTFee() + depositAmount)} HTR</p>
          <button type="button" className="mt-3 btn btn-hathor" onClick={this.onClickCreate}>Create</button>
        </form>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateNFT);
