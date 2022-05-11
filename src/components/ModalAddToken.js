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
 * Component that shows a modal to add one specific unknown token to the wallet
 *
 * @memberof Components
 */
class ModalAddToken extends React.Component {
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
    $('#addTokenModal').on('hide.bs.modal', (e) => {
      this.refs.config.value = '';
      this.setState({
        errorMessage: '',
        shouldExhibitAlwaysShowCheckbox: false,
        alwaysShow: false,
      });
    })

    $('#addTokenModal').on('shown.bs.modal', (e) => {
      this.refs.config.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#addTokenModal').off();
  }

  /**
   * Method called when user clicks the button to register the token
   * Validates that the data written is valid
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleAdd = async (e) => {
    e.preventDefault();
    if (this.refs.config.value === '') {
      this.setState({ errorMessage: t`Must provide configuration string or uid, name, and symbol` });
      return;
    }
    try {
      const tokenData = await hathorLib.tokens.validateTokenToAddByConfigurationString(this.refs.config.value, null);
      const tokensBalance = this.props.tokensBalance;

      const tokenUid = tokenData.uid;
      const tokenBalance = tokensBalance[tokenUid];
      const tokenHasZeroBalance = (tokenBalance.available + tokenBalance.locked) === 0;

      if (wallet.areZeroBalanceTokensHidden() && tokenHasZeroBalance && !this.state.shouldExhibitAlwaysShowCheckbox) {
        this.setState({
          shouldExhibitAlwaysShowCheckbox: true,
          errorMessage: t`This token has no balance on your wallet and you have the "hide zero-balance tokens" settings on.\nDo you wish to always show this token? (You can always undo this on the token info screen.)`
        })
        return;
      }

      tokens.addToken(tokenUid, tokenData.name, tokenData.symbol);
      wallet.setTokenAlwaysShow(tokenUid, this.state.alwaysShow);
      this.props.success();
    } catch (e) {
      this.setState({errorMessage: e.message});
    }
  }

  render() {
    return (
      <div className="modal fade" id="addTokenModal" tabIndex="-1" role="dialog" aria-labelledby="addTokenModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Register a new token`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>{t`To register a token that already exists, just write down its configuration string`}</p>
              <form ref="formAddToken">
                <div className="form-group">
                  <textarea type="text" className="form-control" ref="config"
                            placeholder={t`Configuration string`}
                            readOnly={this.state.shouldExhibitAlwaysShowCheckbox} />
                </div>
                <div className="row">
                  <div className="col-12 col-sm-10">
                      <p className="error-message text-danger">
                        {this.state.errorMessage}
                      </p>
                  </div>
                </div>
                { this.state.shouldExhibitAlwaysShowCheckbox ? <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="alwaysShowTokenCheckbox"
                         checked={this.state.alwaysShow} onChange={this.handleToggleAlwaysShow} />
                  <label className="form-check-label" htmlFor="alwaysShowToken">
                    {t`Always show this token`}
                  </label>
                  <i className="fa fa-question-circle pointer ml-3"
                     title={t`If selected, it will overwrite the "Hide zero-balance tokens" settings for this token.`}>
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

export default ModalAddToken;
