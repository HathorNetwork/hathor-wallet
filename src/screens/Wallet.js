/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag';
import { get } from 'lodash';
import { connect } from "react-redux";
import ReactLoading from 'react-loading';

import SpanFmt from '../components/SpanFmt';
import WalletHistory from '../components/WalletHistory';
import WalletBalance from '../components/WalletBalance';
import WalletAddress from '../components/WalletAddress';
import TokenGeneralInfo from '../components/TokenGeneralInfo';
import TokenAdministrative from '../components/TokenAdministrative';
import HathorAlert from '../components/HathorAlert';
import tokens from '../utils/tokens';
import version from '../utils/version';
import wallet from '../utils/wallet';
import BackButton from '../components/BackButton';
import colors from '../index.scss';
import { TOKEN_DOWNLOAD_STATUS } from '../sagas/tokens';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import {
  updateWords,
  tokenFetchHistoryRequested,
  tokenFetchBalanceRequested,
} from '../actions/index';
import LOCAL_STORE from '../storage';


const mapDispatchToProps = dispatch => {
  return {
    updateWords: (data) => dispatch(updateWords(data)),
    getHistory: (tokenId) => dispatch(tokenFetchHistoryRequested(tokenId)),
    getBalance: (tokenId) => dispatch(tokenFetchBalanceRequested(tokenId)),
  };
};

const mapStateToProps = (state) => {
  return {
    selectedToken: state.selectedToken,
    tokensHistory: state.tokensHistory,
    tokensBalance: state.tokensBalance,
    tokenMetadata: state.tokenMetadata || {},
    tokens: state.tokens,
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};


/**
 * Main screen of the wallet
 *
 * @memberof Screens
 */
class Wallet extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.alertSuccessRef = React.createRef();
  }

  /**
   * backupDone {boolean} if words backup was already done
   * successMessage {string} Message to be shown on alert success
   * shouldShowAdministrativeTab {boolean} If we should display the Administrative Tools tab
   */
  state = {
    backupDone: true,
    successMessage: '',
    hasTokenSignature: false,
    shouldShowAdministrativeTab: false,
    totalSupply: null,
    canMint: false,
    canMelt: false,
    transactionsCount: null,
    mintCount: null,
    meltCount: null,
  };

  // Reference for the unregister confirm modal
  unregisterModalRef = React.createRef();

  componentDidMount = async () => {
    this.setState({
      backupDone: LOCAL_STORE.isBackupDone()
    });

    this.initializeWalletScreen();
  }

  componentDidUpdate(prevProps) {
    // the selected token changed, we should re-initialize the screen
    if (this.props.selectedToken !== prevProps.selectedToken) {
      this.initializeWalletScreen();
    }

    // if the new selected token history changed, we should fetch the token details again
    const prevTokenHistory = get(prevProps.tokensHistory, this.props.selectedToken, {
      status: TOKEN_DOWNLOAD_STATUS.LOADING,
      updatedAt: -1,
      data: [],
    });
    const currentTokenHistory = get(this.props.tokensHistory, this.props.selectedToken, {
      status: TOKEN_DOWNLOAD_STATUS.LOADING,
      updatedAt: -1,
      data: [],
    });

    if (prevTokenHistory.updatedAt !== currentTokenHistory.updatedAt) {
      this.updateTokenInfo();
      this.updateWalletInfo();
    }
  }

  /**
   * Resets the state data and triggers token information requests
   */
  async initializeWalletScreen() {
    this.shouldShowAdministrativeTab(this.props.selectedToken);
    const signature = tokens.getTokenSignature(this.props.selectedToken);

    this.setState({
      hasTokenSignature: !!signature,
      totalSupply: null,
      canMint: false,
      canMelt: false,
      transactionsCount: null,
      shouldShowAdministrativeTab: false,
    });

    // No need to download token info and wallet info if the token is hathor
    if (this.props.selectedToken === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid) {
      return;
    }

    await this.updateTokenInfo();
    await this.updateWalletInfo();
  }

  /**
   * Update token state after didmount or props update
   */
  updateWalletInfo = async () => {
    const tokenUid = this.props.selectedToken;
    const mintUtxos = await this.props.wallet.getMintAuthority(tokenUid, { many: true });
    const meltUtxos = await this.props.wallet.getMeltAuthority(tokenUid, { many: true });

    // The user might have changed token while we are downloading, we should ignore
    if (this.props.selectedToken !== tokenUid) {
      return;
    }

    const mintCount = mintUtxos.length;
    const meltCount = meltUtxos.length;

    this.setState({
      mintCount,
      meltCount,
    });
  }

  async updateTokenInfo() {
    const tokenUid = this.props.selectedToken;
    if (tokenUid === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid) {
      return;
    }
    const tokenDetails = await this.props.wallet.getTokenDetails(tokenUid);

    // The user might have changed token while we are downloading, we should ignore
    if (this.props.selectedToken !== tokenUid) {
      return;
    }

    const { totalSupply, totalTransactions, authorities } = tokenDetails;

    this.setState({
      totalSupply,
      canMint: authorities.mint,
      canMelt: authorities.melt,
      transactionsCount: totalTransactions,
    });
  }

  /**
   * Triggered when user clicks to do the backup of words, then opens backup modal
   *
   * @param {Object} e Event emitted when user click
   */
  backupClicked = (e) => {
    e.preventDefault();

    this.context.showModal(MODAL_TYPES.BACKUP_WORDS, {
      needPassword: true,
      validationSuccess: this.backupSuccess,
    });
  }

  /**
   * Called when the backup of words was done with success, then close the modal and show alert success
   */
  backupSuccess = () => {
    this.context.hideModal();
    LOCAL_STORE.markBackupDone();

    this.props.updateWords(null);
    this.setState({ backupDone: true, successMessage: t`Backup completed!` }, () => {
      this.alertSuccessRef.current.show(3000);
    });
  }

  /**
   * Called when user clicks to unregister the token, then opens the modal
   */
  unregisterClicked = () => {
    this.context.showModal(MODAL_TYPES.CONFIRM, {
      ref: this.unregisterModalRef,
      modalID: 'unregisterModal',
      title: t`Unregister token`,
      body: this.getUnregisterBody(),
      handleYes: this.unregisterConfirmed,
    });
  }

  /**
   * Called when user clicks to sign the token, then opens the modal
   */
  signClicked = () => {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);

    if (LOCAL_STORE.isHardwareWallet() && version.isLedgerCustomTokenAllowed()) {
      this.context.showModal(MODAL_TYPES.LEDGER_SIGN_TOKEN, {
        token,
        modalId: 'signTokenDataModal',
        cb: this.updateTokenSignature,
      })
    }
  }

  /**
   * When user confirms the unregister of the token, hide the modal and execute it
   */
  unregisterConfirmed = async () => {
    const tokenUid = this.props.selectedToken;
    try {
      await tokens.unregisterToken(tokenUid);
      wallet.setTokenAlwaysShow(tokenUid, false); // Remove this token from "always show"
      this.context.hideModal();
    } catch (e) {
      this.unregisterModalRef.current.updateErrorMessage(e.message);
    }
  }

  /*
   * We show the administrative tools tab only for the users that one day had an authority output, even if it was already spent
   *
   * This will set the shouldShowAdministrativeTab state param based on the response of getMintAuthority and getMeltAuthority
   */
  shouldShowAdministrativeTab = async (tokenId) => {
    const mintAuthorities = await this.props.wallet.getMintAuthority(tokenId, { skipSpent: false });

    if (mintAuthorities.length > 0) {
      return this.setState({
        shouldShowAdministrativeTab: true,
      });
    }

    const meltAuthorities = await this.props.wallet.getMeltAuthority(tokenId, { skipSpent: false });

    if (meltAuthorities.length > 0) {
      return this.setState({
        shouldShowAdministrativeTab: true,
      });
    }

    return this.setState({
      shouldShowAdministrativeTab: false,
    });
  }

  goToAllAddresses = () => {
    this.props.history.push('/addresses/');
  }

  // Trigger a render when we sign a token
  updateTokenSignature = (value) => {
    this.setState({
      hasTokenSignature: value,
    });
  }

  retryDownload = (e, tokenId) => {
    e.preventDefault();
    const balanceStatus = get(
      this.props.tokensBalance,
      `${this.props.selectedToken}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );
    const historyStatus = get(
      this.props.tokensHistory,
      `${this.props.selectedToken}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );

    // We should only retry the request that failed:

    if (historyStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      this.props.getHistory(tokenId);
    }

    if (balanceStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      this.props.getBalance(tokenId);
    }
  }

  getUnregisterBody() {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
    if (token === undefined) return null;

    return (
      <div>
        <p><SpanFmt>{t`Are you sure you want to unregister the token **${token.name} (${token.symbol})**?`}</SpanFmt></p>
        <p>{t`You won't lose your tokens, you just won't see this token on the side bar anymore.`}</p>
      </div>
    )
  }

  render() {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
    const tokenHistory = get(this.props.tokensHistory, this.props.selectedToken, {
      status: TOKEN_DOWNLOAD_STATUS.LOADING,
      data: [],
    });
    const tokenBalance = get(this.props.tokensBalance, this.props.selectedToken, {
      status: TOKEN_DOWNLOAD_STATUS.LOADING,
      data: {
        available: 0,
        locked: 0,
      },
    });

    const renderBackupAlert = () => {
      return (
        <div ref="backupAlert" className="alert alert-warning backup-alert" role="alert">
          {t`You haven't done the backup of your wallet yet. You should do it as soon as possible for your own safety.`} <a href="true" onClick={(e) => this.backupClicked(e)}>{t`Do it now`}</a>
        </div>
      )
    }

    const renderWallet = () => {
      return (
        <div>
          <div className="d-none d-sm-flex flex-row align-items-center justify-content-between">
            <div className="d-flex flex-column align-items-start justify-content-between">
              <WalletBalance key={this.props.selectedToken} />
            </div>
            <WalletAddress goToAllAddresses={this.goToAllAddresses} />
          </div>
          <div className="d-sm-none d-flex flex-column align-items-center justify-content-between">
            <div className="d-flex flex-column align-items-center justify-content-between">
              <WalletBalance key={this.props.selectedToken} />
              <div className="d-flex flex-row align-items-center">
              </div>
            </div>
            <WalletAddress goToAllAddresses={this.goToAllAddresses} />
          </div>
          <WalletHistory
            key={this.props.selectedToken}
            selectedToken={this.props.selectedToken} />
        </div>
      );
    }

    const renderTabAdmin = () => {
      if (this.state.shouldShowAdministrativeTab) {
        return (
            <li className="nav-item">
              <a className="nav-link" id="administrative-tab" data-toggle="tab" href="#administrative" role="tab" aria-controls="administrative" aria-selected="false">{t`Administrative Tools`}</a>
          </li>
        );
      } else {
        return null;
      }
    }

    const renderTokenData = (token) => {
      if (hathorLib.tokensUtils.isHathorToken(this.props.selectedToken)) {
        return renderWallet();
      } else {
        return (
          <div>
            <ul className="nav nav-tabs mb-4" id="tokenTab" role="tablist">
              <li className="nav-item">
                <a className="nav-link active" id="wallet-tab" data-toggle="tab" href="#wallet" role="tab" aria-controls="home" aria-selected="true">{t`Balance & History`}</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" id="token-tab" data-toggle="tab" href="#token" role="tab" aria-controls="token" aria-selected="false">{t`About ${token.name}`}</a>
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
                  errorMessage={this.state.errorMessage}
                  showAlwaysShowTokenCheckbox={true}
                  totalSupply={this.state.totalSupply}
                  canMint={this.state.canMint}
                  canMelt={this.state.canMelt}
                  transactionsCount={this.state.transactionsCount}
                  tokenMetadata={this.props.tokenMetadata}
                />
              </div>
              {
                this.shouldShowAdministrativeTab && (
                  <div className="tab-pane fade" id="administrative" role="tabpanel" aria-labelledby="administrative-tab">
                    <TokenAdministrative
                      key={this.props.selectedToken}
                      token={token}
                      totalSupply={this.state.totalSupply}
                      canMint={this.state.canMint}
                      canMelt={this.state.canMelt}
                      mintCount={this.state.mintCount}
                      meltCount={this.state.meltCount}
                      tokenBalance={tokenBalance}
                      transactionsCount={this.state.transactionsCount}
                    />
                  </div>
                )
              }
            </div>
          </div>
        );
      }
    }

    const renderSignTokenIcon = () => {
      // Don't show if it's HTR
      if (hathorLib.tokensUtils.isHathorToken(this.props.selectedToken)) return null;

      const signature = tokens.getTokenSignature(this.props.selectedToken);
      // Show only if we don't have a signature on storage
      if (signature === null) return <i className="fa fa-key pointer ml-3" title={t`Sign token on Ledger`} onClick={this.signClicked}></i>
      return <i className="fa fa-check pointer ml-3" title={t`Token signed with Ledger`}></i>
    }

    const renderUnlockedWallet = () => {
      let template;
      if (tokenHistory.status === TOKEN_DOWNLOAD_STATUS.LOADING
          || tokenBalance.status === TOKEN_DOWNLOAD_STATUS.LOADING) {
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
                <a onClick={(e) => this.retryDownload(e, token.uid)} href="true">
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
                {!hathorLib.tokensUtils.isHathorToken(this.props.selectedToken) && <i className="fa fa-trash pointer ml-3" title={t`Unregister token`} onClick={this.unregisterClicked}></i>}
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
        {!this.state.backupDone && renderBackupAlert()}
        <div className="content-wrapper">
        {/* This back button is not 100% perfect because when the user has just unlocked the wallet, it would go back to it when clicked
          * There is no easy way to get the previous path
          * I could use a lib (https://github.com/hinok/react-router-last-location)
          * Or handle it in our code, saving the last accessed screen
          * XXX Is it worth it to do anything about it just to prevent this case?
          */}
          <BackButton {...this.props} />
          {renderUnlockedWallet()}
        </div>
        <HathorAlert ref={this.alertSuccessRef} text={this.state.successMessage} type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
