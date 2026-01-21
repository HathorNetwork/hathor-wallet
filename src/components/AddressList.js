/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t } from 'ttag'
import HathorPaginate from '../components/HathorPaginate';
import HathorAlert from '../components/HathorAlert';
import { WALLET_HISTORY_COUNT } from '../constants';
import walletUtils from '../utils/wallet';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { getGlobalWallet } from '../modules/wallet';

/**
 * Screen that has a list of addresses of the wallet
 *
 * @param {Object} props
 * @param {number} props.count Quantity of elements to show in each page of the list
 * @param {(address: string) => void} props.onAddressClick Callback function to call when address is clicked
 * @param {boolean} props.showNumberOfTransactions Boolean to validate if should show the number of txs on the list
 * @param {boolean} props.isModal Boolean to set if the component will be used in a modal, to set the width of the search
 *
 * @memberof Screens
 */
function AddressList({ count, onAddressClick, showNumberOfTransaction, isModal }) {
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
  const getTotalPages = useCallback((array) => {
    return Math.ceil(array.length / count);
  }, [count]);

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
  }, [wallet, count, getTotalPages]);

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
    onAddressClick(address);
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
      <div className={`d-flex flex-row align-items-center ${isModal ? 'col-12' : 'col-6'}`}>
        <input className="form-control mr-2" type="search" placeholder={t`Search address`} aria-label="Search" ref={txSearchRef} onKeyUp={handleKeyUp} />
        <i className="fa fa-search pointer" onClick={search}></i>
      </div>
    );
  }

  const renderData = () => {
    const startIndex = (page - 1) * count;
    const endIndex = startIndex + count;
    return filteredAddresses.slice(startIndex, endIndex).map((addressObj) => {
      return (
        <tr key={addressObj.address}>
          <td><a href="true" onClick={(e) => goToAddressSearch(e, addressObj.address)}>{addressObj.address}</a></td>
          <td>{addressObj.index}</td>
          {showNumberOfTransaction && <td className="number">{addressObj.transactions}</td>}
        </tr>
      )
    });
  }

  return (
    <div className="d-flex flex-column">
      <div className="d-flex flex-row justify-content-end">
        {renderSearch()}
      </div>
      <div className="table-responsive">
        <table className="mt-3 table table-striped" id="address-list">
          <thead>
            <tr>
              <th>{t`Address`}</th>
              <th>{t`Index`}</th>
              {showNumberOfTransaction && <th className="number">{t`Number of transactions`}</th>}
            </tr>
          </thead>
          <tbody>
            {renderData()}
          </tbody>
        </table>
      </div>
      {loadPagination()}
      <HathorAlert ref={alertErrorRef} text="Invalid address" type="danger" />
    </div>
  )
}

/*
 * showNumberOfTransaction: If should show the column with number of transactions
 * onAddressClick: Method called when user clicks on the address
 * count: Quantity of elements in the list
 */
AddressList.propTypes = {
  showNumberOfTransaction: PropTypes.bool.isRequired,
  onAddressClick: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
};

export default AddressList;
