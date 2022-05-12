/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import tokens from '../utils/tokens';
import hathorLib from '@hathor/wallet-lib';
import wallet from "../utils/wallet";


/**
 * Component that shows a modal to add many unknown tokens to the wallet (bulk import)
 *
 * @memberof Components
 */
class ModalAddManyTokens extends React.Component {
  /**
   * errorMessage {string} Message that will be shown to the user in case of error
   */
  state = {
    errorMessage: '',
    shouldExhibitAlwaysShowCheckbox: false,
    alwaysShow: false,
  };

  handleToggleAlwaysShow = (e) => {
    const newValue = !this.state.alwaysShow;
    this.setState( { alwaysShow: newValue });
  }

  componentDidMount = () => {
    $('#addManyTokensModal').on('hide.bs.modal', (e) => {
      this.refs.configs.value = '';
      this.setState({
        errorMessage: '',
        shouldExhibitAlwaysShowCheckbox: false,
        alwaysShow: false,
      });
    })

    $('#addManyTokensModal').on('shown.bs.modal', (e) => {
      this.refs.configs.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#addManyTokensModal').off();
  }

  /**
   * Method called when user clicks the button to add the tokens
   * Validates that all configuration strings written are valid
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleAdd = async (e) => {
    e.preventDefault();
    const configs = this.refs.configs.value.trim();
    if (configs === '') {
      this.setState({ errorMessage: t`Must provide configuration string` });
      return;
    }

    const regex = /\[[^:]+(:[^:]+){3}\]/g;
    const matches = configs.match(regex);

    if (matches === null) {
      this.setState({ errorMessage: 'Invalid configuration string' });
      return;
    }

    const validations = [];
    for (const config of matches) {
      // Preventing when the user forgets a comma in the end
      if (config !== '') {
        // Getting all validation promises
        validations.push(hathorLib.tokens.validateTokenToAddByConfigurationString(config));
      }
    }

    try {
      const toAdd = await Promise.all(validations)
      const tokensBalance = this.props.tokensBalance;
      const areZeroBalanceTokensHidden = wallet.areZeroBalanceTokensHidden();
      const tokensWithoutBalance = [];
      const tokensToAdd = [];

      // If all promises succeed, we add the tokens and show success message
      for (const config of toAdd) {
        const tokenUid = config.uid;
        const tokenBalance = tokensBalance[tokenUid];
        const tokenHasZeroBalance = (tokenBalance.available + tokenBalance.locked) === 0;

        if (areZeroBalanceTokensHidden && tokenHasZeroBalance && !this.state.shouldExhibitAlwaysShowCheckbox) {
          tokensWithoutBalance.push(config);
          continue;
        }

        tokensToAdd.push(config)
      }

      if (tokensWithoutBalance.length) {
        const emptyTokenNames = tokensWithoutBalance.map(t => t.symbol).join(', ')
        this.setState({
          shouldExhibitAlwaysShowCheckbox: true,
          errorMessage: t`This following tokens have no balance on your wallet and you have the "hide zero-balance tokens" settings on.\nDo you wish to always show these tokens? (You can always undo this on the token info screen.)\n${emptyTokenNames}`
        })
        return;
      }

      for (const config of tokensToAdd) {
        tokens.addToken(config.uid, config.name, config.symbol);
        wallet.setTokenAlwaysShow(config.uid, this.state.alwaysShow);
      }

      this.props.success(toAdd.length);
    } catch (e) {
      // If one fails, we show error message
      this.setState({errorMessage: e.message});
    }
  }

  render() {
    return (
      <div className="modal fade" id="addManyTokensModal" tabIndex="-1" role="dialog" aria-labelledby="addManyTokensModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Register Custom Tokens`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>{t`You can register one or more tokens writing the configuration string of each one below.`}</p>
              <form ref="formAddToken">
                <div className="form-group">
                  <textarea className="form-control" rows={8} ref="configs" placeholder={t`Configuration strings`} />
                </div>
                <div className="row">
                  <div className="col-12 col-sm-10">
                      <p className="error-message text-danger">
                        {this.state.errorMessage}
                      </p>
                  </div>
                </div>
                { this.state.shouldExhibitAlwaysShowCheckbox ? <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="alwaysShowToken"
                         checked={this.state.alwaysShow} onChange={this.handleToggleAlwaysShow} />
                  <label className="form-check-label" htmlFor="alwaysShowToken">
                    {t`Always show these tokens`}
                  </label>
                  <i className="fa fa-question-circle pointer ml-3"
                     title={t`If selected, it will overwrite the "Hide zero-balance tokens" settings.`}>
                  </i>
                </div> : '' }
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
              <button onClick={this.handleAdd} type="button" className="btn btn-hathor">{t`Register`}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalAddManyTokens;
