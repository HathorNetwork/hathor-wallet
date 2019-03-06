import React from 'react';
import walletApi from '../api/wallet';
import $ from 'jquery';
import helpers from '../utils/helpers';
import wallet from '../utils/wallet';
import { util } from 'bitcore-lib';
import transaction from '../utils/transaction';
import AddressError from '../utils/errors';
import dateFormatter from '../utils/date';
import ReactLoading from 'react-loading';
import ModalPin from '../components/ModalPin'
import { DECIMAL_PLACES, HATHOR_TOKEN_UID } from '../constants';
import { connect } from "react-redux";
import _ from 'lodash';


const mapStateToProps = (state) => {
  return { unspentTxs: state.unspentTxs, address: state.lastSharedAddress };
};


class SendTokens extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      locked: null,
      walletType: '',
      errorMessage: '',
      outputCount: 1,
      inputCount: 1,
      loading: false,
      pin: '',
    }

    // TODO get correct token_uid when using multi token
    this.tokenUID = HATHOR_TOKEN_UID;
  }

  setType = (type) => {
    this.setState({ walletType: type });
  }

  lock = () => {
    this.setState({ locked: true });
  }

  unlock = () => {
    this.setState({ locked: false });
  }

  moreOutput = () => {
    let newCount = this.state.outputCount + 1;
    this.setState({ outputCount: newCount });
  }

  moreInput = () => {
    let newCount = this.state.inputCount + 1;
    this.setState({ inputCount: newCount });
  }

  validateData = () => {
    const isValid = this.refs.formSendTokens.checkValidity();
    if (isValid === false) {
      this.refs.formSendTokens.classList.add('was-validated');
    } else {
      this.refs.formSendTokens.classList.remove('was-validated');
    }
    return isValid;
  }

  getData = () => {
    let data = {'outputs': [], 'inputs': []};
    let _this = this;
    let error = false;
    $('.outputs-wrapper .input-group').each(function(index) {
      let address = $(this).find('.output-address').val();
      let value = $(this).find('.output-value').val();

      if (address && value) {
        var dataOutput = {'address': address, 'value': parseInt(value*(10**DECIMAL_PLACES), 10)};

        let hasTimelock = $(this).find('.has-timelock').prop('checked');
        if (hasTimelock) {
          let timelock = $(this).find('.output-timelock').val()
          if (!timelock) {
            _this.setState({ errorMessage: 'You need to fill a complete date and time' });
            error = true
            return;
          }
          let timestamp = dateFormatter.dateToTimestamp(new Date(timelock));
          dataOutput['timelock'] = timestamp;
        }

        data['outputs'].push(dataOutput);
      }
    });

    if (error) {
      return null;
    }

    const noInputs = this.refs.noInputs.checked;

    if (!noInputs) {
      $('.inputs-wrapper .input-group').each(function(idx) {
        let tx_id = $(this).find('.input-id').val();
        let index = $(this).find('.input-index').val();

        if (tx_id && index) {
          data['inputs'].push({'tx_id': tx_id, 'index': index});
        }
      });
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
      this.setState({ errorMessage: 'Total value can\'t be 0', loading: false });
      return null;
    }

    const noInputs = this.refs.noInputs.checked;
    if (noInputs) {
      // If no inputs selected we select our inputs and, maybe add also a change output
      let newData = wallet.getInputsFromAmount(outputsAmount, this.tokenUID);

      data['inputs'] = newData['inputs'];

      if (newData.inputsAmount < outputsAmount) {
        // Don't have this amount of token
        this.setState({ errorMessage: 'Insufficient amount of tokens', loading: false });
        return null;
      } else {
        if (newData.inputsAmount > outputsAmount) {
          // Need to create change output
          let outputChange = wallet.getOutputChange(newData.inputsAmount - outputsAmount, this.state.pin);
          data['outputs'].push(outputChange);
          // Shuffle outputs, so we don't have change output always in the same index
          data['outputs'] = _.shuffle(data['outputs']);
        }
      }

    } else {
      // Validate the inputs used and if have to create a change output
      let inputsAmount = 0;
      for (let input of data.inputs) {
        let objectKey = [input.tx_id, input.index];
        if (!this.checkUnspentTxExists(objectKey)) {
          // Input does not exist in unspent txs
          return;
        }

        if (wallet.canUseUnspentTx(this.props.unspentTxs[this.tokenUID][objectKey])) {
          inputsAmount += this.props.unspentTxs[this.tokenUID][objectKey].value;
        } else {
          this.setState({ errorMessage: `Output [${objectKey}] is locked`, loading: false });
          return;
        }
      }

      if (inputsAmount < outputsAmount) {
        this.setState({ errorMessage: 'Amount of outputs is bigger than the amount of inputs', loading: false });
        return null;
      } else {
        if (inputsAmount > outputsAmount) {
          // Need to create change output
          let outputChange = wallet.getOutputChange(inputsAmount - outputsAmount, this.state.pin);
          data['outputs'].push(outputChange);
        }
      }
    }

    return data;
  }

  checkUnspentTxExists = (key) => {
    let exists = wallet.checkUnspentTxExists(key, this.tokenUID);
    if (!exists) {
      this.setState({ errorMessage: `Transaction [${key}] is not available`, loading: false });
    }
    return exists;
  }

  send = () => {
    $('#pinModal').modal('toggle');
    const isValid = this.validateData();
    if (!isValid) return;
    let data = this.getData();
    data = this.handleInitialData(data);
    // TODO add token index for each output to support multi tokens
    if (data) {
      this.setState({ errorMessage: '', loading: true });
      try {
        let dataToSign = transaction.dataToSign(data);
        data = transaction.updateInputData(data, dataToSign, this.tokenUID, this.state.pin);
        // Completing data in the same object
        transaction.completeTx(data);
        let txBytes = transaction.txToBytes(data);
        let txHex = util.buffer.bufferToHex(txBytes);
        walletApi.sendTokens(txHex, (response) => {
          if (response.success) {
            this.props.history.push('/wallet/');
          } else {
            this.setState({ errorMessage: response.message, loading: false });
          }
        }, (e) => {
          // Error in request
          console.log(e);
          this.setState({ loading: false });
        });
      } catch(e) {
        if (e instanceof AddressError) {
          this.setState({ errorMessage: e.message, loading: false });
        } else {
          // Unhandled error
          throw e;
        }
      }
    }
  }

  handleCheckboxChange = (e) => {
    const value = e.target.checked;
    if (value) {
      $('.inputs-wrapper').hide(400);
    } else {
      $('.inputs-wrapper').show(400);
    }
  }

  handleCheckboxTimelockChange = (e) => {
    const value = e.target.checked;
    let index = $(e.target).attr('data-index');
    let el = $(`#output-timelock-${index}`);
    if (value) {
      $(el).show(400);
    } else {
      $(el).hide(400);
    }
  }

  onDateChange = (date) => {
    this.setState({ date });
  }

  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  render = () => {
    const renderOutputs = () => {
      let outputs = [];
      for (let i=0; i<this.state.outputCount; i++) {
        outputs.push(
          <div className="input-group mb-3" key={i}>
            <input type="text" placeholder="Address" className="form-control output-address col-4" />
            <input type="number" step={helpers.prettyValue(1)} min={helpers.prettyValue(1)} placeholder={helpers.prettyValue(0)} className="form-control output-value col-2" />
            <div className="form-check mr-3 d-flex flex-column justify-content-center">
              <input className="form-check-input mt-0 has-timelock" data-index={i} type="checkbox" onChange={this.handleCheckboxTimelockChange}/>
              <label className="form-check-label">
                Time lock
              </label>
            </div>
            <input type="datetime-local" placeholder="Date and time in GMT" step="1" id={`output-timelock-${i}`} className="form-control output-timelock col-3" style={{display: 'none'}}/>
            {i === 0 ? <button type="button" className="btn btn-hathor" onClick={this.moreOutput}>+</button> : null}
          </div>
        )
      }
      return outputs;
    }

    const renderInputs = () => {
      let inputs = [];
      for (let i=0; i<this.state.inputCount; i++) {
        inputs.push(
          <div className="input-group mb-3" key={i}>
            <input type="text" placeholder="Tx id" className="form-control input-id col-6" />
            <input type="text" placeholder="Index" className="form-control input-index col-1" />
            {i === 0 ? <button type="button" className="btn btn-hathor" onClick={this.moreInput}>+</button> : null}
          </div>
        )
      }
      return inputs;
    }

    const renderUnlockedPage = () => {
      return (
        <div>
          <form ref="formSendTokens" id="formSendTokens">
            <div className="outputs-wrapper">
              <label>Outputs</label>
              {renderOutputs()}
            </div>
            <div className="form-check checkbox-wrapper">
              <input className="form-check-input" type="checkbox" defaultChecked="true" ref="noInputs" id="noInputs" onChange={this.handleCheckboxChange} />
              <label className="form-check-label" htmlFor="noInputs">
                Choose inputs automatically
              </label>
            </div>
            <div className="inputs-wrapper" style={{display: 'none'}}>
              <label htmlFor="inputs">Inputs</label>
              {renderInputs()}
            </div>
            <button type="button" className="btn btn-hathor" data-toggle="modal" disabled={this.state.loading} data-target="#pinModal">Send Tokens</button>
          </form>
          <p className="text-danger mt-3">{this.state.errorMessage}</p>
        </div>
      );
    }

    const isLoading = () => {
      return (
        <div className="d-flex flex-row">
          <p className="mr-3">Please, wait while we solve the proof of work and propagate the transaction</p>
          <ReactLoading type='spin' color='#0081af' width={24} height={24} delay={200} />
        </div>
      )
    }

    return (
      <div className="content-wrapper flex align-items-center">
        {renderUnlockedPage()}
        {this.state.loading ? isLoading() : null}
        <ModalPin execute={this.send} handleChangePin={this.handleChangePin} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(SendTokens);