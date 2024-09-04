/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { t } from 'ttag';
import { walletConnectUriInputted } from '../../actions';
import { handleRpcRequest } from 'hathor-rpc-handler';

/**
 * Wallet Connect dashboard
 *
 * @memberof Screens
 */
function WalletConnect() {
  const dispatch = useDispatch();
  const [uri, setUri] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(uri);

    dispatch(walletConnectUriInputted(uri));
  };

  
  const handleInputChanged = (e) => {
    setUri(e.target.value);
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-column">
        <div className="mt-3">
          <form onSubmit={handleSubmit}>
            <label>
              {t`Connect URI`}
              <input
                placeholder={t`wc:97cda349ef42...`}
                type="text"
                value={uri}
                onChange={handleInputChanged}
              />
            </label>
            <input type="submit" value="Submit" />
          </form>
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;
