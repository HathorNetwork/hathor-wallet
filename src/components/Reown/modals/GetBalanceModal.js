/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { DAppInfo } from '../DAppInfo';
import hathorLib from '@hathor/wallet-lib';

export function GetBalanceModal({ data, onAccept, onReject }) {
  const formatBalance = (balance) => {
    // Use 2 decimal places as default for formatting
    // HTR token uses 2 decimal places
    if (typeof balance === 'bigint') {
      return hathorLib.numberUtils.prettyValue(balance, 2);
    }
    return hathorLib.numberUtils.prettyValue(balance, 2);
  };

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`Get Balance Request`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <DAppInfo dapp={data.dapp} />
        <p>{t`The dApp is requesting access to the balance of the following tokens:`}</p>
        <div className="bg-light p-3 rounded">
          {data.data && data.data.length > 0 ? (
            data.data.map((balanceObj, index) => (
              <div key={index} className="mb-3 pb-3 border-bottom">
                <div className="font-weight-bold mb-2">
                  {balanceObj.token?.name || t`Token ${index + 1}`} ({balanceObj.token?.symbol || ''})
                </div>
                <div className="small text-muted mb-2">
                  {t`Token ID:`} {balanceObj.token?.id || ''}
                </div>
                {balanceObj.balance && (
                  <div className="pl-3">
                    <div>{t`Available:`} {formatBalance(balanceObj.balance.unlocked)}</div>
                    <div>{t`Locked:`} {formatBalance(balanceObj.balance.locked)}</div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted">{t`No balance data available`}</p>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Allow`}</button>
      </div>
    </>
  );
}
