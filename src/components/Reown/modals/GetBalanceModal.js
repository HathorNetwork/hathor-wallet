/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useSelector } from 'react-redux';
import { DAppInfo } from '../DAppInfo';
import hathorLib from '@hathor/wallet-lib';
import helpers from '../../../utils/helpers';

export function GetBalanceModal({ data, onAccept, onReject }) {
  const { tokenMetadata, decimalPlaces } = useSelector((state) => ({
    tokenMetadata: state.tokenMetadata,
    decimalPlaces: state.serverInfo.decimalPlaces
  }));

  const formatBalance = (balance, tokenId) => {
    // Check if the token is an NFT using the helpers utility
    const isNFT = tokenId && helpers.isTokenNFT(tokenId, tokenMetadata);

    return hathorLib.numberUtils.prettyValue(balance, isNFT ? 0 : decimalPlaces);
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
          {data.data?.length > 0 ? (
            data.data.map((balanceObj, index) => {
              const tokenName = balanceObj.token?.name;
              return (
                <div key={index} className="mb-3 pb-3 border-bottom">
                  <div className="font-weight-bold mb-2">
                    {tokenName} ({balanceObj.token?.symbol || ''})
                  </div>
                  <div className="small text-muted mb-2">
                    {t`Token ID:`} {balanceObj.token?.id || ''}
                  </div>
                  {balanceObj.balance && (
                    <div className="mt-2">
                      <div className="small"><strong>{t`Available:`}</strong> {formatBalance(balanceObj.balance.unlocked, balanceObj.token?.id)}</div>
                      <div className="small"><strong>{t`Locked:`}</strong> {formatBalance(balanceObj.balance.locked, balanceObj.token?.id)}</div>
                    </div>
                  )}
                </div>
              );
            })
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
