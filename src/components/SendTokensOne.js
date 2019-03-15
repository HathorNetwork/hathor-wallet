import React from 'react';
import $ from 'jquery';
import wallet from '../utils/wallet';
import dateFormatter from '../utils/date';
import OutputsWrapper from '../components/OutputsWrapper'
import InputsWrapper from '../components/InputsWrapper'
import { DECIMAL_PLACES, HATHOR_TOKEN_CONFIG } from '../constants';
import { connect } from "react-redux";
import _ from 'lodash';


const mapStateToProps = (state) => {
  return { unspentTxs: state.unspentTxs };
};


class SendTokensOne extends React.Component {
  constructor(props) {
    super(props);

    this.inputsWrapper = React.createRef();
    this.noInputs = React.createRef();
    this.inputs = [React.createRef()];
    this.outputs = [React.createRef()];
    this.uniqueID = _.uniqueId();

    this.state = {
      inputsCount: 1, // How many inputs were filled for this token
      outputsCount: 1, // How many outputs were filled for this token
      selected: null, // The selected token
      selectedTokens: [] // A list of selected tokens in the Send Tokens screen
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

  addOutput = () => {
    this.outputs.push(React.createRef());
    const newCount = this.state.outputsCount + 1;
    this.setState({ outputsCount: newCount });
  }

  addInput = () => {
    this.inputs.push(React.createRef());
    const newCount = this.state.inputsCount + 1;
    this.setState({ inputsCount: newCount });
  }

  getTokenIndex = () => {
    // If token is Hathor, index is always 0
    // Otherwise, it is always the array index + 1
    if (this.state.selected.uid === HATHOR_TOKEN_CONFIG.uid) {
      return 0;
    } else {
      const tokensWithoutHathor = this.state.selectedTokens.filter((token) => token.uid !== HATHOR_TOKEN_CONFIG.uid);
      const myIndex = tokensWithoutHathor.findIndex((token) => token.uid === this.state.selected.uid);
      return myIndex + 1;
    }
  }

  getData = () => {
    let data = {'outputs': [], 'inputs': []};
    for (const output of this.outputs) {
      const address = output.current.address.current.value;
      const value = output.current.value.current.value;

      if (address && value) {
        let dataOutput = {'address': address, 'value': parseInt(value*(10**DECIMAL_PLACES), 10), 'tokenData': this.getTokenIndex()};

        const hasTimelock = output.current.timelockCheckbox.current.checked;
        if (hasTimelock) {
          const timelock = output.current.timelock.current.value;
          if (!timelock) {
            this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Output: ${output.current.props.index}. You need to fill a complete date and time` });
            return null;
          }
          const timestamp = dateFormatter.dateToTimestamp(new Date(timelock));
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
          data['inputs'].push({'tx_id': txId, 'index': index, 'token': this.state.selected.uid });
        }
      }
    }

    return data;
  }

  handleInitialData = (data) => {
    // Get the data and verify if we need to select the inputs or add a change output

    // First get the amount of outputs
    let outputsAmount = 0;
    for (let output of data.outputs) {
      outputsAmount += output.value;
    }

    if (outputsAmount === 0) {
      this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Total value can't be 0`, loading: false });
      return null;
    }

    const noInputs = this.noInputs.current.checked;
    if (noInputs) {
      // If no inputs selected we select our inputs and, maybe add also a change output
      let newData = wallet.getInputsFromAmount(outputsAmount, this.state.selected.uid);

      data['inputs'] = newData['inputs'];

      if (newData.inputsAmount < outputsAmount) {
        // Don't have this amount of token
        this.props.updateState({ errorMessage: `Token ${this.state.selected.symbol}: Insufficient amount of tokens`, loading: false });
        return null;
      } else {
        if (newData.inputsAmount > outputsAmount) {
          // Need to create change output
          let outputChange = wallet.getOutputChange(newData.inputsAmount - outputsAmount, this.props.pin, this.getTokenIndex());
          data['outputs'].push(outputChange);
          // Shuffle outputs, so we don't have change output always in the same index
          data['outputs'] = _.shuffle(data['outputs']);
        }
      }

    } else {
      // Validate the inputs used and if have to create a change output
      let inputsAmount = 0;
      for (const input of data.inputs) {
        let objectKey = [input.tx_id, input.index];
        if (!this.checkUnspentTxExists(objectKey)) {
          // Input does not exist in unspent txs
          return null;
        }

        if (wallet.canUseUnspentTx(this.props.unspentTxs[this.state.selected.uid][objectKey])) {
          inputsAmount += this.props.unspentTxs[this.state.selected.uid][objectKey].value;
        } else {
          this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Output [${objectKey}] is locked`, loading: false });
          return null;
        }
      }

      if (inputsAmount < outputsAmount) {
        this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Amount of outputs is bigger than the amount of inputs`, loading: false });
        return null;
      } else {
        if (inputsAmount > outputsAmount) {
          // Need to create change output
          let outputChange = wallet.getOutputChange(inputsAmount - outputsAmount, this.props.pin, this.getTokenIndex());
          data['outputs'].push(outputChange);
        }
      }
    }

    return data;
  }

  checkUnspentTxExists = (key) => {
    let exists = wallet.checkUnspentTxExists(key, this.state.selected.uid);
    if (!exists) {
      this.props.updateState({ errorMessage: `Token: ${this.state.selected.symbol}. Transaction [${key}] is not available`, loading: false });
    }
    return exists;
  }

  handleCheckboxChange = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.inputsWrapper.current).hide(400);
    } else {
      $(this.inputsWrapper.current).show(400);
    }
  }

  changeSelect = (e) => {
    const selected = this.props.tokens.find((token) => token.uid === e.target.value);
    this.setState({ selected });
    this.props.tokenSelectChange(selected, this.props.index);
  }

  render = () => {
    const renderOutputs = () => {
      return this.outputs.map((output, index) =>
        <OutputsWrapper key={index} index={index} ref={output} addOutput={this.addOutput} />
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
      return (
        <select value={this.state.selected.uid} className="ml-3" onChange={this.changeSelect}>
          {renderTokenOptions()}
        </select>
      );
    }

    return (
      <div className='send-tokens-wrapper card'>
        <div className="mb-3">
          <label>Token:</label>
          {this.state.selected && renderSelectToken()}
          {this.state.selectedTokens.length !== 1 ? <button type="button" className="text-danger remove-token-btn ml-3" onClick={(e) => this.props.removeToken(this.props.index)}>Remove</button> : null}
        </div>
        <div className="outputs-wrapper">
          <label>Outputs</label>
          {renderOutputs()}
        </div>
        <div className="form-check checkbox-wrapper">
          <input className="form-check-input" type="checkbox" defaultChecked="true" ref={this.noInputs} id={this.uniqueID} onChange={this.handleCheckboxChange} />
          <label className="form-check-label" htmlFor={this.uniqueID}>
            Choose inputs automatically
          </label>
        </div>
        <div ref={this.inputsWrapper} className="inputs-wrapper" style={{display: 'none'}}>
          <label htmlFor="inputs">Inputs</label>
          {renderInputs()}
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps, null, null, { withRef: true })(SendTokensOne);