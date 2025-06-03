/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useLocation } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { CreateNanoContractCreateTokenTxRequest } from '../components/Reown/CreateNanoContractCreateTokenTxRequest';

/**
 * Screen component for the Create Nano Contract and Token request
 * 
 * @memberof Screens
 */
export default function CreateNanoContractCreateTokenTxScreen() {
  const location = useLocation();
  const { createNanoContractCreateTokenTxRequest, onAccept, onReject } = location.state || {};

  return (
    <div className="content-wrapper">
      <div className="content-inner">
        <BackButton />
        <h4 className="mt-4 mb-4">{t`Create Nano Contract & Token`}</h4>
        <CreateNanoContractCreateTokenTxRequest 
          route={{
            params: {
              createNanoContractCreateTokenTxRequest,
              onAccept,
              onReject
            }
          }}
        />
      </div>
    </div>
  );
} 