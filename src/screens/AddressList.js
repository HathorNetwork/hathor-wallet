/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import HathorPaginate from '../components/HathorPaginate';
import HathorAlert from '../components/HathorAlert';
import { WALLET_HISTORY_COUNT } from '../constants';

import hathorLib from '@hathor/wallet-lib';

/**
 * Screen that has a list of addresses of the wallet
 *
 * @memberof Screens
 */
class AddressList extends React.Component {
  /**
   * addresses {Array} All wallet addresses data {'address', 'index', 'used'}
   * filteredAddresses {Array} addresses state after search
   * page: {Number} Current page of the list
   * totalPages: {Number} Total number of pages of the list
   * filtered: {Boolean} If the list is filtered
   */
  state = {
    addresses: [],
    filteredAddresses: [],
    page: 1,
    totalPages: 0,
    filtered: false,
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

    this.setState({ addresses, filteredAddresses: addresses, totalPages: this.getTotalPages(addresses) });
  }

  /**
   * Return total number of pages of the list
   *
   * @param {Array} Array of addresses of the list
   *
   * @return {Number} Total number of pages of the list
   */
  getTotalPages = (array) => {
    return Math.ceil(array.length / WALLET_HISTORY_COUNT);
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

  /**
   * Event received from pagination component after a page button in clicked
   *
   * @param data {Object} Data with clicked page {'selected'}
   */
  handlePageClick = (data) => {
    const page = data.selected + 1;
    this.setState({ page });
  }

  /**
   * Called when user types something, so we can capture the 'Enter' and execute search
   *
   * @param {Object} e Event emitted when typing
   */
  handleKeyUp = (e) => {
    if (e.key === 'Enter') {
      this.search();
    }
  }

  /**
   * Called to execute search when user typed 'Enter' or clicked the icon
   */
  search = () => {
    const text = this.refs.txSearch.value;
    if (text) {
      if (hathorLib.transaction.isAddressValid(text)) {
        for (const addr of this.state.addresses) {
          if (addr.address === text) {
            this.setState({ filtered: true, filteredAddresses: [addr], totalPages: 1, page: 1 });
            return
          }
        }
        this.setState({ filtered: true, filteredAddresses: [], totalPages: 1, page: 1 });
      } else {
        // Invalid address
        this.refs.alertError.show(3000);
      }
    } else {
      if (this.state.filtered) {
        // Was filtered, so now we need to reset data
        this.setState({ filtered: false, filteredAddresses: this.state.addresses, totalPages: this.getTotalPages(this.state.addresses), page: 1 });
      }
    }
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

    const renderSearch = () => {
      return (
        <div className="d-flex flex-row align-items-center col-12 col-md-6">
          <input className="form-control mr-2" type="search" placeholder={t`Search address`} aria-label="Search" ref="txSearch" onKeyUp={this.handleKeyUp} />
          <i className="fa fa-search pointer" onClick={this.search}></i>
        </div>
      );
    }

    const renderData = () => {
      const startIndex = (this.state.page - 1) * WALLET_HISTORY_COUNT;
      const endIndex = startIndex + WALLET_HISTORY_COUNT;
      return this.state.filteredAddresses.slice(startIndex, endIndex).map((data) => {
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
          <div className="d-flex flex-row justify-content-between">
            <h2>Addresses</h2>
            {renderSearch()}
          </div>
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
        <HathorAlert ref="alertError" text="Invalid address" type="danger" />
      </div>
    )
  }
}

export default AddressList;