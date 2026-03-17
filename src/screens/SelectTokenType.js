/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useNavigate } from 'react-router-dom';
import hathorLib from '@hathor/wallet-lib';
import BackButton from '../components/BackButton';
import helpers from '../utils/helpers';
import { TOKEN_FEE_RFC_URL } from '../constants';

const { TokenVersion } = hathorLib;

/**
 * Screen for selecting token type (Deposit or Fee) before creation
 *
 * @memberof Screens
 */
function SelectTokenType() {
  const navigate = useNavigate();

  const handleDepositClick = () => {
    navigate(`/create_token/${TokenVersion.DEPOSIT}`);
  };

  const handleFeeClick = () => {
    navigate(`/create_token/${TokenVersion.FEE}`);
  };

  const handleLearnMore = (e) => {
    e.preventDefault();
    helpers.openExternalURL(TOKEN_FEE_RFC_URL);
  };

  return (
    <div className="content-wrapper">
      <BackButton />
      <h1 className="mt-4 mb-4">{t`Create Token`}</h1>

      <p className="mb-2">{t`Choose how your token will behave for future transactions.`}</p>

      <p>
        <strong>{t`Once selected, the token type cannot be changed later.`}</strong>{' '}
        <a href="#" onClick={handleLearnMore}>
          {t`Learn more about deposits and fees here`} <i className="fa fa-external-link" aria-hidden="true"></i>
        </a>
      </p>

      <div className="d-flex mt-5" style={{ gap: '64px' }}>

        <div
          className="d-flex flex-column rounded p-4"
          style={{ backgroundColor: '#f7f7f7', width: '344px', gap: '40px' }}
        >
          <h5 className="font-weight-bold m-0" style={{ color: '#8C46FF', fontSize: '20px' }}>
            {t`Deposit Token:`}
          </h5>
          <div className="d-flex flex-column flex-grow-1 justify-content-between">
            <ul className="pl-4 mb-0" style={{ fontSize: '14px', lineHeight: '1.5' }}>
              <li>{t`Requires a 1% HTR deposit.`}</li>
              <li>{t`No transaction fees in future transfers.`}</li>
              <li>{t`Refundable if token is burned.`}</li>
            </ul>
            <p className="mb-0 mt-3 font-italic text-muted" style={{ fontSize: '14px' }}>
              {t`Recommended for frequent use.`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-hathor text-uppercase"
            style={{ width: '228px', padding: '16px', fontSize: '14px' }}
            onClick={handleDepositClick}
          >
            {t`Create Deposit Token`}
          </button>
        </div>

        <div
          className="d-flex flex-column rounded p-4"
          style={{ backgroundColor: '#f7f7f7', width: '344px', gap: '40px' }}
        >
          <h5 className="font-weight-bold m-0" style={{ color: '#8C46FF', fontSize: '20px' }}>
            {t`Fee Token:`}
          </h5>
          <div className="d-flex flex-column flex-grow-1 justify-content-between">
            <ul className="pl-4 mb-0" style={{ fontSize: '14px', lineHeight: '1.5' }}>
              <li>{t`Requires 0.01 HTR fee to create.`}</li>
              <li>{t`No deposit required.`}</li>
              <li>{t`A small fee applies to every transfer.`}</li>
            </ul>
            <p className="mb-0 mt-3 font-italic text-muted" style={{ fontSize: '14px' }}>
              {t`Recommended for occasional use.`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-hathor text-uppercase"
            style={{ width: '228px', padding: '16px', fontSize: '14px' }}
            onClick={handleFeeClick}
          >
            {t`Create Fee Token`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectTokenType;
