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


/**
 * History of a nano contract
 *
 * @memberof Screens
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

      setLoading(false);
      if (historyData.history.length === 0) {
        // XXX
        // The hathor-core API does not return if it has more or not, so if the last page
        // has exactly the number of elements of the list, we need to fetch another page
        // to understand that the previous was the final one. In that case, we just
        // return without updating the state
        return;
      }
      setHistory(historyData.history);
      if (historyData.history.length < NANO_CONTRACT_HISTORY_COUNT) {
        // This was the last page
        if (!after && !before) {
          // This is the first load, so we do nothing because
          // previous and next are already disabled
          return;
        }

        if (after) {
          setHasAfter(false);
          setHasBefore(true);
          return;
        }

        if (before) {
          setHasAfter(true);
          setHasBefore(false);
          return;
        }
      } else {
        // This is not the last page
        if (!after && !before) {
          // This is the first load, so we need to
          // enable only the next button
          setHasAfter(true);
          setHasBefore(false);
          return;
        }

        // In all other cases, we must enable both buttons
        // because this is not the last page
        setHasAfter(true);
        setHasBefore(true);
      }
    } catch(e) {
      // Error in request
      setLoading(false);
      setErrorMessage(t`Error getting nano contract history.`);
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