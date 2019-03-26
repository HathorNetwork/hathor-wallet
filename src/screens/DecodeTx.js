import React from 'react';
import TxTextInput from '../components/TxTextInput';
import TxData from '../components/TxData';
import txApi from '../api/txApi';


class DecodeTx extends React.Component {
  state = {
    transaction: null,
    success: null,
    dataToDecode: '',
    meta: null,
    spentOutputs: null,
    confirmationData: null,
  };

  handleChangeData = (e) => {
    this.setState({ dataToDecode: e.target.value });
  }

  txDecoded = (data) => {
    if (data.success) {
      this.setState({ transaction: data.tx, meta: data.meta, spentOutputs: data.spent_outputs, loaded: true, success: true });
      this.getConfirmationData();
    } else {
      this.setState({ success: false, transaction: null, confirmationData: null, meta: null, spentOutputs: null });
    }
  }

  getConfirmationData = () => {
    txApi.getConfirmationData(this.state.transaction.hash, (data) => {
      this.setState({ confirmationData: data });
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }


  buttonClicked = () => {
    txApi.decodeTx(this.state.dataToDecode, (data) => {
      this.txDecoded(data);
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  render() {
    return (
      <div className="content-wrapper">
        <TxTextInput onChange={this.handleChangeData} buttonClicked={this.buttonClicked} action='Decode tx' otherAction='push' link='/push-tx/' helpText='Write your transaction in hex value and click the button to get a human value description' />
        {this.state.transaction ? <TxData transaction={this.state.transaction} showRaw={false} confirmationData={this.state.confirmationData} spentOutputs={this.state.spentOutputs} meta={this.state.meta} showConflicts={false} showGraphs={true} /> : null}
        {this.state.success === false ? <p className="text-danger">Could not decode this data to a transaction</p> : null}
      </div>
    );
  }
}

export default DecodeTx;