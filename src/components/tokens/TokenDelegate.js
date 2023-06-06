/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import TokenAction from './TokenAction';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};


/**
 * Component that renders the delegate authority output in the token detail screen
 *
 * @memberof Components
 */
class TokenDelegate extends React.Component {
  constructor(props) {
    super(props);

    // Reference to address input
    this.delegateAddress = React.createRef();
    // Reference to create another authority output checkbox
    this.delegateCreateAnother = React.createRef();
  }

  /**
   * Prepare transaction to execute the delegate of outputs
   *
   * @param {String} pin PIN written by the user
   *
   * @return {Object} In case of success, an object with {success: true, sendTransaction, promise}, where sendTransaction is a
   * SendTransaction object that emit events while the tx is being sent and promise resolves when the sending is done
   * In case of error, an object with {success: false, message}
   */
  prepareSendTransaction = async (pin) => {
    const type = this.props.action === 'delegate-mint' ? t`Mint` : t`Melt`;

    const transaction = await this.props.wallet.prepareDelegateAuthorityData(
      this.props.token.uid,
      type.toLowerCase(),
      this.delegateAddress.current.value,
      {
        createAnother: this.delegateCreateAnother.current.checked,
        pinCode: pin,
      }
    );

    if (this.props.useWalletService) {
      return new hathorLib.SendTransactionWalletService(this.props.wallet, {
        transaction,
        pin,
      });
    }

    return new hathorLib.SendTransaction({ transaction, pin, storage: this.props.wallet.storage });
  }

  /**
   * Return a message to be shown in case of success
   */
  getSuccessMessage = () => {
    const type = this.props.action === 'delegate-mint' ? t`Mint` : t`Melt`;
    return t`${type} output delegated!`;
  }

  render() {
    const renderForm = () => {
      const type = this.props.action === 'delegate-mint' ? t`mint` : t`melt`;
      return (
        <div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Address of the new ${type} authority`}</label>
              <input required ref={this.delegateAddress} type="text" className="form-control" />
            </div>
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.delegateCreateAnother} id="keepAuthority" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepAuthority">
                {t`Create another ${type} output for you?`}
              </label>
              <p className="subtitle">{t`Leave it checked unless you know what you are doing`}</p>
            </div>
          </div>
        </div>
      )
    }

    const title = `Delegate ${this.props.action === 'delegate-mint' ? t`Mint` : t`Melt`}`;

    return (
      <TokenAction
        renderForm={renderForm}
        title={title}
        buttonName={t`Delegate`}
        getSuccessMessage={this.getSuccessMessage}
        prepareSendTransaction={this.prepareSendTransaction}
        modalTitle={t`Delegating authority`}
        {...this.props}
      />
    );
  }
}

export default connect(mapStateToProps)(TokenDelegate);
