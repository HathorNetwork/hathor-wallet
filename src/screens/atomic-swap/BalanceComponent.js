/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import helpers from '../../utils/helpers'
import { t } from "ttag";

/**
 * @param {PartialTx} partialTx
 * @param {HathorWallet} wallet
 * @param {DisplayBalance[]} balance
 */
export function BalanceComponent ({ partialTx, wallet, balance }) {
    const sendingBalances = balance.filter(b => b.sending > 0);
    const receivingBalances = balance.filter(b => b.receiving > 0);

    const renderRows = () => {
        const renderOne = (amount, symbol) => {
            if (!amount || !symbol) return '';
            return <span>{helpers.renderValue(amount)} <b>{symbol}</b></span>
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
