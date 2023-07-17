/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import _ from 'lodash';
import { t } from 'ttag';
import { get } from 'lodash';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';
import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import version from '../utils/version';
import OutputsWrapper from '../components/OutputsWrapper';
import InputsWrapper from '../components/InputsWrapper';
import Loading from '../components/Loading';
import { TOKEN_DOWNLOAD_STATUS } from '../sagas/tokens';
import LOCAL_STORE from '../storage';


const mapStateToProps = (state) => {
  // We need the height on the props so it can update the balance
  // when the network height updates and the wallet had a reward locked block
  return {
    tokensBalance: state.tokensBalance,
    tokenMetadata: state.tokenMetadata,
    height: state.height,
  };
};


/**
 * Component that renders one token wrapper in the Send Tokens screen
 *
 * @memberof Components
 */
class SendTokensOne extends React.Component {
  constructor(props) {
    super(props);

    this.inputsWrapper = React.createRef();
    this.noInputs = React.createRef();
    this.inputs = [React.createRef()];
    this.outputs = [React.createRef()];
    this.uniqueID = _.uniqueId();

    /**
     * inputsCount {number} How many inputs were filled for this token
     * outputsCount {number} How many outputs were filled for this token
     * selected {Object} The config of the selected token
     * selectedTokens {Array} The list of all tokens already selected on the Send Tokens screen
     */
    this.state = {
      inputsCount: 1,
      outputsCount: 1,
      selected: null,
      selectedTokens: []
    };
  }

  componentDidMount = () => {
    this.setState({ selected: this.props.config, selectedTokens: this.props.selectedTokens });
  }

  componentDidUpdate = (prevProps) => {
    // Checking if selectedTokens changed
    if (JSON.stringify(prevProps.selectedTokens) !== JSON.stringify(this.props.selectedTokens)) {
      this.setState({ selectedTokens: this.props.selectedTokens });
    }
  }

  /**
   * Add a new output wrapper for this token
   */
  addOutput = () => {
    this.outputs.push(React.createRef());
    const newCount = this.state.outputsCount + 1;
    this.setState({ outputsCount: newCount });
  }

  /**
   * Add a new input wrapper for this token
   */
  addInput = () => {
    this.inputs.push(React.createRef());
    const newCount = this.state.inputsCount + 1;
    this.setState({ inputsCount: newCount });
  }

  /**
   * Use helper method to check if token is an NFT
   */
  isNFT = () => {
    return helpers.isTokenNFT(_.get(this.state, 'selected.uid'), this.props.tokenMetadata);
  }

  /**
   * Iterate through inputs and outputs to add each information typed to the data object
   */
  getData = () => {
    let data = {'outputs': [], 'inputs': []};
    for (const output of this.outputs) {
      const address = output.current.address.current.value;
      const valueStr = (output.current.value.current.value || "").replace(/,/g, '');

      if (address && valueStr) {
        // Doing the check here because need to validate before doing parseInt
        const tokensValue = this.isNFT() ? parseInt(valueStr) : wallet.decimalToInteger(valueStr);
        if (tokensValue > hathorLib.constants.MAX_OUTPUT_VALUE) {
          this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Output: ${output.current.props.index}. Maximum output value is ${helpers.renderValue(hathorLib.constants.MAX_OUTPUT_VALUE, this.isNFT())}` });
          return null;
        }
        let dataOutput = {'address': address, 'value': parseInt(tokensValue, 10), 'token': this.state.selected.uid};

        const hasTimelock = output.current.timelockCheckbox.current.checked;
        if (hasTimelock) {
          const timelock = output.current.timelock.current.value;
          if (!timelock) {
            this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Output: ${output.current.props.index}. You need to fill a complete date and time` });
            return null;
          }
          const timestamp = hathorLib.dateFormatter.dateToTimestamp(new Date(timelock));
          dataOutput['timelock'] = timestamp;
        }

        data['outputs'].push(dataOutput);
      }
    }

    const noInputs = this.noInputs.current.checked;
    if (!noInputs) {
      for (const input of this.inputs) {
        const txId = input.current.txId.current.value;
        const index = input.current.index.current.value;

        if (txId && index) {
          data['inputs'].push({'txId': txId, 'index': parseInt(index, 10), 'token': this.state.selected.uid });
        }
      }
    }

    return data;
  }

  /**
   * Called when select input checkbox is clicked
   *
   * @param {Object} e Event emitted when checkbox is clicked
   */
  handleCheckboxChange = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.inputsWrapper.current).hide(400);
    } else {
      $(this.inputsWrapper.current).show(400);
    }
  }

  /**
   * Called when selected token is changed
   *
   * @param {Object} e Event emitted when select is changed
   */
  changeSelect = (e) => {
    const selected = this.props.tokens.find((token) => token.uid === e.target.value);
    this.setState({ selected });
    this.props.tokenSelectChange(selected, this.props.index);
  }

  render = () => {
    const renderOutputs = () => {
      return this.outputs.map((output, index) =>
        <OutputsWrapper key={index} index={index} ref={output} addOutput={this.addOutput} isNFT={this.isNFT()} />
      );
    }

    const renderInputs = () => {
      return this.inputs.map((input, index) =>
        <InputsWrapper key={index} index={index} ref={input} addInput={this.addInput} />
      );
    }

    const renderTokenOptions = () => {
      return this.props.tokens.map((token) => {
        // Show in the select only the tokens not already selected plus the current selection
        if (this.state.selectedTokens.find((selectedToken) => selectedToken.uid === token.uid) === undefined || token.uid === this.state.selected.uid) {
          return <option value={token.uid} key={token.uid}>{token.symbol}</option>;
        }
        return null;
      })
    }

    const renderSelectToken = () => {
      const enableSelect = !LOCAL_STORE.isHardwareWallet() || version.isLedgerCustomTokenAllowed();
      return (
        <select className="ml-3" value={this.state.selected.uid} onChange={this.changeSelect}
          title={enableSelect ? t`Select token` : t`This feature is disabled for the current Ledger app version`}
          disabled={enableSelect ? null : true}>
          {renderTokenOptions()}
        </select>
      );
    }

    const renderBalance = () => {
      const tokenBalance = get(this.props.tokensBalance, this.state.selected.uid, {
        status: TOKEN_DOWNLOAD_STATUS.LOADING,
        data: {
          available: 0,
          locked: 0,
        },
      });

      return (
        <span className="ml-3">
          (
            {t`Balance available: `}
            { tokenBalance.status === TOKEN_DOWNLOAD_STATUS.LOADING && (
              <Loading />
            )}
            { tokenBalance.status === TOKEN_DOWNLOAD_STATUS.READY && helpers.renderValue(tokenBalance.data.available, this.isNFT()) }
          )
        </span>
      );
    }

    const renderNFTHelper = () => {
      return (
        <div>
          <small className="text-muted">This is an NFT token. The amount must be an integer number, without decimal places.</small>
        </div>
      );
    }

    return (
      <div className='send-tokens-wrapper card'>
        <div>
          <label><strong>{t`Token:`}</strong></label>
          {this.state.selected && renderSelectToken()}
          {this.state.selected && renderBalance()}
          {this.state.selectedTokens.length !== 1 ? <button type="button" className="text-danger remove-token-btn ml-3" onClick={(e) => this.props.removeToken(this.props.index)}>{t`Remove`}</button> : null}
        </div>
        {this.isNFT() && renderNFTHelper()}
        <div className="outputs-wrapper mt-3">
          <label>Outputs</label>
          {renderOutputs()}
        </div>
        <div className="form-check checkbox-wrapper">
          <input className="form-check-input" type="checkbox" defaultChecked="true" ref={this.noInputs} id={this.uniqueID} onChange={this.handleCheckboxChange} />
          <label className="form-check-label" htmlFor={this.uniqueID}>
            {t`Choose inputs automatically`}
          </label>
        </div>
        <div ref={this.inputsWrapper} className="inputs-wrapper" style={{display: 'none'}}>
          <label htmlFor="inputs">{t`Inputs`}</label>
          {renderInputs()}
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps, null, null, { forwardRef: true })(SendTokensOne);
