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
import { EXPLORER_BASE_URL, WALLET_HISTORY_COUNT } from '../constants';
import helpers from '../utils/helpers';
import path from 'path';

import hathorLib from '@hathor/wallet-lib';

/**
 * Screen that has a list of addresses of the wallet
 *
 * @memberof Screens
 */
class AddressList extends React.Component {
  /**
   * addresses {Array} All wallet addresses data {'address', 'index', 'numberOfTransactions'}
   * filteredAddresses {Array} addresses state after search
   * page: {Number} Current page of the list
   * totalPages: {Number} Total number of pages of the list
   * filtered: {Boolean} If the list is filtered
   * transactionsByAddress: {Object} Object with number of transactions for each address
   */
  state = {
    addresses: [],
    filteredAddresses: [],
    page: 1,
    totalPages: 0,
    filtered: false,
    transactionsByAddress: null,
  }

  componentDidMount = () => {
    const walletData = hathorLib.wallet.getWalletData();
    const addressKeys = walletData.keys;
    const addresses = [];
    const transactionsByAddress = {};
    for (const key in addressKeys) {
      const addressData = {
        address: key,
        index: addressKeys[key].index,
      };

      addresses.push(addressData);
      transactionsByAddress[key] = 0;
    }

    this.updateNumberOfTransactions(transactionsByAddress, walletData.historyTransactions);

    this.setState({ addresses, filteredAddresses: addresses, totalPages: this.getTotalPages(addresses), transactionsByAddress });
  }

  /**
   * Return total number of pages of the list
   *
   * @param {Array} array Array of addresses of the list
   *
   * @return {Number} Total number of pages of the list
   */
  getTotalPages = (array) => {
    return Math.ceil(array.length / WALLET_HISTORY_COUNT);
  }

  /**
   * Update number of transactions for each address
   *
   * @param {Object} addressData Transactions by address object {address1: 0, address2: 0}
   * @param {Object} historyTransactions History of transactions from the wallet data storage
   *
   * @return {Number} Total number of transactions using this address
   */
  updateNumberOfTransactions = (addressData, historyTransactions) => {
    for (const tx_id in historyTransactions) {
      const tx = historyTransactions[tx_id];
      let foundAddresses = [];
      for (const el of [...tx.outputs, ...tx.inputs]) {
        const address = el.decoded.address;
        if (address in addressData && !(address in foundAddresses)) {
          addressData[address] += 1;
          foundAddresses.push(address);
        }
      }
    }
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

  /**
   * Method called when user clicked on address in the list
   * Go to explorer address search page
   *
   * @param {Object} e Event for the click
   * @param {String} address Address to see page on explorer
   */
  goToAddressSearch = (e, address) => {
    e.preventDefault();
    const url = path.join(EXPLORER_BASE_URL, `address/${address}`);
    helpers.openExternalURL(url);
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
            <td><a href="true" onClick={(e) => this.goToAddressSearch(e, data.address)}>{data.address}</a></td>
            <td>{data.index}</td>
            <td className="number">{this.state.transactionsByAddress && this.state.transactionsByAddress[data.address]}</td>
          </tr>
        )
      });
    }

    return (
      <div className="content-wrapper">
        <div className="d-flex flex-column">
          <div className="d-flex flex-row justify-content-between">
            <h2>{t`Addresses`}</h2>
            {renderSearch()}
          </div>
          <div className="table-responsive">
            <table className="mt-3 table table-striped" id="address-list">
              <thead>
                <tr>
                  <th>{t`Address`}</th>
                  <th>{t`Index`}</th>
                  <th className="number">{t`Number of transactions`}</th>
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