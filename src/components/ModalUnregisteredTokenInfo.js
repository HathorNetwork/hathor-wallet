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
import SpanFmt from './SpanFmt';
import TokenGeneralInfo from '../components/TokenGeneralInfo';
import hathorLib from '@hathor/wallet-lib';
import PropTypes from 'prop-types';

/**
 * Component that shows a modal with information about an unregistered token
 *
 * @memberof Components
 */
class ModalUnregisteredTokenInfo extends React.Component {
  /**
   * token {Object} Token data to show info
   * errorMessage {String} Message to show in case of an error when registering the token
   * formValidated {boolean} If register form was already validated
   */
  state = {
    errorMessage: '',
    formValidated: false,
  };

  // Reference to the form
  form = React.createRef();

  componentDidMount() {
    $('#unregisteredTokenInfoModal').modal('show');

    $('#unregisteredTokenInfoModal').on('hidden.bs.modal', () => {
      this.setState({ errorMessage: '', formValidated: false });
      this.props.onClose();
    });
  }

  /**
   * Method called when user clicks the button to register the token
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  register = async (e) => {
    if (!this.props.token) return;

    e.preventDefault();

    const isValid = this.form.current.checkValidity();
    this.setState({ formValidated: true, errorMessage: '' });
    if (isValid) {
      const configurationString = hathorLib.tokensUtils.getConfigurationString(
        this.props.token.uid,
        this.props.token.name,
        this.props.token.symbol,
      );

      try {
        const tokenData = await hathorLib.tokensUtils.validateTokenToAddByConfigurationString(configurationString, this.props.wallet.storage);
        await tokens.addToken(tokenData.uid, tokenData.name, tokenData.symbol);
        $('#unregisteredTokenInfoModal').modal('hide');
        this.props.tokenRegistered(this.props.token);
      } catch (err) {
        this.setState({ errorMessage: err.message });
      }
    }
  }

  render() {
    const renderTokenInfo = () => {
      return (
        <TokenGeneralInfo
          token={this.props.token}
          showConfigString={false}
          canMint={this.props.canMint}
          canMelt={this.props.canMelt}
          transactionsCount={this.props.transactionsCount}
          tokenMetadata={this.props.tokenMetadata}
          totalSupply={this.props.totalSupply}
          showAlwaysShowTokenCheckbox={false} />
      );
    };

    const renderHeader = () => {
      return (
        <div className="modal-header">
          <div className="d-flex flex-row">
            <h5 className="modal-title">{this.props.token.name} ({this.props.token.symbol})</h5>
            <span className='ml-2 unregistered-token-badge'> {t`Unregistered token`} </span>
          </div>
          <button type="button" className="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      );
    };

    const renderModalContent = () => {
      return (
          <div className="modal-content">
            {renderHeader()}
            <div className="modal-body">
              {renderTokenInfo()}
              <div className="mt-4">
                <p><SpanFmt>{t`This token is **not registered** in your wallet. You must **always validate the token uid**, to ensure you are not being scammed.`}</SpanFmt></p>
                <p>{t`The token uid is always unique, and your only trust point.`}</p>
                <form className={`mt-4 mb-3 ${this.state.formValidated ? 'was-validated' : ''}`} ref={this.form} onSubmit={(e) => e.preventDefault()}>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" ref="iWantToRegister" id="iWantToRegister" required />
                    <label className="form-check-label" htmlFor="iWantToRegister">
                      {t`I want to register this token`}
                    </label>
                  </div>
                </form>
                <p className="text-danger">{this.state.errorMessage}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={this.register} type="button" className="btn btn-secondary">{t`Register token`}</button>
              <button type="button" className="btn btn-hathor" data-dismiss="modal">{t`Cancel`}</button>
            </div>
          </div>
      );
    };

    return (
      <div className="modal fade" id="unregisteredTokenInfoModal" tabIndex="-1" role="dialog" aria-labelledby="unregisteredTokenInfoModal" aria-hidden="true">
        <div className="modal-dialog modal-lg" role="document">
          {renderModalContent()}
        </div>
      </div>
    )
  }
}

/*
 * token: Token to show general information {name, symbol, uid}
 * tokenRegistered: Method called after token is registered with success
 */
ModalUnregisteredTokenInfo.propTypes = {
  token: PropTypes.object,
  tokenRegistered: PropTypes.func.isRequired,
  canMelt: PropTypes.bool,
  canMint: PropTypes.bool,
  transactionsCount: PropTypes.number,
  tokenMetadata: PropTypes.object,
  totalSupply: PropTypes.number,
};

export default ModalUnregisteredTokenInfo;
