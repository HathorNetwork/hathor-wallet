/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { get } from 'lodash';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import tokens from '../utils/tokens';
import walletUtils from "../utils/wallet";
import { getGlobalWallet } from "../modules/wallet";

/**
 * Component that shows a modal to add many unknown tokens to the wallet (bulk import)
 *
 * @memberof Components
 */
class ModalAddManyTokens extends React.Component {
  /**
   * @property {string} errorMessage Message that will be shown to the user in case of error
   * @property {string} warningMessage Message that will be shown to the user in warning scenarios
   * @property {boolean} shouldExhibitAlwaysShowCheckbox Defines "always show" checkbox rendering
   * @property {boolean} alwaysShow Defines if tokens will be added with "Always Show" setting
   * @property {string} tokensToAdd Stores the tokens that will be added. Used on user messages.
   */
  state = {
    errorMessage: '',
    warningMessage: '',
    shouldExhibitAlwaysShowCheckbox: false,
    alwaysShow: false,
    tokensToAdd: '',
  };

  /**
   * Handles the click on the "Always show this token" checkbox
   * @param {Event} e
   */
  handleToggleAlwaysShow = (e) => {
    const newValue = !this.state.alwaysShow;
    this.setState( { alwaysShow: newValue });
  }

  modalRef = React.createRef();

  componentDidMount = () => {
    $(this.modalRef.current).modal('show');
    $(this.modalRef.current).on('hide.bs.modal', (e) => {
      this.refs.configs.value = '';
      this.setState({
        errorMessage: '',
        warningMessage: '',
        shouldExhibitAlwaysShowCheckbox: false,
        alwaysShow: false,
        tokensToAdd: '',
      });
    });

    $(this.modalRef.current).on('hidden.bs.modal', (e) => {
      this.props.onClose();
    });

    $(this.modalRef.current).on('shown.bs.modal', (e) => {
      this.refs.configs.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $(this.modalRef.current).off();
    $(this.modalRef.current).modal('hide');
  }

  /**
   * Method called when user clicks the button to add the tokens
   * Validates that all configuration strings written are valid and applies logic to warn/ask the
   * user about tokens that would be hidden under current settings.
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
        const storage = getGlobalWallet().storage;
        validations.push(hathorLib.tokensUtils.validateTokenToAddByConfigurationString(config, storage));
      }
    }

    try {
      const toAdd = await Promise.all(validations)
      const tokensBalance = this.props.tokensBalance;
      const areZeroBalanceTokensHidden = walletUtils.areZeroBalanceTokensHidden();
      const tokensWithoutBalance = [];
      const tokensToAdd = [];

      // All promises succeeded, validating token balances
      for (const config of toAdd) {
        const tokenUid = config.uid;
        const { available, locked } = get(tokensBalance, `${tokenUid}.data`, {
          available: 0n,
          locked: 0n,
        });
        const tokenHasZeroBalance = (available + locked) === 0n;

        /*
         * We only make this validation if the "Hide Zero-Balance Tokens" setting is active,
         * and only do it once. If the warning message was shown, we will accept the "alwaysShow"
         * checkbox value as the user decision already.
         */
        if (
          areZeroBalanceTokensHidden
          && tokenHasZeroBalance
          && !this.state.shouldExhibitAlwaysShowCheckbox
        ) {
          tokensWithoutBalance.push(config);
          continue;
        }

        // Prepare the token to be added to the wallet
        tokensToAdd.push(config)
      }

      /*
       * This array will only be populated if the "Hide zero balance tokens" setting is active and
       * the user tried to add tokens with zero balance.
       * In this case, we will stop the process and render a warning message with an option to
       * always show these tokens being added.
       * No tokens will be added here.
       */
      if (tokensWithoutBalance.length) {
        const emptyTokenNames = tokensWithoutBalance.map(t => t.symbol).join(', ')
        this.setState({
          shouldExhibitAlwaysShowCheckbox: true,
          warningMessage: t`The following tokens have no balance on your wallet and you have the "hide zero-balance tokens" settings on.\nDo you wish to always show these tokens? (You can always undo this on the token info screen.)`,
          tokensToAdd: emptyTokenNames,
        })
        return;
      }

      // Adding the tokens to the wallet and returning with the success callback
      for (const config of tokensToAdd) {
        await tokens.addToken(config.uid, config.name, config.symbol);
        walletUtils.setTokenAlwaysShow(config.uid, this.state.alwaysShow);
      }

      this.props.success(toAdd.length);
    } catch (e) {
      // If one of the promises fail, we show an error message
      this.setState({errorMessage: e.message});
    }
  }

  render() {
    const renderAlwaysShowCheckbox = () => {
      return (
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="alwaysShowToken"
                 checked={this.state.alwaysShow} onChange={this.handleToggleAlwaysShow}/>
          <label className="form-check-label" htmlFor="alwaysShowToken">
            {t`Always show these tokens`}
          </label>
          <i className="fa fa-question-circle pointer ml-3"
             title={t`If selected, it will override the "Hide zero-balance tokens" settings.`}>
          </i>
        </div>
      );
    }

    const renderWarningMessage = () => {
      return (
        <div className="col-12 col-sm-12">
          <div ref="warningText" className="alert alert-warning" role="alert">
            {this.state.warningMessage}<br/>
            <strong>{this.state.tokensToAdd}</strong>
          </div>
        </div>
      );
    }

    return (
      <div ref={this.modalRef} className="modal fade" id="addManyTokensModal" tabIndex="-1" role="dialog" aria-labelledby="addManyTokensModal" aria-hidden="true">
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
                  <textarea className="form-control" rows={8} ref="configs"
                            placeholder={t`Configuration strings`}
                            readOnly={this.state.shouldExhibitAlwaysShowCheckbox} />
                </div>
                <div className="row">
                  <div className="col-12 col-sm-10">
                      <p className="error-message text-danger">
                        {this.state.errorMessage}
                      </p>
                  </div>
                  { this.state.warningMessage.length > 0 && renderWarningMessage() }
                </div>
                { this.state.shouldExhibitAlwaysShowCheckbox && renderAlwaysShowCheckbox() }
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
