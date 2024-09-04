/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import ReactLoading from 'react-loading';
import { t } from 'ttag';
import TxData from '../components/TxData';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import { colors } from '../constants';
import helpers from '../utils/helpers';
// import path from 'path';
import { useNavigate, useParams } from 'react-router-dom';
import { getGlobalWallet } from "../modules/wallet";

/**
 * Shows the detail of a transaction or block
 *
 * @memberof Screens
 */
function TransactionDetail() {
  const wallet = getGlobalWallet();
  const navigate = useNavigate();
  const { id: txId } = useParams();

  /* transaction {Object} Loaded transaction */
  const [transaction, setTransaction] = useState(null);
  /* meta {Object} Metadata of loaded transaction received from the server */
  const [meta, setMeta] = useState(null);
  /* spentOutputs {Object} Spent outputs of loaded transaction received from the server */
  const [spentOutputs, setSpentOutputs] = useState(null);
  /* loaded {boolean} If had success loading transaction from the server */
  const [loaded, setLoaded] = useState(false);
  /* confirmationData {Object} Confirmation data of loaded transaction received from the server */
  const [confirmationData, setConfirmationData] = useState(null);
  const [confirmationDataError, setConfirmationDataError] = useState(false);
  const [isTxNotFound, setIsTxNotFound] = useState(false);

  /**
   * Get accumulated weight and confirmation level of the transaction
   */
  const getConfirmationData = async () => {
    setConfirmationData(null);
    setConfirmationDataError(false);

    try {
      const data = await wallet.getTxConfirmationData(txId);
      setConfirmationData(data);
      setConfirmationDataError(false);
    } catch(e) {
      setConfirmationData(null);
      setConfirmationDataError(true);
    }
  }

  /**
   * Get transaction in the server when mounting the page
   */
  const getTx = async () => {
    setLoaded(false);
    setTransaction(null);
    setMeta(null);
    setSpentOutputs(null);
    setIsTxNotFound(false);

    try {
      const data = await wallet.getFullTxById(txId);
      for (const output of data.tx.outputs) {
        if (!output.token) {
          if (output.token_data === 0) {
            output.token = hathorLib.constants.NATIVE_TOKEN_UID;
          } else {
            output.token = data.tx.tokens[(output.token_data & hathorLib.constants.TOKEN_INDEX_MASK) -1].uid;
          }
        }
      }

      for (const input of data.tx.inputs) {
        if (!input.token) {
          if (input.token_data === 0) {
            input.token = hathorLib.constants.NATIVE_TOKEN_UID;
          } else {
            input.token = data.tx.tokens[(input.token_data & hathorLib.constants.TOKEN_INDEX_MASK) -1].uid;
          }
        }
      }

      if (!hathorLib.transactionUtils.isBlock(data.tx)) {
        await getConfirmationData();
      }

      setTransaction(data.tx);
      setMeta(data.meta);
      setSpentOutputs(data.spent_outputs);
      setLoaded(true);
      setIsTxNotFound(false);
    } catch(e) {
      let txNotFoundOnWallet = false;
      // Error in request
      if (e instanceof hathorLib.errors.TxNotFoundError) {
        txNotFoundOnWallet = true;
      }

      setLoaded(true);
      setTransaction(null)
      setIsTxNotFound(txNotFoundOnWallet);
    }
  }

  /**
   * Fetch tx data whenever the id is updated
   */
  useEffect(() => {
    getTx();
  }, [txId]);

  /**
   * Method called when user clicked on 'See on explorer' link
   *
   * @param {Object} e Event for the click
   */
  const goToExplorer = (e) => {
    e.preventDefault();
    // const url = path.join(helpers.getExplorerURL(), `transaction/${transaction.hash}`);
    const url = '';
    helpers.openExternalURL(url);
  }

  const renderTx = () => {
    return (
      <div>
        {renderLinks()}
        {transaction ? (
          <TxData
            key={transaction.hash}
            transaction={transaction}
            confirmationData={confirmationData}
            confirmationDataError={confirmationDataError}
            confirmationDataRetry={getConfirmationData}
            spentOutputs={spentOutputs}
            meta={meta}
            showRaw={true}
            showConflicts={true}
            showGraphs={true}
            history={navigate} />
        ) : (
          <p className="text-danger">
            {isTxNotFound ? (
              <>{t`Transaction with hash ${txId} not found`}.</>
            ) : (
              <>
                {t`Error retrieving transaction ${txId}`}.&nbsp;
                <a href="true" onClick={(e) => {
                  e.preventDefault();
                  getTx();
                }}>{t`Try again`}</a>
              </>
            )}
          </p>
        )}
      </div>
    );
  }

  const renderExplorerLink = () => {
    return (
      <div className="d-flex flex-row align-items-center mb-3 back-div">
        <a href="true" onClick={goToExplorer}>{t`See on explorer`}</a>
        <i className="fa fa-long-arrow-right ml-2" />
      </div>
    );
  }

  const renderLinks = () => {
    return (
      <div className="d-flex flex-row justify-content-between">
        <BackButton />
        {transaction && renderExplorerLink()}
      </div>
    );
  }

  return (
    <div className="flex align-items-center content-wrapper">
      {!loaded ? <ReactLoading type='spin' color={colors.purpleHathor} delay={500} /> : renderTx()}
    </div>
  );
}

export default TransactionDetail;
