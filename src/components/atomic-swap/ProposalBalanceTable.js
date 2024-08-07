/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { t } from 'ttag';
import { numberUtils } from '@hathor/wallet-lib';
import { useSelector } from 'react-redux';

/**
 * @param {PartialTx} partialTx
 * @param {HathorWallet} wallet
 * @param {DisplayBalance[]} balance
 */
export function ProposalBalanceTable ({ partialTx, wallet, balance }) {
    const receivingBalances = balance.filter(b => b.receiving > 0);
    // If the wallet participates in the proposal with a token with zero balance, it is displayed as "sending"
    const sendingBalances = balance.filter(b => {
        return b.sending >= 0;
    });
    const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);

    const renderRows = () => {
        const renderOne = (amount, symbol) => {
            if (!amount && !symbol) {
                return '';
            }
            return <span>{numberUtils.prettyValue(amount, decimalPlaces)} <b>{symbol}</b></span>
        }

        if (sendingBalances.length === 0 && receivingBalances.length === 0) {
            return <tr className="text-center">
                <td colSpan="2" className="p-3"><i>This wallet is not participating in this proposal.</i></td>
            </tr>
        }

        const rows = [];
        for (let rowIndex = 0; rowIndex < Math.max(sendingBalances.length, receivingBalances.length); rowIndex++) {
            const sendAtIndex = sendingBalances[rowIndex] || {};
            const receiveAtIndex = receivingBalances[rowIndex] || {};

            let row = <tr key={rowIndex}>
                <td className="text-left">
                    {renderOne(sendAtIndex.sending,sendAtIndex.symbol)}
                </td>
                <td className="text-right">
                    {renderOne(receiveAtIndex.receiving,receiveAtIndex.symbol)}
                </td>
            </tr>
            rows.push(row);
        }
        return rows;
    }

    return <table className="table table-sm table-bordered col-3">
        <thead>
        <tr>
            <td className="text-left">{t`Sending`}</td>
            <td className="text-right">{t`Receiving`}</td>
        </tr>
        </thead>
        <tbody>
            {renderRows()}
        </tbody>
    </table>
}
