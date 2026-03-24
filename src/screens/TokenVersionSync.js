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
import SpanFmt from '../components/SpanFmt';
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
            <>
              <div className="mt-5 mb-4 d-flex flex-row align-items-center">
                <p className="mr-3 mb-0"><strong>{t`Syncing registered tokens...`}</strong></p>
                <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={0} />
              </div>
              <p>{t`Please wait while we sync your registered tokens data.`}</p>
              <p>{t`You will be automatically redirected to the wallet when we finish syncing.`}</p>
              <p><SpanFmt>{totalCount > 0
                ? t`**Tokens synced:** ${syncedCount} of ${totalCount}`
                : t`**Checking tokens...**`}</SpanFmt></p>
            </>
          )}

          {/* Failed state */}
          {isFailed && (
            <>
              <div className="mt-5 mb-4 d-flex flex-row align-items-center">
                <p className="mr-3 mb-0"><strong>{t`Token sync failed`}</strong></p>
                <i className="fa fa-exclamation-triangle text-warning" />
              </div>
              <p>{errorMessage}</p>
              <p>{t`Make sure you have a stable internet connection.`}</p>
              {failedTokens.length > 0 && (
                <>
                  <p><SpanFmt>{t`**Failed tokens:**`}</SpanFmt></p>
                  <ul className="list-unstyled ml-3">
                    {failedTokens.map((token) => (
                      <li key={token.uid} className="text-danger">
                        {token.name} ({token.symbol})
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-4">
                <button
                  className="btn btn-hathor"
                  onClick={handleRetry}
                >
                  <i className="fa fa-refresh mr-2" />
                  {t`Try Again`}
                </button>
              </div>
            </>
          )}

          {/* Idle or success state - show loading (should redirect soon) */}
          {!isSyncing && !isFailed && (
            <>
              <div className="mt-5 mb-4 d-flex flex-row align-items-center">
                <p className="mr-3 mb-0"><strong>{t`Preparing...`}</strong></p>
                <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={0} />
              </div>
            </>
          )}
        </div>
        <InitialImages />
      </div>
    </div>
  );
}

export default TokenVersionSync;
