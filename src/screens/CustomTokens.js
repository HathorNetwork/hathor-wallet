/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import SpanFmt from '../components/SpanFmt';
import HathorAlert from '../components/HathorAlert';
import BackButton from '../components/BackButton';
import { NFT_ENABLED } from '../constants';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { connect } from 'react-redux';
import LOCAL_STORE from '../storage';

/**
 * Maps redux state to instance props
 * @param state
 * @returns {{tokensBalance:Object}}
 */
const mapStateToProps = (state) => {
  return {
    tokensBalance: state.tokensBalance,
  };
};

/**
 * Initial screen of custom tokens
 *
 * @memberof Screens
 */
class CustomTokens extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.alertSuccessRef = React.createRef();
  }

  /**
   * Called when a new token was registered with success, then close the modal and show alert success
   */
  newTokenSuccess = () => {
    this.context.hideModal();
    this.alertSuccessRef.current.show(1000);
  }

  /**
   * Triggered when user clicks to do the register a token, then opens the new token modal
   */
  registerTokenClicked = () => {
    this.context.showModal(MODAL_TYPES.MODAL_ADD_TOKEN, {
      success: this.newTokenSuccess,
      tokensBalance: this.props.tokensBalance,
    });
  }

  /**
   * Triggered when user clicks to do the create a new token, then redirects to the screen
   */
  createTokenClicked = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      this.context.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED);
    } else {
      this.props.history.push('/create_token/');
    }
  }

  /**
   * Triggered when user clicks on the Create NFT button
   */
  createNFTClicked = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      this.context.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED);
    } else {
      this.props.history.push('/create_nft/');
    }
  }

  render() {
    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">{t`Custom Tokens`}</h3>
        <p className="mt-5">{t`You can create your own digital token with customized specifications on Hathor Network with only a few clicks. They will fully work under the same technical assumptions of high scalability and decentralized consensus of our native HTR tokens. Custom tokens will always work independently of the price of the native HTR token, and they can serve multiple purposes.`}</p>
        <p><SpanFmt>{t`Every custom token has a unique **Configuration String** which must be shared with all other people that will use the custom token.`}</SpanFmt></p>
        <p>{t`If you want to use a custom token that already exists, you need to register this token in your Hathor Wallet. For this, you will need the custom token's Configuration String, which you can get from the creators of the token.`}</p>
        <div className="d-flex flex-row align-items-center justify-content-center mt-5">
          <button className="btn btn-hathor mr-4" onClick={this.createTokenClicked}>{t`Create a new token`}</button>
          { NFT_ENABLED && <button className="btn btn-hathor mr-4" onClick={this.createNFTClicked}>{t`Create an NFT`}</button> }
          <button className="btn btn-hathor" onClick={this.registerTokenClicked}>{t`Register a token`}</button>
        </div>
        <HathorAlert ref={this.alertSuccessRef} text={t`Token registered with success!`} type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(CustomTokens);
