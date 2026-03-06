/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import ReactLoading from 'react-loading';

import SpanFmt from '../components/SpanFmt';
import WalletHistory from '../components/WalletHistory';
import WalletBalance from '../components/WalletBalance';
import WalletAddress from '../components/WalletAddress';
import TokenGeneralInfo from '../components/TokenGeneralInfo';
import TokenAdministrative from '../components/TokenAdministrative';
import HathorAlert from '../components/HathorAlert';
import tokensUtils from '../utils/tokens';
import version from '../utils/version';
import walletUtils from '../utils/wallet';
import BackButton from '../components/BackButton';
import { colors } from '../constants';
import { TOKEN_DOWNLOAD_STATUS } from '../constants';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { tokenFetchBalanceRequested, tokenFetchHistoryRequested } from '../actions/index';
import LOCAL_STORE from '../storage';
import { useNavigate } from 'react-router-dom';
import { getGlobalWallet } from "../modules/wallet";


/**
 * Main screen of the wallet
 *
 * @memberof Screens
 */
function Wallet() {
  // Modal context
  const context = useContext(GlobalModalContext);

  // State
  /** backupDone {boolean} if words backup was already done */
  const [backupDone, setBackupDone] = useState(LOCAL_STORE.isBackupDone());
  /** successMessage {string} Message to be shown on alert success */
  const [successMessage, setSuccessMessage] = useState('');
  /* shouldShowAdministrativeTab {boolean} If we should display the Administrative Tools tab */
  const [shouldShowAdministrativeTab, setShouldShowAdministrativeTab] = useState(false);
  // XXX: There is an important `errorMessage` state that was not being set in the previous version
  // It should be set for both the tokenMetadata error handling ( that are currently ignored )
  // and the TokenGeneralInfo child component in a future moment
  const [totalSupply, setTotalSupply] = useState(null);
  const [canMint, setCanMint] = useState(false);
  const [canMelt, setCanMelt] = useState(false);
  const [transactionsCount, setTransactionsCount] = useState(null);
  const [mintCount, setMintCount] = useState(null);
  const [meltCount, setMeltCount] = useState(null);

  // Redux state
  const {
    selectedToken,
    tokensHistory,
    tokensBalance,
    tokenMetadata,
    tokens,
    walletState,
  } = useSelector((state) => {
    return {
      selectedToken: state.selectedToken,
      tokensHistory: state.tokensHistory,
      tokensBalance: state.tokensBalance,
      tokenMetadata: state.tokenMetadata || {},
      tokens: state.tokens,
      walletState: state.walletState,
    };
  });
  const wallet = getGlobalWallet();

  // Refs
  const alertSuccessRef = useRef(null);
  const unregisterModalRef = useRef(null);

  // Navigation and actions
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Initialize the screen on mount
  useEffect(() => {
    initializeWalletScreen();
  }, []);

  // Re-initialize the screen when the selected token changes
  useEffect(() => {
    initializeWalletScreen();
  }, [selectedToken]);

  // When the tokens history changes, update the token info
  useEffect(() => {
    updateTokenInfo(selectedToken);
    updateWalletInfo(selectedToken);
  }, [tokensHistory]);

  /**
   * Resets the state data and triggers token information requests
   */
  async function initializeWalletScreen() {
    // Reset the screen state
    setTotalSupply(null);
    setCanMint(false);
    setCanMelt(false);
    setTransactionsCount(null);
    setShouldShowAdministrativeTab(false);

    // No need to download token info and mint/melt info if the token is hathor
    if (selectedToken === hathorLib.constants.NATIVE_TOKEN_UID) {
      return;
    }

    // Fires the fetching of all token data
    calculateShouldShowAdministrativeTab(selectedToken);
    updateTokenInfo(selectedToken);
    updateWalletInfo(selectedToken);
  }

  /**
   * Update token state after didmount or props update
   * @param {string} tokenUid
   */
  const updateWalletInfo = async (tokenUid) => {
    const mintUtxos = await wallet.getMintAuthority(tokenUid, { many: true });
    const meltUtxos = await wallet.getMeltAuthority(tokenUid, { many: true });

    // If the user has changed the selectedToken while we were fetching the data, discard it
    if (selectedToken !== tokenUid) {
      return;
    }

    // Update the state with the new data
    const mintCount = mintUtxos.length;
    const meltCount = meltUtxos.length;
    setMintCount(mintCount);
    setMeltCount(meltCount);
  }

  /**
   * Fetches mint and melt data for a token
   * @param {string} tokenUid
   * @returns {Promise<void>}
   */
  async function updateTokenInfo(tokenUid) {
    // No need to fetch token info if the token is hathor
    if (tokenUid === hathorLib.constants.NATIVE_TOKEN_UID) {
      return;
    }
    const tokenDetails = await wallet.getTokenDetails(tokenUid);

    // If the user has changed the selectedToken while we were fetching the data, discard it
    if (selectedToken !== tokenUid) {
      return;
    }

    // Update the state with the new data
    const { totalSupply: newTotalSupply, totalTransactions, authorities } = tokenDetails;
    setTotalSupply(newTotalSupply);
    setCanMint(authorities.mint);
    setCanMelt(authorities.melt);
    setTransactionsCount(totalTransactions);
  }

  /**
   * We show the administrative tools tab only for the users that one day had an authority output, even if it was already spent
   *
   * This will set the shouldShowAdministrativeTab state param based on the response of getMintAuthority and getMeltAuthority
   */
  const calculateShouldShowAdministrativeTab = async (tokenId) => {
    const mintAuthorities = await wallet.getMintAuthority(tokenId, { skipSpent: false });

    if (mintAuthorities.length > 0) {
      return setShouldShowAdministrativeTab(true);
    }

    const meltAuthorities = await wallet.getMeltAuthority(tokenId, { skipSpent: false });

    if (meltAuthorities.length > 0) {
      return setShouldShowAdministrativeTab(true);
    }

    return setShouldShowAdministrativeTab(false);
  }

  /**
   * Triggered when user clicks to do the backup of words, then opens backup modal
   *
   * @param {Object} e Event emitted when user click
   */
  const backupClicked = (e) => {
    e.preventDefault();

    context.showModal(MODAL_TYPES.BACKUP_WORDS, {
      needPassword: true,
      validationSuccess: backupSuccess,
    });

    /**
     * Called when the backup of words was done with success, then close the modal and show alert success
     */
    function backupSuccess() {
      context.hideModal();
      LOCAL_STORE.markBackupDone();

      setBackupDone(true);
      setSuccessMessage(t`Backup completed!`);
      alertSuccessRef.current.show(3000);
    }
  }

  /**
   * Called when user clicks to unregister the token, then opens the modal
   */
  const unregisterClicked = () => {
    const tokenUid = selectedToken;
    const token = tokens.find((token) => token.uid === tokenUid);
    if (token === undefined) return;

    context.showModal(MODAL_TYPES.CONFIRM, {
      ref: unregisterModalRef,
      modalID: 'unregisterModal',
      title: t`Unregister token`,
      body: getUnregisterBody(),
      handleYes: unregisterConfirmed,
    });

    function getUnregisterBody() {
      return (
        <div>
          <p><SpanFmt>{t`Are you sure you want to unregister the token **${token.name} (${token.symbol})**?`}</SpanFmt></p>
          <p>{t`You won't lose your tokens, you just won't see this token on the side bar anymore.`}</p>
        </div>
      )
    }

    /**
     * When user confirms the unregistration of the token, hide the modal and execute it
     */
    async function unregisterConfirmed() {
      try {
        await tokensUtils.unregisterToken(tokenUid);
        walletUtils.setTokenAlwaysShow(tokenUid, false); // Remove this token from "always show"
        context.hideModal();
      } catch (e) {
        unregisterModalRef.current.updateErrorMessage(e.message);
      }
    }
  }

  /**
   * Called when user clicks to sign the token, then opens the modal
   */
  const signClicked = () => {
    // Can only sign on a hardware wallet on a version with custom tokens allowed
    if (!LOCAL_STORE.isHardwareWallet() || !version.isLedgerCustomTokenAllowed()) {
      return;
    }

    const token = tokens.find((token) => token.uid === selectedToken);
    context.showModal(MODAL_TYPES.LEDGER_SIGN_TOKEN, {
      token,
      modalId: 'signTokenDataModal',
      cb: () => () => {} // XXX: cb is a mandatory parameter for this modal
    })
  }

  /**
   * @deprecated This should be replaced by usage of `navigate()` inside the child component
   */
  const goToAllAddresses = () => {
    navigate('/addresses/');
  }

  /**
   * Retries the download of a single token's balance and history
   * @param {object} e Event
   * @param {string} tokenId
   */
  const retryDownloadClicked = (e, tokenId) => {
    e.preventDefault();
    const balanceStatus = get(
      tokensBalance,
      `${tokenId}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );
    const historyStatus = get(
      tokensHistory,
      `${tokenId}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );

    // We should only retry requests that have failed:
    if (historyStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      dispatch(tokenFetchHistoryRequested(tokenId));
    }
    if (balanceStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      dispatch(tokenFetchBalanceRequested(tokenId));
    }
  }

  // Rendering process below
  const token = tokens.find((token) => token.uid === selectedToken);
  const tokenHistory = get(tokensHistory, selectedToken, {
    status: TOKEN_DOWNLOAD_STATUS.LOADING,
    data: [],
  });
  const tokenBalance = get(tokensBalance, selectedToken, {
    status: TOKEN_DOWNLOAD_STATUS.LOADING,
    data: {
      available: 0n,
      locked: 0n,
    },
  });

  const renderBackupAlert = () => {
    return (
      <div className="alert alert-warning backup-alert" role="alert">
        { t`You haven't done the backup of your wallet yet. You should do it as soon as possible for your own safety.` }
        <a href="true" onClick={ (e) => backupClicked(e) }>{ t`Do it now` }</a>
      </div>
    )
  }

  const renderWallet = () => {
    return (
      <div>
        <div className="d-none d-sm-flex flex-row align-items-center justify-content-between">
          <div className="d-flex flex-column align-items-start justify-content-between">
            <WalletBalance key={selectedToken} />
          </div>
          <WalletAddress goToAllAddresses={goToAllAddresses} />
        </div>
        <div className="d-sm-none d-flex flex-column align-items-center justify-content-between">
          <div className="d-flex flex-column align-items-center justify-content-between">
            <WalletBalance key={selectedToken} />
            <div className="d-flex flex-row align-items-center">
            </div>
          </div>
          <WalletAddress goToAllAddresses={goToAllAddresses} />
        </div>
        <WalletHistory
          key={selectedToken}
          selectedToken={selectedToken} />
      </div>
    );
  }

  const renderTabAdmin = () => {
    if (!shouldShowAdministrativeTab) {
      return null;
    }

    return (
        <li className="nav-item">
          <a className="nav-link" id="administrative-tab" data-toggle="tab" href="#administrative" role="tab" aria-controls="administrative" aria-selected="false">{t`Administrative Tools`}</a>
      </li>
    );
  }

  const renderTokenData = (token) => {
    if (hathorLib.tokensUtils.isHathorToken(selectedToken)) {
      return renderWallet();
    }

    return (
      <div>
        <ul className="nav nav-tabs mb-4" id="tokenTab" role="tablist">
          <li className="nav-item">
            <a className="nav-link active" id="wallet-tab" data-toggle="tab" href="#wallet" role="tab"
               aria-controls="home" aria-selected="true">{t`Balance & History`}</a>
          </li>
          <li className="nav-item">
            <a className="nav-link" id="token-tab" data-toggle="tab" href="#token" role="tab" aria-controls="token"
               aria-selected="false">{t`About ${token.name}`}</a>
          </li>
          {renderTabAdmin()}
        </ul>
        <div className="tab-content" id="tokenTabContent">
          <div className="tab-pane fade show active" id="wallet" role="tabpanel" aria-labelledby="wallet-tab">
            {renderWallet()}
          </div>
          <div className="tab-pane fade" id="token" role="tabpanel" aria-labelledby="token-tab">
            <TokenGeneralInfo
              token={token}
              showConfigString={true}
              showAlwaysShowTokenCheckbox={true}
              totalSupply={totalSupply}
              canMint={canMint}
              canMelt={canMelt}
              transactionsCount={transactionsCount}
              tokenMetadata={tokenMetadata}
            />
          </div>
          {
            shouldShowAdministrativeTab && (
              <div className="tab-pane fade" id="administrative" role="tabpanel" aria-labelledby="administrative-tab">
                <TokenAdministrative
                  key={selectedToken}
                  token={token}
                  totalSupply={totalSupply}
                  canMint={canMint}
                  canMelt={canMelt}
                  mintCount={mintCount}
                  meltCount={meltCount}
                  tokenBalance={tokenBalance}
                  transactionsCount={transactionsCount}
                />
              </div>
            )
          }
        </div>
      </div>
    );
  }

  const renderSignTokenIcon = () => {
    // Don't show if it's HTR
    if (hathorLib.tokensUtils.isHathorToken(selectedToken)) return null;

    const signature = tokensUtils.getTokenSignature(selectedToken);
    // Show only if we don't have a signature on storage
    if (signature === null) return <i className="fa fa-key pointer ml-3" title={t`Sign token on Ledger`} onClick={signClicked}></i>
    return <i className="fa fa-check pointer ml-3" title={t`Token signed with Ledger`}></i>
  }

  const renderUnlockedWallet = () => {
    let template;
    /**
     * We only show the loading message if we are syncing the entire history
     * This will happen on the first history load and if we lose connection
     * to the fullnode.
     */
    if (walletState === hathorLib.HathorWallet.SYNCING) {
      template = (
        <div className='token-wrapper d-flex flex-column align-items-center justify-content-center mb-3'>
          <ReactLoading
            type='spin'
            width={48}
            height={48}
            color={colors.purpleHathor}
            delay={500}
          />
          <p style={{ marginTop: 16 }}><strong>{t`Loading token information, please wait...`}</strong></p>
        </div>
      )
    } else if (
      tokenHistory.status === TOKEN_DOWNLOAD_STATUS.FAILED
      || tokenBalance.status === TOKEN_DOWNLOAD_STATUS.FAILED) {
      template = (
        <div className='token-wrapper d-flex flex-column align-items-center justify-content-center mb-3'>
          <i style={{ fontSize: 36 }} className='fa fa-solid fa-exclamation-triangle text-error' title={t`Settings`}></i>
          <p style={{ marginTop: 16 }}>
            <strong>
              {t`Token load failed, please`}&nbsp;
              <a onClick={(e) => retryDownloadClicked(e, token.uid)} href="true">
                {t`try again`}
              </a>
              ...
            </strong>
          </p>

        </div>
      )
    } else {
      template = (
        <>
          <div className='token-wrapper d-flex flex-row align-items-center mb-3'>
            <p className='token-name mb-0'>
              <strong>{token ? token.name : ''}</strong>
              {!hathorLib.tokensUtils.isHathorToken(selectedToken) && <i className="fa fa-trash pointer ml-3" title={t`Unregister token`} onClick={unregisterClicked}></i>}
              {LOCAL_STORE.isHardwareWallet() && version.isLedgerCustomTokenAllowed() && renderSignTokenIcon()}
            </p>
          </div>
          {renderTokenData(token)}
        </>
      )
    }

    return (
      <div className='wallet-wrapper'>
      { template }
      </div>
    );
  }

  return (
    <div id="wallet-div">
      {!backupDone && renderBackupAlert()}
      <div className="content-wrapper">
      {/* This back button is not 100% perfect because when the user has just unlocked the wallet, it would go back to it when clicked
        * There is no easy way to get the previous path
        * I could use a lib (https://github.com/hinok/react-router-last-location)
        * Or handle it in our code, saving the last accessed screen
        * XXX Is it worth it to do anything about it just to prevent this case?
        */}
        <BackButton />
        {renderUnlockedWallet()}
      </div>
      <HathorAlert ref={alertSuccessRef} text={successMessage} type="success" />
    </div>
  );
}

export default Wallet;
