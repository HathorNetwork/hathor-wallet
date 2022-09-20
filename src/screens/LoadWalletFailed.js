/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';
import { str2jsx } from '../utils/i18n';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';

export default function LoadFailed(props) {
  const lastAction = useSelector((state) => state.startWalletAction);
  const dispatch = useDispatch();
  
  const retry = useCallback((e) => {
    e.preventDefault();
    dispatch(lastAction);
  }, [lastAction, dispatch]);

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="inside-div">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
          </div>
          <p style={{ marginTop: 48 }}>
            {str2jsx(t`There has been a problem loading your wallet, click |fn:here| to retry.`,
              {
                fn: (x, i) => <a key={i} onClick={retry} href="true">{x}</a>
              }
            )}
          </p>
        </div>
        <InitialImages />
      </div>
    </div>
  );
}
