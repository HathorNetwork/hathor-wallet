import React from 'react';
import $ from 'jquery';
import wallet from '../utils/wallet';
import tokens from '../utils/tokens';
import dateFormatter from '../utils/date';
import OutputsWrapper from '../components/OutputsWrapper'
import InputsWrapper from '../components/InputsWrapper'
import { DECIMAL_PLACES } from '../constants';
import { connect } from "react-redux";
import _ from 'lodash';


const mapStateToProps = (state) => {
  return { historyTransactions: state.historyTransactions };
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

  /*
   * Iterate through inputs and outputs to add each information typed to the data object
   */
  getData = () => {
    let data = {'outputs': [], 'inputs': []};
    for (const output of this.outputs) {
      const address = output.current.address.current.value;
      const value = output.current.value.current.value;

      if (address && value) {
        let dataOutput = {'address': address, 'value': parseInt(value*(10**DECIMAL_PLACES), 10), 'tokenData': tokens.getTokenIndex(this.state.selectedTokens, this.state.selected.uid)};

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

  /*
   * Validate inputs and outpus
   * 1. If inputs were not selected, select inputs from outputs amount
   * 2. If amount of selected inputs is larger than outputs amount, we create a change output
   * 3. If inputs were selected, check if they are valid
   */
  handleInitialData = (data) => {
    const noInputs = this.noInputs.current.checked;
    const result = wallet.prepareSendTokensData(data, this.state.selected, noInputs, this.props.historyTransactions, this.state.selectedTokens);
    if (result.success === false) {
      this.props.updateState({ errorMessage: result.message, loading: false });
      return null;
    }

    return result.data;
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
