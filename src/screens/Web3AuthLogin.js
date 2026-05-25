/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { t } from 'ttag';
import {
  web3authLogin,
  derivePublicKey,
  persistWeb3AuthState,
  classifyWeb3AuthError,
  WEB3AUTH_ERROR_TYPES,
} from '../sagas/web3auth';
import { WEB3AUTH_CONFIG } from '../constants';
import LOCAL_STORE from '../storage';
import Web3AuthErrorDialog from '../components/Web3AuthErrorDialog';
import logo from '../assets/images/hathor-logo.png';
import googleLogo from '../assets/web3auth-providers/google.svg';
import appleLogo from '../assets/web3auth-providers/apple.svg';
import emailIcon from '../assets/web3auth-providers/email.svg';

/**
 * Choose a social provider to sign in via Web3Auth.
 *
 * Renders three provider cards — Google (active), Apple (active when
 * configured), Email (inert, wired in PR3) — followed by a divider and the
 * existing seed-words / new-wallet entry points.
 *
 * @memberof Screens
 */
function Web3AuthLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Read network straight from LOCAL_STORE — the Redux network slice is only
  // hydrated from localStorage after a wallet starts (App.js#loadStorageState),
  // so before login it still holds the mainnet default regardless of the user's
  // selection in NetworkSettingsRecovery.
  const persistedNetwork = LOCAL_STORE.getNetworkSettings()?.network || 'mainnet';
  const network = persistedNetwork;
  const cfg = WEB3AUTH_CONFIG[network] || WEB3AUTH_CONFIG.testnet;
  const appleEnabled = Boolean(cfg.appleClientId);

  const [errorType, setErrorType] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider) => {
    if (loading) return;
    setLoading(true);
    try {
      const { privateKey, email } = await web3authLogin(provider, network);
      const publicKey = derivePublicKey(privateKey);
      persistWeb3AuthState(dispatch, 'web3auth', email);
      navigate('/signin/', {
        state: { privateKey, publicKey, email, walletType: 'web3auth' },
      });
    } catch (err) {
      const type = classifyWeb3AuthError(err);
      // eslint-disable-next-line no-console
      console.error('[web3auth] login failed', { provider, network, type, err });
      if (type === WEB3AUTH_ERROR_TYPES.USER_CANCELLED) {
        // Silent: user closed the OAuth popup intentionally.
        return;
      }
      setErrorType(type);
    } finally {
      setLoading(false);
    }
  };

  const goToSeedImport = () => navigate('/wallet_type/');
  const goToNewWallet = () => navigate('/new_wallet/');

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="inside-div web3auth-login">
          <img className="hathor-logo" src={logo} alt="" />
          <h3 className="mt-4">{t`Sign in to Hathor`}</h3>

          <div className="web3auth-login__cards">
            <button
              className="web3auth-login__card"
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
            >
              <img src={googleLogo} alt="Google" className="web3auth-login__card-logo" />
              <span>{t`Continue with Google`}</span>
            </button>

            <button
              className="web3auth-login__card"
              type="button"
              onClick={() => appleEnabled && handleSocialLogin('apple')}
              disabled={!appleEnabled || loading}
              title={appleEnabled ? '' : t`Apple sign-in coming soon`}
            >
              <img src={appleLogo} alt="Apple" className="web3auth-login__card-logo" />
              <span>{t`Continue with Apple`}</span>
            </button>

            <button
              className="web3auth-login__card"
              type="button"
              disabled
              title={t`Email sign-in coming soon`}
            >
              <img src={emailIcon} alt="Email" className="web3auth-login__card-logo" />
              <span>{t`Continue with Email`}</span>
            </button>
          </div>

          <div className="web3auth-login__divider">
            <span>{t`OR`}</span>
          </div>

          <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-3">
            <button onClick={goToSeedImport} type="button" className="btn btn-hathor mr-3">
              {t`Import with seed words`}
            </button>
            <button onClick={goToNewWallet} type="button" className="btn btn-hathor">
              {t`New wallet`}
            </button>
          </div>
        </div>
      </div>

      {errorType && (
        <Web3AuthErrorDialog
          errorType={errorType}
          onRetry={() => {
            setErrorType(null);
          }}
          onCancel={() => setErrorType(null)}
        />
      )}
    </div>
  );
}

export default Web3AuthLogin;
