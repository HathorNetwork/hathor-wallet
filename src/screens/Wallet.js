/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

import SpanFmt from '../components/SpanFmt';
import WalletHistory from '../components/WalletHistory';
import WalletBalance from '../components/WalletBalance';
import WalletAddress from '../components/WalletAddress';
import ModalBackupWords from '../components/ModalBackupWords';
import ModalConfirm from '../components/ModalConfirm';
import ModalLedgerSignToken from '../components/ModalLedgerSignToken';
import TokenBar from '../components/TokenBar';
import TokenGeneralInfo from '../components/TokenGeneralInfo';
import TokenAdministrative from '../components/TokenAdministrative';
import HathorAlert from '../components/HathorAlert';
import $ from 'jquery';
import { updateWords } from '../actions/index';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';
import tokens from '../utils/tokens';
import version from '../utils/version';
import wallet from '../utils/wallet';
import BackButton from '../components/BackButton';


const mapDispatchToProps = dispatch => {
  return {
    updateWords: (data) => dispatch(updateWords(data)),
  };
};


const mapStateToProps = (state) => {
  return {
    selectedToken: state.selectedToken,
    entireState: state,
    tokens: state.tokens,
    wallet: state.wallet,
    tokenHistory: state.tokensHistory[state.selectedToken] || [],
    tokenBalance: state.tokensBalance[state.selectedToken] || {},
    useWalletService: state.useWalletService,
  };
};


/**
 * Main screen of the wallet
 *
 * @memberof Screens
 */
class Wallet extends React.Component {
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
  };

  // Reference for the TokenGeneralInfo component
  generalInfoRef = React.createRef();

  // Reference for the TokenAdministrative component
  administrativeRef = React.createRef();

  // Reference for the unregister confirm modal
  unregisterModalRef = React.createRef();

  componentDidMount = () => {
    this.setState({
      backupDone: hathorLib.wallet.isBackupDone()
    });

    $('#wallet-div').on('show.bs.tab', 'a[data-toggle="tab"]', (e) => {
      // On tab show we reload token data from the server for each component
      if (e.target.id === 'token-tab') {
        this.generalInfoRef.current.updateTokenInfo();
      } else if (e.target.id === 'administrative-tab') {
        this.administrativeRef.current.updateTokenInfo();
      }
    });
  }

  componentWillReceiveProps(nextProps) {
    const signature = tokens.getTokenSignature(nextProps.selectedToken);
    this.setState({hasTokenSignature: !!signature});

    // This will be called everytime the props are updated, so check if
    // the selected token changed
    if (this.props.selectedToken !== nextProps.selectedToken) {
      this.shouldShowAdministrativeTab(nextProps.selectedToken);
    }
  }

  /**
   * Triggered when user clicks to do the backup of words, then opens backup modal
   *
   * @param {Object} e Event emitted when user click
   */
  backupClicked = (e) => {
    e.preventDefault();
    $('#backupWordsModal').modal('show');
  }

  /**
   * Called when the backup of words was done with success, then close the modal and show alert success
   */
  backupSuccess = () => {
    $('#backupWordsModal').modal('hide');
    hathorLib.wallet.markBackupAsDone();
    this.props.updateWords(null);
    this.setState({ backupDone: true, successMessage: t`Backup completed!` }, () => {
      this.refs.alertSuccess.show(3000);
    });
  }

  /**
   * Called when user clicks to unregister the token, then opens the modal
   */
  unregisterClicked = () => {
    $('#unregisterModal').modal('show');
  }

  /**
   * Called when user clicks to sign the token, then opens the modal
   */
  signClicked = () => {
    $('#signTokenDataModal').modal('show');
  }

  /**
   * When user confirms the unregister of the token, hide the modal and execute it
   */
  unregisterConfirmed = async () => {
    const tokenUid = this.props.selectedToken;
    try {
      await tokens.unregisterToken(tokenUid);
      wallet.setTokenAlwaysShow(tokenUid, false); // Remove this token from "always show"
      $('#unregisterModal').modal('hide');
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

  render() {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);

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

    const renderContentAdmin = () => {
      if (this.state.shouldShowAdministrativeTab) {
        return (
          <div className="tab-pane fade" id="administrative" role="tabpanel" aria-labelledby="administrative-tab">
            <TokenAdministrative key={this.props.selectedToken} token={token} ref={this.administrativeRef} />
          </div>
        );
      } else {
        return null;
      }
    }

    const renderTokenData = (token) => {
      if (hathorLib.tokens.isHathorToken(this.props.selectedToken)) {
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
                <TokenGeneralInfo token={token} showConfigString={true} errorMessage={this.state.errorMessage} ref={this.generalInfoRef} />
              </div>
              {renderContentAdmin()}
            </div>
          </div>
        );
      }
    }

    const getUnregisterBody = () => {
      if (token === undefined) return null;

      return (
        <div>
          <p><SpanFmt>{t`Are you sure you want to unregister the token **${token.name} (${token.symbol})**?`}</SpanFmt></p>
          <p>{t`You won't lose your tokens, you just won't see this token on the side bar anymore.`}</p>
        </div>
      )
    }

    const renderSignTokenIcon = () => {
      // Don't show if it's HTR
      if (hathorLib.tokens.isHathorToken(this.props.selectedToken)) return null;

      const signature = tokens.getTokenSignature(this.props.selectedToken);
      // Show only if we don't have a signature on storage
      if (signature === null) return <i className="fa fa-key pointer ml-3" title={t`Sign token on Ledger`} onClick={this.signClicked}></i>
      return <i className="fa fa-check pointer ml-3" title={t`Token signed with Ledger`}></i>
    }

    const renderUnlockedWallet = () => {
      return (
        <div className='wallet-wrapper'>
          <div className='token-wrapper d-flex flex-row align-items-center mb-3'>
            <p className='token-name mb-0'>
              <strong>{token ? token.name : ''}</strong>
              {!hathorLib.tokens.isHathorToken(this.props.selectedToken) && <i className="fa fa-trash pointer ml-3" title={t`Unregister token`} onClick={this.unregisterClicked}></i>}
              {hathorLib.wallet.isHardwareWallet() && version.isLedgerCustomTokenAllowed() && renderSignTokenIcon()}
            </p>
          </div>
          {renderTokenData(token)}
        </div>
      );
    }

    // Trigger a render when we sign a token
    const updateTokenSignature = (value) => {
      this.setState({hasTokenSignature: value});
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
        <TokenBar {...this.props} />
        <ModalBackupWords needPassword={true} validationSuccess={this.backupSuccess} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
        <ModalConfirm ref={this.unregisterModalRef} modalID="unregisterModal" title={t`Unregister token`} body={getUnregisterBody()} handleYes={this.unregisterConfirmed} />
        {hathorLib.wallet.isHardwareWallet() && version.isLedgerCustomTokenAllowed() && <ModalLedgerSignToken token={token} modalId="signTokenDataModal" cb={updateTokenSignature} />}
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
