/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import HathorAlert from '../components/HathorAlert';
import walletApi from '../api/wallet';
import transaction from '../utils/transaction';
import { AddressError } from '../utils/errors';


/**
 * Component that shows a search input, when user can search for transaction/block ID or an address
 *
 * @memberof Components
 */
class SearchTx extends React.Component {
  /**
   * filtered {boolean} Saves if the list is already filtered
   */
  state = { filtered: false };

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
      const regex = /[A-Fa-f\d]{64}/g;
      if (regex.test(text)) {
        // Search for tx id
        this.props.history.push(`/transaction/${text}`);
      } else {
        // Search for address
        try {
          const addressBytes = transaction.decodeAddress(text);
          if (transaction.validateAddress(text, addressBytes)) {
            this.searchAddress(text);
          }
        } catch(e) {
          if (e instanceof AddressError) {
            this.showError();
          } else {
            // Unhandled error
            throw e;
          }
        }
      }
    } else {
      if (this.state.filtered) {
        // Was filtered, so now we need to reset data
        this.setState({ filtered: false });
        this.props.resetData();
      }
    }
  }

  /**
   * Called to execute the API request to the node that searches for an address
   *
   * @param {string} address Address to search for
   */
  searchAddress = (address) => {
    walletApi.getAddressHistory([address], (response) => {
      this.props.newData(response.history);
      this.setState({ filtered: true });
    });
  }

  /**
   * When search parameter is invalid shows an error alert
   */
  showError = () => {
    this.refs.alertError.show(3000);
  }

  render = () => {
    return (
      <div className="d-flex flex-row align-items-center search-div col-12 col-md-6">
        <input className="form-control mr-2" type="search" placeholder="Find transaction/block by hash or address" aria-label="Search" ref="txSearch" onKeyUp={this.handleKeyUp} />
        <i className="fa fa-search pointer" onClick={this.search}></i>
        <HathorAlert ref="alertError" text="Invalid address and hash format" type="danger" />
      </div>
    );
  }
}

export default SearchTx;
