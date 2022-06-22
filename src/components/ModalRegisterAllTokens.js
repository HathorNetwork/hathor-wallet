/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { str2jsx } from '../utils/i18n';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import ReactLoading from 'react-loading';
import colors from '../index.scss';
import PropTypes from 'prop-types';


/**
 * Component that shows a modal to register all tokens
 *
 * @memberof Components
 */
class ModalRegisterAllTokens extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      registerZeroBalanceTokens: false,
      zeroBalanceUnknownTokens: null,
      withBalanceUnknownTokens: null,
      conflictTokens: null,
      showConflictDetails: false,
    }
  }

  componentDidMount = async () => {
    // This modal will be divided into 3 parts:
    // 1. How many unknown tokens that have balance
    // 2. How many unknown tokens with zero balance (unselected)
    // 3. How many tokens with name/symbol conflict (those can't be registered by this action)

    const nameMap = {};
    const symbolMap = {};

    // First we fill the name/symbol map with the uids of tokens already registered
    for (const token of this.props.registeredTokens) {
      const cleanName = hathorLib.helpers.cleanupString(token.name);
      const cleanSymbol = hathorLib.helpers.cleanupString(token.symbol);

      if (!(cleanName in nameMap)) {
        nameMap[cleanName] = [];
      }

      if (!(cleanSymbol in symbolMap)) {
        symbolMap[cleanSymbol] = [];
      }

      nameMap[cleanName].push(token.uid);
      symbolMap[cleanSymbol].push(token.uid);
    }

    const zeroBalanceUnknownTokens = [];
    const withBalanceUnknownTokens = [];
    const conflictTokens = {};

    for (const tokenUid of this.props.allTokens) {
      if (this.props.registeredTokens.find((x) => x.uid === tokenUid)) {
        continue;
      }

      const balance = this.props.tokensBalance[tokenUid];

      if (balance.available + balance.locked === 0) {
        zeroBalanceUnknownTokens.push(tokenUid);
      } else {
        withBalanceUnknownTokens.push(tokenUid);
      }

      hathorLib.walletApi.getGeneralTokenInfo(tokenUid, (data) => {
        const cleanName = hathorLib.helpers.cleanupString(data.name);
        const cleanSymbol = hathorLib.helpers.cleanupString(data.symbol);

        if (cleanName in nameMap) {
          conflictTokens[tokenUid] = {key: 'name', conflictWith: nameMap[cleanName]};
          nameMap[cleanName].push(tokenUid);
        } else {
          nameMap[cleanName] = [tokenUid];
        }

        if (cleanSymbol in symbolMap) {
          conflictTokens[tokenUid] = {key: 'symbol', conflictWith: symbolMap[cleanSymbol]};
          symbolMap[cleanSymbol].push(tokenUid);
        } else {
          symbolMap[cleanSymbol] = [tokenUid];
        }

      });

      // The tokens API can receive 3r/s per IP in the public nodes
      await hathorLib.helpersUtils.sleep(350);
    }

    const toRegisterZeroBalance = zeroBalanceUnknownTokens.filter((item) => !(item in conflictTokens));
    const toRegisterWithBalance = withBalanceUnknownTokens.filter((item) => !(item in conflictTokens));
    this.setState({ toRegisterZeroBalance, toRegisterWithBalance, conflictTokens, zeroBalanceUnknownTokens, withBalanceUnknownTokens, loading: false });
  }

  registerAll = () => {
    console.log('Registerrrr');
  }

  /**
   * Handles the click on the "Register zero balance tokens" checkbox
   */
  handleRegisterZeroBalance = () => {
    this.setState({ registerZeroBalanceTokens: !this.state.registerZeroBalanceTokens });
  }

  /**
   */
  handleConflictDetailsClicked = (e) => {
    e.preventDefault()
    if (this.state.showConflictDetails) {
      $(this.refs.conflictDetailsWrapper).hide(400);
    } else {
      $(this.refs.conflictDetailsWrapper).show(400);
    }
    this.setState({ showConflictDetails: !this.state.showConflictDetails });
  }

  render() {
    const renderLoading = () => {
      return (
        <div>
          <p>Loading data...</p>
          <ReactLoading type='spin' color={colors.purpleHathor} delay={500} />
        </div>
      );
    }

    const renderTokensInfo = () => {
      return (
        <div>
          <div className="mb-3">
            <p><strong>{t`Tokens with balance`}</strong></p>
            <label className="form-check-label">
              {this.state.toRegisterWithBalance.length} {t`tokens with balance will be registered`}
            </label>
            <input className="ml-2 form-check-input" type="checkbox" checked={true} readOnly={true} disabled={true} />
          </div>

          <div className="mb-3">
            <p><strong>{t`Tokens with zero balance`}</strong></p>
            <label className="form-check-label">
              {this.state.toRegisterZeroBalance.length} {t`tokens with zero balance will be registered`}
            </label>
            <input className="ml-2 form-check-input" checked={this.state.registerZeroBalanceTokens}
                   type="checkbox" onChange={this.handleRegisterZeroBalance} />
          </div>
          {Object.keys(this.state.conflictTokens).length > 0 && renderConflictInformation()}
        </div>
      );
    }

    const renderConflictInformation = () => {
      return (
        <div className="mb-3">
          <p><strong>{t`Tokens with name or symbol conflict`}</strong></p>
          <label className="form-check-label">
            {Object.keys(this.state.conflictTokens).length} {t`tokens with conflict that won't be registered.`}
          </label><br />
          <a href="true" onClick={this.handleConflictDetailsClicked} className="mt-2 ">{renderConflictDetailLink()}</a>
          <div ref="conflictDetailsWrapper" className="mt-3" style={{display: 'none'}}>
            <ul>
              {renderConflictElements()}
            </ul>
          </div>
        </div>
      );
    }

    const renderConflictElements = () => {
      return Object.keys(this.state.conflictTokens).map((key) => {
        return (
          <li key={key}>
            {str2jsx(
              t`Token |bold:${key}| has |bold:${this.state.conflictTokens[key].key}| conflict with |bold:${this.state.conflictTokens[key].conflictWith}|.`,
              {
                bold: (x, i) => <strong key={i}>{x}</strong>,
              }
            )}
          </li>
        );
      });
    }

    const renderConflictDetailLink = () => {
      if (this.state.showConflictDetails) {
        return t`Hide conflict details`;
      } else {
        return t`See conflict details`;
      }
    }

    const renderRegisterCount = () => {
      if (this.state.loading) {
        return null;
      }

      let total = this.state.toRegisterWithBalance.length;
      if (this.state.registerZeroBalanceTokens) {
        total += this.state.toRegisterZeroBalance.length;
      }

      return (
        <label>{total} {t`tokens are selected to be registered.`}</label>
      );
    }

    return (
      <div className="modal fade" id="registerAllTokensModal" tabIndex="-1" role="dialog" aria-labelledby="addManyTokensModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Register All Tokens`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {this.state.loading ? renderLoading() : renderTokensInfo()}
            </div>
            <div className="modal-footer">
              <div>
                {renderRegisterCount()}
              </div>
              <div>
                <button type="button" className="btn btn-secondary mr-2" data-dismiss="modal">{t`Cancel`}</button>
                <button onClick={this.registerAll} type="button" className="btn btn-hathor">{t`Register All`}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}


/*
 * allTokens: All tokens, including unknown
 * registeredTokens: All registered tokens
 * tokensBalance: Balance of each token
 */
ModalRegisterAllTokens.propTypes = {
  allTokens: PropTypes.instanceOf(Set).isRequired,
  registeredTokens: PropTypes.array.isRequired,
  tokensBalance: PropTypes.object.isRequired,
};

export default ModalRegisterAllTokens;