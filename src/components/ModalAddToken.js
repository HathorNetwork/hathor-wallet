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
import walletUtils from '../utils/wallet';
import { getGlobalWallet } from '../modules/wallet';

/**
 * Component that shows a modal to add one specific unknown token to the wallet
 *
 * @memberof Components
 */
class ModalAddToken extends React.Component {
  /**
   * @property {string} errorMessage Message that will be shown to the user in case of error
   * @property {string} warningMessage Message that will be shown to the user in warning scenarios
   * @property {boolean} shouldExhibitAlwaysShowCheckbox Defines "always show" checkbox rendering
   * @property {boolean} alwaysShow Defines if tokens will be added with "Always Show" setting
   */
  state = {
    errorMessage: '',
    warningMessage: '',
    shouldExhibitAlwaysShowCheckbox: false,
    alwaysShow: false,
  };

  /**
   * Handles the click on the "Always show this token" checkbox
   * @param {Event} e
   */
  handleToggleAlwaysShow = (e) => {
    const newValue = !this.state.alwaysShow;
    this.setState({ alwaysShow: newValue });
  }

  modalRef = React.createRef();

  componentDidMount = () => {
    $(this.modalRef.current).modal('show');

    $(this.modalRef.current).on('hide.bs.modal', (e) => {
      this.refs.config.value = '';
      this.setState({
        errorMessage: '',
        warningMessage: '',
        shouldExhibitAlwaysShowCheckbox: false,
        alwaysShow: false,
      });
    });

    $(this.modalRef.current).on('shown.bs.modal', (e) => {
      this.refs.config.focus();
    });

    $(this.modalRef.current).on('hidden.bs.modal', this.props.onClose);
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $(this.modalRef.current).modal('hide');
    $(this.modalRef.current).off();
  }

  /**
   * Method called when user clicks the button to register the token
   * Validates that the data written is valid
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleAdd = async (e) => {
    e.preventDefault();

    // Validating input field contents
    if (this.refs.config.value === '') {
      this.setState({ errorMessage: t`Must provide configuration string or uid, name, and symbol` });
      return;
    }

    try {
      const { storage } = getGlobalWallet();
      const tokenData = await hathorLib.tokensUtils.validateTokenToAddByConfigurationString(this.refs.config.value, storage);
      const tokensBalance = this.props.tokensBalance;

      const tokenUid = tokenData.uid;
      const tokenBalance = tokensBalance[tokenUid]?.data;
      const tokenHasZeroBalance = !tokenBalance
        || (tokenBalance.available + tokenBalance.locked) === 0n;

      /*
       * We only make this validation if the "Hide Zero-Balance Tokens" setting is active,
       * and only do it once. If the warning message was shown, we will accept the "alwaysShow"
       * checkbox value as the user decision already.
       */
      if (
        walletUtils.areZeroBalanceTokensHidden()
        && tokenHasZeroBalance
        && !this.state.shouldExhibitAlwaysShowCheckbox
      ) {
        this.setState({
          shouldExhibitAlwaysShowCheckbox: true,
          warningMessage: t`This token has no balance on your wallet and you have the "hide zero-balance tokens" settings on.\nDo you wish to always show this token? (You can always undo this on the token info screen.)`
        })
        return;
      }

      // Adding the token to the wallet and returning with the success callback
      tokens.addToken(tokenUid, tokenData.name, tokenData.symbol);
      walletUtils.setTokenAlwaysShow(tokenUid, this.state.alwaysShow);

      this.props.success();
    } catch (e) {
      this.setState({errorMessage: e.message});
    }
  }

  render() {
    const renderAlwaysShowCheckbox = () => {
      return (
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="alwaysShowTokenCheckbox"
                 checked={this.state.alwaysShow} onChange={this.handleToggleAlwaysShow}/>
          <label className="form-check-label" htmlFor="alwaysShowTokenCheckbox">
            {t`Always show this token`}
          </label>
          <i className="fa fa-question-circle pointer ml-3"
             title={t`If selected, it will override the "Hide zero-balance tokens" settings for this token.`}>
          </i>
        </div>
      );
    }

    const renderWarningMessage = () => {
      return (
        <div className="col-12 col-sm-12">
          <div ref="warningText" className="alert alert-warning" role="alert">
            {this.state.warningMessage}
          </div>
        </div>
      );
    }

    return (
      <div ref={this.modalRef} className="modal fade" id="addTokenModal" tabIndex="-1" role="dialog" aria-labelledby="addTokenModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Register a new token`}</h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close">
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
                  { this.state.warningMessage.length > 0 && renderWarningMessage() }
                </div>
                { this.state.shouldExhibitAlwaysShowCheckbox && renderAlwaysShowCheckbox() }
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">
                {t`Cancel`}
              </button>
              <button onClick={this.handleAdd} type="button" className="btn btn-hathor">{t`Register`}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalAddToken;
