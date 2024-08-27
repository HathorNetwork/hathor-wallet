/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from 'ttag'
import ReactLoading from 'react-loading';
import colors from '../../index.module.scss';
import hathorLib from '@hathor/wallet-lib';
import { useDispatch } from 'react-redux';
import { NANO_CONTRACT_HISTORY_COUNT } from '../../constants';
import TokenPagination from '../TokenPagination';
import { reverse } from 'lodash';


/**
 * History of a nano contract
 *
 * @memberof Components
 */
function NanoContractHistory(props) {
  const dispatch = useDispatch();

  // loading {boolean} Bool to show/hide loading element
  const [loading, setLoading] = useState(true);
  // history {Array} Nano contract history
  const [history, setHistory] = useState([]);
  // errorMessage {string} Message to show when error happens on history load
  const [errorMessage, setErrorMessage] = useState('');
  // hasBefore {boolean} If 'Previous' button should be enabled 
  const [hasBefore, setHasBefore] = useState(false);
  // hasAfter {boolean} If 'Next' button should be enabled 
  const [hasAfter, setHasAfter] = useState(false);

  useEffect(() => {
    loadData(null, null);
  }, []);

  const loadData = async (after, before) => {
    try {
      const historyData = await hathorLib.ncApi.getNanoContractHistory(
        props.ncId,
        NANO_CONTRACT_HISTORY_COUNT,
        after,
        before
      );

      if (before) {
        // When we are querying the previous set of transactions
        // the API return the oldest first, so we need to revert the history
        reverse(historyData.history);
      }
      setHistory(historyData.history);

      if (!after && !before) {
        // This is the first load without query params, so if has_more === true
        // we must enable next button
        setHasAfter(historyData.has_more);
        setHasBefore(false);
        return;
      }

      if (after) {
        // We clicked the next button, so we have before page
        // and we will have the next page if has_more === true
        setHasAfter(historyData.has_more);
        setHasBefore(true);
        return;
      }

      if (before) {
        // We clicked the previous button, so we have next page
        // and we will have the previous page if has_more === true
        setHasAfter(true);
        setHasBefore(historyData.has_more);
        return;
      }
    } catch(e) {
      // Error in request
      setErrorMessage(t`Error getting nano contract history.`);
    } finally {
      setLoading(false);
    };
  }

  /**
   * Called when user clicks 'Next' pagination button
   *
   * @param {Object} e Event emitted when button is clicked
   */
  const nextClicked = async (e) => {
    e.preventDefault();
    // Get last element of history that will be used
    // as after in the request
    const after = history.slice(-1).pop()
    loadData(after.hash, null);
  }

  /**
   * Called when user clicks 'Previous' pagination button
   *
   * @param {Object} e Event emitted when button is clicked
   */
  const previousClicked = (e) => {
    e.preventDefault();
    if (history.length === 0) {
      // This should never happen
      return;
    }
    const before = history[0];
    loadData(null, before.hash);
  }

  const renderHistoryData = () => {
    return history.map((tx) => {
      let status = '';
      if (tx.is_voided) {
        status = 'Voided';
      } else {
        if (tx.first_block) {
          status = 'Executed';
        } else {
          status = 'Pending'
        }
      }

      return (
        <tr key={tx.hash}>
          <td>{hathorLib.dateFormatter.parseTimestamp(tx.timestamp)}</td>
          <td>
            <Link to={`/transaction/${tx.hash}`}>{hathorLib.helpersUtils.getShortHash(tx.hash)}</Link>
          </td>
          <td>{tx.nc_method}</td>
          <td>{status}</td>
        </tr>
      );
    });
  }

  const renderHistory = () => {
    return (
      <div className="table-responsive">
        <table className="table table-striped" id="nano-history">
          <thead>
            <tr>
              <th>{t`Date`}</th>
              <th>{t`ID`}</th>
              <th>{t`Method`}</th>
              <th>{t`Status`}</th>
            </tr>
          </thead>
          <tbody>
            { renderHistoryData() }
          </tbody>
        </table>
        <TokenPagination
          history={history}
          hasBefore={hasBefore}
          hasAfter={hasAfter}
          nextClicked={nextClicked}
          previousClicked={previousClicked}
        />
      </div>
    );
  }

  return (
    <div className="d-flex flex-row justify-content-center mt-5">
      {renderHistory()}
    </div>
  );
}

export default NanoContractHistory;