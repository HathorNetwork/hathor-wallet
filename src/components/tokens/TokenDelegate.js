/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import hathorLib from '@hathor/wallet-lib';
import TokenAction from './TokenAction';


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
   * Execute the delegate of outputs
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message
   */
  executeDelegate = (pin) => {
    const output = this.props.authorityOutputs[0];
    const type = this.props.action === 'delegate-mint' ? 'Mint' : 'Melt';
    const promise = hathorLib.tokens.delegateAuthority(output.tx_id, output.index, output.decoded.address, this.props.token.uid, this.delegateAddress.current.value, this.delegateCreateAnother.current.checked, type.toLowerCase(), pin);
    return { promise, message: `${type} output delegated!`};
  }

  render() {
    const renderForm = () => {
      const type = this.props.action === 'delegate-mint' ? 'mint' : 'melt';
      return (
        <div>
          <div className="row">
            <div className="form-group col-6">
              <label>Address of the new {type} authority</label>
              <input required ref={this.delegateAddress} type="text" className="form-control" />
            </div>
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.delegateCreateAnother} id="keepAuthority" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepAuthority">
                Create another {type} output for you?
              </label>
              <p className="subtitle">Let it marked, unless you know what you are doing</p>
            </div>
          </div>
        </div>
      )
    }

    const title = `Delegate ${this.props.action === 'delegate-mint' ? 'Mint' : 'Melt'}`;

    return <TokenAction renderForm={renderForm} title={title} buttonName='Delegate' onPinSuccess={this.executeDelegate} {...this.props} />
  }
}

export default TokenDelegate;
