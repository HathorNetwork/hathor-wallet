/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useContext } from 'react';
import { t } from 'ttag'

import SpanFmt from '../components/SpanFmt';
import HathorAlert from '../components/HathorAlert';
import BackButton from '../components/BackButton';
import { NFT_ENABLED } from '../constants';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { useSelector } from 'react-redux';
import LOCAL_STORE from '../storage';
import { useNavigate } from 'react-router-dom';

/**
 * Initial screen of custom tokens
 *
 * @memberof Screens
 */
function CustomTokens() {
  const context = useContext(GlobalModalContext);
  const alertSuccessRef = useRef(null);
  const navigate = useNavigate();
  const { tokensBalance } = useSelector(state => ({  tokensBalance: state.tokensBalance }));

  /**
   * Called when a new token was registered with success, then close the modal and show alert success
   */
  const newTokenSuccess = () => {
    context.hideModal();
    alertSuccessRef.current.show(1000);
  }

  /**
   * Triggered when user clicks to do the register a token, then opens the new token modal
   */
  const registerTokenClicked = () => {
    context.showModal(MODAL_TYPES.MODAL_ADD_TOKEN, {
      success: newTokenSuccess,
      tokensBalance: tokensBalance,
    });
  }

  /**
   * Triggered when user clicks to create a new token, then redirects to the screen
   */
  const createTokenClicked = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      context.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED);
    } else {
      navigate('/create_token/');
    }
  }

  /**
   * Triggered when user clicks on the Create NFT button
   */
  const createNFTClicked = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      context.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED);
    } else {
      navigate('/create_nft/');
    }
  }

  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4">{t`Custom Tokens`}</h3>
      <p className="mt-5">{t`You can create your own digital token with customized specifications on Hathor Network with only a few clicks. They will fully work under the same technical assumptions of high scalability and decentralized consensus of our native tokens. Custom tokens will always work independently of the price of the native token, and they can serve multiple purposes.`}</p>
      <p><SpanFmt>{t`Every custom token has a unique **Configuration String** which must be shared with all other people that will use the custom token.`}</SpanFmt></p>
      <p>{t`If you want to use a custom token that already exists, you need to register this token in your Hathor Wallet. For this, you will need the custom token's Configuration String, which you can get from the creators of the token.`}</p>
      <div className="d-flex flex-row align-items-center justify-content-center mt-5">
        <button className="btn btn-hathor mr-4" onClick={createTokenClicked}>{t`Create a new token`}</button>
        { NFT_ENABLED && <button className="btn btn-hathor mr-4" onClick={createNFTClicked}>{t`Create an NFT`}</button> }
        <button className="btn btn-hathor" onClick={registerTokenClicked}>{t`Register a token`}</button>
      </div>
      <HathorAlert ref={alertSuccessRef} text={t`Token registered with success!`} type="success" />
    </div>
  );
}

export default CustomTokens;
