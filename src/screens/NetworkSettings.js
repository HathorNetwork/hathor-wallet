/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import walletUtils from '../utils/wallet';
import helpers from '../utils/helpers';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import {
  DEFAULT_SERVERS,
  DEFAULT_WALLET_SERVICE_SERVERS,
  DEFAULT_WALLET_SERVICE_WS_SERVERS,
  NETWORK_SETTINGS,
  NETWORK_SETTINGS_STATUS,
  colors
} from '../constants';
import { useDispatch, useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';
import { getGlobalWallet } from "../modules/wallet";
import { useNavigate } from 'react-router-dom';
import { networkSettingsRequestUpdate, setNetworkSettingsStatus } from "../actions";
import BackButton from '../components/BackButton';
import NetworkSettingsForm from '../components/NetworkSettingsForm';


/**
 * Screen to change the settings of the network the wallet is connected to.
 *
 * @memberof Screens
 */
function NetworkSettings(props) {
  // Only render the form with navigation/header
  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4 mb-4">{t`Network Settings`}</h3>
      <NetworkSettingsForm {...props} />
    </div>
  );
}

export default NetworkSettings;
