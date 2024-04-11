/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef } from 'react';
import { t } from 'ttag'
import HathorPaginate from '../components/HathorPaginate';
import HathorAlert from '../components/HathorAlert';
import { WALLET_HISTORY_COUNT } from '../constants';
import helpers from '../utils/helpers';
import walletUtils from '../utils/wallet';
import path from 'path';
import { getGlobalWallet } from "../services/wallet.singleton";

/**
 * Screen that has a list of addresses of the wallet
 *
 * @memberof Screens
 */
function AddressList() {
  const wallet = getGlobalWallet();

  const alertErrorRef = useRef(null);
  const txSearchRef = useRef(null);

  /* addresses {Array} All wallet addresses data {'address', 'index', 'numberOfTransactions'} */
  const [addresses, setAddresses] = useState([]);
  /* filteredAddresses {Array} addresses state after search */
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  /* page: {Number} Current page of the list */
  const [page, setPage] = useState(1);
  /* totalPages: {Number} Total number of pages of the list */
  const [totalPages, setTotalPages] = useState(0);
  /* filtered: {Boolean} If the list is filtered */
  const [filtered, setFiltered] = useState(false);

  /**
   * Return total number of pages of the list
   *
   * @param {Array} array Array of addresses of the list
   *
   * @return {Number} Total number of pages of the list
   */
  const getTotalPages = (array) => {
    return Math.ceil(array.length / WALLET_HISTORY_COUNT);
  }

  useEffect(() => {
    /* useEffect callback cannot be async, so we create a function to do the asynchronous work inside it
     * @see https://devtrium.com/posts/async-functions-useeffect#write-the-asynchronous-function-inside-the-useeffect
     */
    const fetchAddresses = async () => {
      const fetchedAddresses = [];
      const iterator = wallet.getAllAddresses();
      for (;;) {
        const addressObj = await iterator.next();
        const { value, done } = addressObj;

        if (done) {
          break;
        }

        fetchedAddresses.push(value);
      }

      setAddresses(fetchedAddresses);
      setFilteredAddresses(fetchedAddresses);
      setTotalPages(getTotalPages(fetchedAddresses));
    }

    fetchAddresses();
  }, []);

  /**
   * Event received from pagination component after a page button in clicked
   *
   * @param data {Object} Data with clicked page {'selected'}
   */
  const handlePageClick = (data) => {
    const page = data.selected + 1;
    setPage(page);
  }

  /**
   * Called to execute search when user typed 'Enter' or clicked the icon
   */
  const search = () => {
    const text = txSearchRef.current.value;
    if (text) {
      if (walletUtils.validateAddress(text)) {
        for (const addr of addresses) {
          if (addr.address === text) {
            setFiltered(true);
            setFilteredAddresses([addr]);
            setTotalPages(1);
            setPage(1);
            return;
          }
        }
        setFiltered(true);
        setFilteredAddresses([]);
        setTotalPages(1);
        setPage(1);
      } else {
        // Invalid address
        alertErrorRef.current.show(3000);
      }
    } else {
      if (filtered) {
        // Was filtered, so now we need to reset data
        setFiltered(false);
        setFilteredAddresses(addresses);
        setTotalPages(getTotalPages(addresses));
        setPage(1);
      }
    }
  }

  /**
   * Called when user types something, so we can capture the 'Enter' and execute search
   *
   * @param {Object} e Event emitted when typing
   */
  const handleKeyUp = (e) => {
    if (e.key === 'Enter') {
      search();
    }
  }

  /**
   * Method called when user clicked on address in the list
   * Go to explorer address search page
   *
   * @param {Object} e Event for the click
   * @param {String} address Address to see page on explorer
   */
  const goToAddressSearch = (e, address) => {
    e.preventDefault();
    const url = path.join(helpers.getExplorerURL(), `address/${address}`);
    helpers.openExternalURL(url);
  }

  const loadPagination = () => {
    if (addresses.length === 0 || totalPages === 1) {
      return null;
    } else {
      return (
        <HathorPaginate pageCount={totalPages}
          onPageChange={handlePageClick} />
      );
    }
  }

  const renderSearch = () => {
    return (
      <div className="d-flex flex-row align-items-center col-12 col-md-6">
        <input className="form-control mr-2" type="search" placeholder={t`Search address`} aria-label="Search" ref={txSearchRef} onKeyUp={handleKeyUp} />
        <i className="fa fa-search pointer" onClick={search}></i>
      </div>
    );
  }

  const renderData = () => {
    const startIndex = (page - 1) * WALLET_HISTORY_COUNT;
    const endIndex = startIndex + WALLET_HISTORY_COUNT;
    return filteredAddresses.slice(startIndex, endIndex).map((addressObj) => {
      return (
        <tr key={addressObj.address}>
          <td><a href="true" onClick={(e) => goToAddressSearch(e, addressObj.address)}>{addressObj.address}</a></td>
          <td>{addressObj.index}</td>
          <td className="number">{addressObj.transactions}</td>
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
      <HathorAlert ref={alertErrorRef} text="Invalid address" type="danger" />
    </div>
  );
};

export default AddressList;
