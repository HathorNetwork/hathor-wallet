/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import HathorPaginate from '../components/HathorPaginate';
import { WALLET_HISTORY_COUNT } from '../constants';

import hathorLib from '@hathor/wallet-lib';

/**
 * Screen that has a list of addresses of the wallet
 *
 * @memberof Screens
 */
class AddressList extends React.Component {
  state = {
    addresses: [],
    page: 1,
    totalPages: 0,
  }

  componentDidMount = () => {
    const walletData = hathorLib.wallet.getWalletData();
    const addressKeys = walletData.keys;
    const addresses = [];
    for (const key in addressKeys) {
      const addressData = {
        address: key,
        index: addressKeys[key].index,
        used: this.addressUsed(key, walletData.historyTransactions)
      };

      addresses.push(addressData);
    }

    const totalPages = Math.ceil(addresses.length / WALLET_HISTORY_COUNT);

    this.setState({ addresses, totalPages });
  }

  addressUsed = (address, historyTransactions) => {
    for (const tx_id in historyTransactions) {
      for (const output of historyTransactions[tx_id].outputs) {
        if (output.decoded.address === address) {
          return true;
        }
      }
    }
    return false;
  }

  handlePageClick = (data) => {
    const page = data.selected + 1;
    this.setState({ page });
  }

  render() {
    const loadPagination = () => {
      if (this.state.addresses.length === 0 || this.state.totalPages === 1) {
        return null;
      } else {
        return (
          <HathorPaginate pageCount={this.state.totalPages}
            onPageChange={this.handlePageClick} />
        );
      }
    }

    const renderData = () => {
      const startIndex = (this.state.page - 1) * WALLET_HISTORY_COUNT;
      const endIndex = startIndex + WALLET_HISTORY_COUNT;
      return this.state.addresses.slice(startIndex, endIndex).map((data) => {
        return (
          <tr key={data.address}>
            <td>{data.address}</td>
            <td>{data.index}</td>
            <td>{data.used ? 'Yes' : ''}</td>
          </tr>
        )
      });
    }

    return (
      <div className="content-wrapper">
        <div className="d-flex flex-column">
          <h2>Addresses</h2>
          <div className="table-responsive">
            <table className="mt-3 table table-striped" id="wallet-history">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Index</th>
                  <th>Used</th>
                </tr>
              </thead>
              <tbody>
                {renderData()}
              </tbody>
            </table>
          </div>
          {loadPagination()}
        </div>
      </div>
    )
  }
}

export default AddressList;