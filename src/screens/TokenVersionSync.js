/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';
import ReactLoading from 'react-loading';
import { tokenVersionSyncRetry } from '../actions';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';
import { colors } from '../constants';

/**
 * Screen shown during token version sync at wallet startup.
 * Shows progress while syncing, error state with retry button if failed.
 *
 * This screen is BLOCKING - user cannot skip or dismiss it.
 * Sync is mandatory when fee-based-tokens feature flag is enabled.
 */
function TokenVersionSync() {
  const dispatch = useDispatch();
  const { failedTokens, errorMessage, status, syncedCount, totalCount } = useSelector(
    (state) => state.tokenVersionSync
  );

  const handleRetry = (e) => {
    e.preventDefault();
    dispatch(tokenVersionSyncRetry());
  };

  const isSyncing = status === 'syncing';
  const isFailed = status === 'failed';

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="inside-div">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
          </div>

          {/* Syncing state */}
          {isSyncing && (
            <div className="d-flex flex-column align-items-center mt-5">
              <ReactLoading
                type="spin"
                color={colors.purpleHathor}
                width={48}
                height={48}
                delay={500}
              />
              <h4 className="mt-4">{t`Syncing registered tokens data`}</h4>
              <p className="text-muted">
                {totalCount > 0
                  ? t`${syncedCount} of ${totalCount} tokens synced...`
                  : t`Checking tokens...`}
              </p>
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div className="d-flex flex-column align-items-center mt-4">
              <i className="fa fa-exclamation-triangle text-warning fa-3x mb-3" />

              <h4 className="mb-3">{t`Token Sync Failed`}</h4>

              <p className="text-muted mb-4 text-center">{errorMessage}</p>

              {failedTokens.length > 0 && (
                <div className="mb-4 text-center">
                  <p className="font-weight-bold">{t`Failed tokens:`}</p>
                  <ul className="list-unstyled">
                    {failedTokens.map((token) => (
                      <li key={token.uid} className="text-danger">
                        {token.name} ({token.symbol})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="btn btn-hathor"
                onClick={handleRetry}
              >
                <i className="fa fa-refresh mr-2" />
                {t`Try Again`}
              </button>

              <p className="mt-3 text-muted small">
                {t`Make sure you have a stable internet connection.`}
              </p>
            </div>
          )}

          {/* Idle or success state - show loading (should redirect soon) */}
          {!isSyncing && !isFailed && (
            <div className="d-flex flex-column align-items-center mt-5">
              <ReactLoading
                type="spin"
                color={colors.purpleHathor}
                width={48}
                height={48}
                delay={500}
              />
              <p className="text-muted mt-4">{t`Preparing...`}</p>
            </div>
          )}
        </div>
        <InitialImages />
      </div>
    </div>
  );
}

export default TokenVersionSync;
