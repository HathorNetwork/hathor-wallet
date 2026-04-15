/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { t } from 'ttag';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import { GlobalModalContext, MODAL_TYPES } from './GlobalModal';
import { tokenRegisterRequested } from '../actions/index';
import { getGlobalWallet } from '../modules/wallet';
import walletUtils from '../utils/wallet';
import { colors } from '../constants';

/**
 * States the modal can be in.
 * @enum {string}
 */
const MODAL_STATE = {
  LOADING: 'loading',
  EMPTY: 'empty',
  SELECTION: 'selection',
  CONFIRMATION: 'confirmation',
  REGISTERING: 'registering',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Truncates a token UID showing the first 6 and last 6 characters.
 * @param {string} uid
 * @returns {string}
 */
function truncateUid(uid) {
  if (uid.length <= 15) return uid;
  return `${uid.slice(0, 6)}...${uid.slice(-6)}`;
}

/**
 * Modal component for importing unknown tokens into the wallet.
 *
 * Shows a list of tokens found on the user's addresses that are not yet
 * registered. The user can select which tokens to register.
 *
 * States:
 * 1. Loading: Fetching token metadata (name, symbol) from the fullnode.
 * 2. Selection: Token list with checkboxes; user picks which to import.
 * 3. Registering: Dispatching registration actions, spinner shown.
 * 4. Success: Brief confirmation message, auto-closes after 2 seconds.
 * 5. Error: Shows which tokens failed, with a Retry button.
 *
 * @memberof Components
 */
export default function ModalTokenImport({ unknownTokens, hasHiddenZeroBalanceTokens, onClose, manageDomLifecycle }) {
  const dispatch = useDispatch();
  const context = useContext(GlobalModalContext);

  const explorerUrl = useSelector((state) => state.networkSettings.data.explorer);
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);

  // Current modal state
  const [modalState, setModalState] = useState(MODAL_STATE.LOADING);

  // Map of uid -> { uid, name, symbol, balance, selected } for all resolved tokens
  const [tokenDetails, setTokenDetails] = useState({});

  const selectedUids = Object.keys(tokenDetails).filter((uid) => tokenDetails[uid].selected);
  const allSelected = selectedUids.length > 0 && selectedUids.length === Object.keys(tokenDetails).length;

  // Map of uid -> error message for tokens that failed registration
  const [failedTokens, setFailedTokens] = useState({});

  // Number of tokens whose metadata could not be fetched (e.g. 429 / network error)
  const [fetchErrorCount, setFetchErrorCount] = useState(0);

  /**
   * On mount, bootstrap the modal DOM lifecycle and fetch token details
   * for every unknown token.
   */
  useEffect(() => {
    manageDomLifecycle('#tokenImportModal');
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchDetails(unknownTokens, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [unknownTokens]);

  async function fetchDetails(tokens, isCancelled) {
    const wallet = getGlobalWallet();
    const details = {};
    let errorCount = 0;

    const makeEntry = (uid, name, symbol, balance) => ({
      uid, name, symbol, balance, selected: false,
    });

    for (const token of tokens) {

      try {
        // Try storage first (populated during tx processing, no API call)
        const tokenData = await wallet.storage.getToken(token.uid);
        if (tokenData?.name && tokenData?.symbol) {
          details[token.uid] = makeEntry(token.uid, tokenData.name, tokenData.symbol, token.balance);
          continue;
        }
      } catch (_err) {
        // Fallback: use uid as name and ??? as symbol
        details[token.uid] = makeEntry(token.uid, token.uid, '???', token.balance);
        errorCount += 1;
        console.error(_err);
      }
    }

    if (isCancelled()) return;

    setTokenDetails(details);
    setFetchErrorCount(errorCount);
    if (Object.keys(details).length === 0) {
      setModalState(MODAL_STATE.EMPTY);
    } else {
      setModalState(MODAL_STATE.SELECTION);
    }
  }

  /**
   * Toggle an individual token's selection.
   * @param {string} uid
   */
  const toggleToken = (uid) => {
    setTokenDetails((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], selected: !prev[uid].selected },
    }));
  };

  /**
   * Toggle all tokens selected / deselected.
   */
  const toggleAll = () => {
    setTokenDetails((prev) => {
      const newSelected = !Object.values(prev).every((t) => t.selected);
      const next = {};
      for (const [uid, token] of Object.entries(prev)) {
        next[uid] = { ...token, selected: newSelected };
      }
      return next;
    });
  };

  /**
   * Dispatch tokenRegisterRequested for a list of token uids, tracking
   * resolve/reject via callbacks.
   * @param {string[]} uids
   */
  const dispatchRegistrations = (uids) => {
    setModalState(MODAL_STATE.REGISTERING);
    let completed = 0;
    const errors = {};

    uids.forEach((uid) => {
      dispatch(
        tokenRegisterRequested(uid, {
          alwaysShow: false,
          resolve: () => {
            completed += 1;
            if (completed === uids.length) {
              if (Object.keys(errors).length > 0) {
                setFailedTokens(errors);
                setModalState(MODAL_STATE.ERROR);
              } else {
                setModalState(MODAL_STATE.SUCCESS);
              }
            }
          },
          reject: (error) => {
            errors[uid] = error?.message || t`Unknown error`;
            completed += 1;
            if (completed === uids.length) {
              setFailedTokens(errors);
              setModalState(MODAL_STATE.ERROR);
            }
          },
        })
      );
    });
  };

  const handleContinue = () => {
    setModalState(MODAL_STATE.CONFIRMATION);
  };

  const handleBack = () => {
    setModalState(MODAL_STATE.SELECTION);
  };

  const handleConfirmImport = () => {
    dispatchRegistrations(selectedUids);
  };

  const handleRetry = () => {
    const uidsToRetry = Object.keys(failedTokens);
    setFailedTokens({});
    dispatchRegistrations(uidsToRetry);
  };

  /**
   * Auto-close the modal 2 seconds after entering success state.
   */
  useEffect(() => {
    if (modalState !== MODAL_STATE.SUCCESS) return;

    const timer = setTimeout(() => {
      context.hideModal();
    }, 2000);

    return () => clearTimeout(timer);
  }, [modalState]);

  /**
   * Format a balance value for display.
   * @param {{ available: BigInt, locked: BigInt }} balance
   * @param {string} symbol
   * @returns {string}
   */
  const formatBalance = (balance, symbol) => {
    // balance from fetchUnknownTokens may be wrapped: { status, data: { available, locked } }
    // or direct: { available, locked }
    const balanceData = balance.data || balance;
    const available = balanceData.available ?? 0n;
    const locked = balanceData.locked ?? 0n;
    const total = available + locked;
    return `${hathorLib.numberUtils.prettyValue(total, decimalPlaces)} ${symbol}`;
  };

  const renderZeroBalanceAlert = () => {
    if (!hasHiddenZeroBalanceTokens) return null;
    return (
      <div className="alert alert-warning py-2 px-3 mt-3" style={{ fontSize: 13 }}>
        {t`Some tokens are hidden because "hide zero-balance tokens" is enabled. You can change this on settings.`}
      </div>
    );
  };

  // -- Render helpers -------------------------------------------------------

  const renderLoading = () => (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <ReactLoading type='spin' width={24} height={24} color={colors.purpleHathor} delay={500} />
      <p className="mt-3 mb-0">{t`Loading token details...`}</p>
    </div>
  );

  const renderEmpty = () => (
    <div className="d-flex flex-column align-items-center py-4">
      <p className="mb-3 text-left w-100" style={{ fontSize: 14 }}>
        {t`We didn't find any unregistered tokens linked to your wallet.`}
      </p>
      <p className="mb-3 text-left w-100" style={{ fontSize: 14 }}>
        {t`You can register a new one manually.`}
      </p>
      {renderZeroBalanceAlert()}
      <a
        href="#"
        className="mt-3"
        style={{ color: '#8f37ff', fontSize: 14 }}
        onClick={(e) => {
          e.preventDefault();
          context.hideModal();
          context.showModal(MODAL_TYPES.MODAL_ADD_TOKEN, {});
        }}
      >
        {t`Register a token`}
      </a>
    </div>
  );

  const renderTokenRow = (uid) => {
    const token = tokenDetails[uid];
    if (!token) return null;

    const isDisabled = modalState === MODAL_STATE.REGISTERING;
    const explorerLink = `${explorerUrl}/token_detail/${uid}`;

    return (
      <div className="token-row" key={uid}>
        <div className="d-flex align-items-center">
          <input
            type="checkbox"
            className="mr-3"
            checked={token.selected}
            disabled={isDisabled}
            onChange={() => toggleToken(uid)}
            aria-label={`${token.name} (${token.symbol}) ${uid}`}
          />
          <div className="token-info">
            <span className="token-symbol-tag">{token.symbol}</span>
            <div className="token-details">
              <span className="token-name">{token.name}</span>
              <a
                className="token-uid"
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                title={uid}
              >
                {truncateUid(uid)} <i className="fa fa-external-link" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
        <span className="token-balance">{formatBalance(token.balance, token.symbol)}</span>
      </div>
    );
  };

  const renderSelection = () => {
    const tokenUids = unknownTokens.map((tk) => tk.uid);

    return (
      <>
        <p className="mb-3">{t`Select the tokens you want to add to your wallet.`}</p>
        {fetchErrorCount > 0 && (
          <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: 13 }}>
            <i className="fa fa-exclamation-triangle mr-1" />
            {t`Could not load details for ${fetchErrorCount} token(s). They are shown with partial information but can still be imported.`}
          </div>
        )}
        <div className="d-flex align-items-center mb-2 ml-1">
          <input
            type="checkbox"
            className="mr-2"
            checked={allSelected}
            onChange={toggleAll}
            aria-label={allSelected ? t`Deselect all` : t`Select all`}
          />
          <span className="font-weight-bold" style={{ fontSize: 13 }}>
            {allSelected ? t`Deselect all` : t`Select all`}
          </span>
        </div>
        <div className="token-list">
          {tokenUids.map((uid) => renderTokenRow(uid))}
        </div>
        {renderZeroBalanceAlert()}
        <div className="d-flex justify-content-center mt-4">
          <button
            className="btn btn-continue"
            disabled={selectedUids.length === 0}
            onClick={handleContinue}
          >
            {t`Continue`}
          </button>
        </div>
      </>
    );
  };

  const renderConfirmation = () => (
    <>
      <p className="mb-3">{t`You are about to add these tokens to your wallet:`}</p>
      <div className="token-list">
        {selectedUids.map((uid) => {
          const token = tokenDetails[uid];
          if (!token) return null;
          return (
            <div className="token-row" key={uid}>
              <div className="d-flex align-items-center">
                <div className="token-info">
                  <span className="token-symbol-tag">{token.symbol}</span>
                  <div className="token-details">
                    <span className="token-name">{token.name}</span>
                  </div>
                </div>
              </div>
              <span className="token-balance">{formatBalance(token.balance, token.symbol)}</span>
            </div>
          );
        })}
      </div>
      <div className="info-banner mt-3">
        <i className="fa fa-info-circle" style={{ fontSize: 16 }} />
        <span>{t`Only add tokens you recognize.`}</span>
      </div>
      <div className="d-flex justify-content-center align-items-center mt-4">
        <button
          className="btn btn-back"
          onClick={handleBack}
        >
          {t`Back`}
        </button>
        <button
          className="btn btn-continue"
          onClick={handleConfirmImport}
        >
          {t`Import tokens`}
        </button>
      </div>
    </>
  );

  const renderRegistering = () => {
    const tokenUids = unknownTokens.map((tk) => tk.uid);

    return (
      <>
        <p className="mb-3">{t`Registering selected tokens...`}</p>
        <div className="token-list">
          {tokenUids.filter((uid) => tokenDetails[uid]?.selected).map((uid) => renderTokenRow(uid))}
        </div>
        <div className="d-flex justify-content-center mt-4">
          <ReactLoading type='spin' width={24} height={24} color={colors.purpleHathor} delay={500} />
        </div>
      </>
    );
  };

  const renderSuccess = () => (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <i className="fa fa-check-circle text-success" style={{ fontSize: 48 }}></i>
      <p className="mt-3 mb-0">{t`New tokens added!`}</p>
    </div>
  );

  const renderError = () => {
    const failedUids = Object.keys(failedTokens);

    return (
      <>
        <p className="text-danger mb-3">{t`Some tokens failed to register:`}</p>
        <div className="token-list">
          {failedUids.map((uid) => {
            const token = tokenDetails[uid];
            const name = token ? token.name : uid;
            return (
              <div className="token-row" key={uid}>
                <div className="d-flex align-items-center">
                  <div className="token-info">
                    {token && <span className="token-symbol-tag">{token.symbol}</span>}
                    <div className="token-details">
                      <span className="token-name">{name}</span>
                      <span className="text-danger" style={{ fontSize: 12 }}>{failedTokens[uid]}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="d-flex justify-content-center mt-4">
          <button className="btn btn-continue" onClick={handleRetry}>
            {t`Retry`}
          </button>
        </div>
      </>
    );
  };

  const renderBody = () => {
    switch (modalState) {
      case MODAL_STATE.LOADING:
        return renderLoading();
      case MODAL_STATE.EMPTY:
        return renderEmpty();
      case MODAL_STATE.SELECTION:
        return renderSelection();
      case MODAL_STATE.CONFIRMATION:
        return renderConfirmation();
      case MODAL_STATE.REGISTERING:
        return renderRegistering();
      case MODAL_STATE.SUCCESS:
        return renderSuccess();
      case MODAL_STATE.ERROR:
        return renderError();
      default:
        return null;
    }
  };

  return (
    <div
      className="modal fade"
      id="tokenImportModal"
      tabIndex="-1"
      role="dialog"
      aria-labelledby="tokenImportModal"
      aria-hidden="true"
      data-backdrop="static"
      data-keyboard="false"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content modal-token-import">
          <div className="modal-header">
            <h5 className="modal-title">
              {modalState === MODAL_STATE.EMPTY && t`No tokens available to import`}
              {modalState === MODAL_STATE.CONFIRMATION && t`Confirm Import`}
              {modalState === MODAL_STATE.SUCCESS && t`Tokens added`}
              {(modalState === MODAL_STATE.LOADING
                || modalState === MODAL_STATE.SELECTION
                || modalState === MODAL_STATE.REGISTERING
                || modalState === MODAL_STATE.ERROR
              ) && `${t`Tokens found`} (${unknownTokens.length})`}
            </h5>
            <button
              type="button"
              className="close"
              data-dismiss="modal"
              aria-label={t`Close`}
              onClick={onClose}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {renderBody()}
          </div>
        </div>
      </div>
    </div>
  );
}
