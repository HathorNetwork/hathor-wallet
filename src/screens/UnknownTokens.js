/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import HathorAlert from '../components/HathorAlert';
import TokenHistory from '../components/TokenHistory';
import TokenBar from '../components/TokenBar';
import ModalAddManyTokens from '../components/ModalAddManyTokens';
import { connect } from "react-redux";
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import { WALLET_HISTORY_COUNT } from '../constants';
import helpers from '../utils/helpers';


const mapStateToProps = (state) => {
  return {
    registeredTokens: state.tokens,
    allTokens: state.allTokens,
    tokensBalance: state.tokensBalance,
    tokenMetadata: state.tokenMetadata,
  };
};


/**
 * List of unknown tokens with its transactions and possibility to add them
 *
 * @memberof Screens
 */
class UnknownTokens extends React.Component {
  constructor(props) {
    super(props);

    this.anchorHideRefs = [];
    this.anchorOpenRefs = [];
    this.historyRefs = [];

    /**
     * uidSelected {string} UID of the token the user clicked to add
     * successMessage {string} Message to be shown in the alert in case of success
     */
    this.state = {
      uidSelected: null,
      successMessage: ''
    };
  }

  /**
   * Get all unknown tokens from the wallet  
   * Comparing `allTokens` and `tokens` in the Redux we get the ones that are unknown
   *
   * @return {Array} Array with unknown tokens {uid, balance, history}
   */
  getUnknownTokens = () => {
    let unknownTokens = [];
    this.historyRefs = [];
    this.anchorOpenRefs = [];
    this.anchorHideRefs = [];
    for (const token of this.props.allTokens) {
      // If has balance but does not have token saved yet
      if (this.props.registeredTokens.find((x) => x.uid === token) === undefined) {
        const filteredHistoryTransactions = hathorLib.wallet.filterHistoryTransactions(this.props.historyTransactions, token, false);
        const balance = this.props.tokensBalance[token];
        unknownTokens.push({'uid': token, 'balance': balance, 'history': filteredHistoryTransactions});

        this.historyRefs.push(React.createRef());
        this.anchorOpenRefs.push(React.createRef());
        this.anchorHideRefs.push(React.createRef());
      }
    }
    return unknownTokens;
  }

  /**
   * Triggered when user clicks to open the history of the unknown token
   *
   * @param {Object} e Event emitted by the click
   * @param {number} index Index of the unknown token user clicked
   */
  openHistory = (e, index) => {
    e.preventDefault();
    $(this.historyRefs[index].current).show(400);
    $(this.anchorHideRefs[index].current).show(300);
    $(this.anchorOpenRefs[index].current).hide(300);
  }

  /**
   * Triggered when user clicks to hide the history of the unknown token
   *
   * @param {Object} e Event emitted by the click
   * @param {number} index Index of the unknown token user clicked
   */
  hideHistory = (e, index) => {
    e.preventDefault();
    $(this.historyRefs[index].current).hide(400);
    $(this.anchorHideRefs[index].current).hide(300);
    $(this.anchorOpenRefs[index].current).show(300);
  }

  /**
   * Triggered when user clicks to do a bulk import
   */
  massiveImport = () => {
    $('#addManyTokensModal').modal('show');
  }

  /**
   * Triggered after success doing a bulk import
   *
   * @param {number} count Quantity of tokens that were added
   */
  massiveImportSuccess = (count) => {
    $('#addManyTokensModal').modal('hide');
    const message = `${count} ${hathorLib.helpers.plural(count, 'token was', 'tokens were')} added!`;
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    });
  }

  render = () => {
    const unknownTokens = this.getUnknownTokens();

    const renderTokens = () => {
      if (unknownTokens.length === 0) {
        return <p>You don't have any unknown tokens</p>;
      } else {
        return unknownTokens.map((token, index) => {
          const isNFT = helpers.isTokenNFT(token.uid, this.props.tokenMetadata);
          return (
            <div key={token.uid} className="unknown-token card">
              <div className="header d-flex flex-row align-items-center justify-content-between">
                <div className="d-flex flex-column align-items-center justify-content-center">
                  <p>{token.uid}</p>
                  <div className="d-flex flex-row align-items-center justify-content-start w-100">
                    <span><strong>{t`Total:`}</strong> {helpers.renderValue(token.balance.available + token.balance.locked, isNFT)}</span>
                    <span className="ml-2"><strong>{t`Available:`}</strong> {helpers.renderValue(token.balance.available, isNFT)}</span>
                    <span className="ml-2"><strong>{t`Locked:`}</strong> {helpers.renderValue(token.balance.locked, isNFT)}</span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center">
                  <a onClick={(e) => this.openHistory(e, index)} ref={this.anchorOpenRefs[index]} href="true">{t`Show history`}</a>
                  <a onClick={(e) => this.hideHistory(e, index)} ref={this.anchorHideRefs[index]} href="true" style={{display: 'none'}}>{t`Hide history`}</a>
                </div>
              </div>
              <div className="body mt-3" ref={this.historyRefs[index]} style={{display: 'none'}}>
                <TokenHistory count={WALLET_HISTORY_COUNT} selectedToken={token.uid} showPage={false} />
              </div>
            </div>
          );
        });
      }
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <div className="d-flex flex-row align-items-center mb-4 mt-4">
          <h3 className="mr-4">{t`Unknown Tokens`}</h3>
          <button onClick={this.massiveImport} className="btn btn-hathor">{t`Register Tokens`}</button>
        </div>
        <p>{t`Those are the custom tokens which you have at least one transaction. They are still unregistered in this wallet. You need to register a custom token in order to send new transactions using it.`}</p>
        <p className="mb-5">{t`If you have reset your wallet, you need to register your custom tokens again.`}</p>
        {unknownTokens && renderTokens()}
        <ModalAddManyTokens success={this.massiveImportSuccess} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
        <TokenBar {...this.props}  />
      </div>
    );
  }
}

export default connect(mapStateToProps)(UnknownTokens);
