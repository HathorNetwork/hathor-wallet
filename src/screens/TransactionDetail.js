import React from 'react';
import ReactLoading from 'react-loading';
import txApi from '../api/txApi';
import TxData from '../components/TxData';


class TransactionDetail extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      transaction: null,
      meta: null,
      spentOutputs: null,
      loaded: false,
      success: null,
      confirmationData: null,
    }
  }

  componentDidMount() {
    this.getTx();
    this.getConfirmationData();
  }

  getConfirmationData = () => {
    txApi.getConfirmationData(this.props.match.params.id, (data) => {
      this.setState({ confirmationData: data });
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  txReceived(data) {
    if (data.success) {
      this.setState({ transaction: data.tx, meta: data.meta, spentOutputs: data.spent_outputs, loaded: true, success: true });
    } else {
      this.setState({ loaded: true, success: false, transaction: null });
    }
  }

  getTx() {
    txApi.getTransaction(this.props.match.params.id, (data) => {
      this.txReceived(data);
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.match.params.id !== prevProps.match.params.id) {
      this.getTx();
    }
  }

  render() {
    const renderTx = () => {
      return (
        <div>
          {this.state.transaction ? <TxData transaction={this.state.transaction} confirmationData={this.state.confirmationData} spentOutputs={this.state.spentOutputs} meta={this.state.meta} showRaw={true} showConflicts={true} showGraphs={true} /> : <p className="text-danger">Transaction with hash {this.props.match.params.id} not found</p>}
        </div>
      );
    }

    return (
      <div className="flex align-items-center content-wrapper">
        {!this.state.loaded ? <ReactLoading type='spin' color='#0081af' delay={500} /> : renderTx()}
      </div>
    );
  }
}

export default TransactionDetail;
