/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { types } from '../actions';
import BackButton from '../components/BackButton';

function ReownConnect() {
  const [uri, setUri] = useState('');
  const dispatch = useDispatch();
  const connectionFailed = useSelector(state => state.reown.connectionFailed);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({ type: types.REOWN_URI_INPUTTED, payload: uri });
  };

  return (
    <div className="content-wrapper">
      <BackButton />
      <div className="content">
        <div className="flex align-items-center mb-3">
          <h3 className="mr-3">{t`Connect to dApp`}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="uri">{t`Enter dApp URI`}</label>
            <input
              type="text"
              className="form-control"
              id="uri"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder={t`wc:...`}
            />
          </div>
          {connectionFailed && (
            <div className="alert alert-danger" role="alert">
              {t`Failed to connect. Please check the URI and try again.`}
            </div>
          )}
          <button type="submit" className="btn btn-hathor">{t`Connect`}</button>
        </form>
      </div>
    </div>
  );
}

export default ReownConnect; 