import React from 'react';
import dateFormatter from '../utils/date';
import $ from 'jquery';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom'
import helpers from '../utils/helpers';
import HathorAlert from './HathorAlert';


class TxData extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      raw: false
    }

    this.copied = this.copied.bind(this);
  }

  toggleRaw(e) {
    e.preventDefault();
    this.setState({ raw: !this.state.raw }, () => {
      if (this.state.raw) {
        $(this.refs.rawTx).show(300);
      } else {
        $(this.refs.rawTx).hide(300);
      }
    });
  }

  copied(text, result) {
    if (result) {
      // If copied with success
      this.refs.alertCopied.show(1000);
    }
  }

  render() {

    const renderInputs = (inputs) => {
      return inputs.map((input, idx) => {
        return (
          <li key={`${input.tx_id}${input.index}`}><Link to={`/transaction/${input.tx_id}`}>{input.tx_id}</Link> ({input.index})</li>
        );
      });
    }

    const renderOutputs = (outputs) => {
      return outputs.map((output, idx) => {
        return (
          <li key={idx}>
            {helpers.prettyValue(output.value)} -> {output.decoded ? renderDecodedScript(output.decoded) : `${output.script} (unknown script)` }
          </li>
        );
      });
    }

    const renderDecodedScript = (decoded) => {
      switch (decoded.type) {
        case 'P2PKH':
        case 'MultiSig':
          return renderP2PKHorMultiSig(decoded);
        case 'NanoContractMatchValues':
          return renderNanoContractMatchValues(decoded);
        default:
          return 'Unable to decode';
      }
    }

    const renderP2PKHorMultiSig = (decoded) => {
      var ret = decoded.address;
      if (decoded.timelock) {
        ret = `${ret} | Locked until ${dateFormatter.parseTimestamp(decoded.timelock)}`
      }
      ret = `${ret} [${decoded.type}]`;
      return ret;
    }

    const renderNanoContractMatchValues = (decoded) => {
      const ret = `Match values (nano contract), oracle id: ${decoded.oracle_data_id} hash: ${decoded.oracle_pubkey_hash}`;
      return ret;
    }

    const renderParents = (parents) => {
      return parents.map((parent, idx) => {
        return (
          <li key={parent}><Link to={`/transaction/${parent}`}>{parent}</Link></li>
        );
      });
    }

    const renderListWithLinks = (hashes) => {
      if (hashes.length === 0) {
        return;
      }
      if (hashes.length === 1) {
        const h = hashes[0];
        return <Link className="text-dark" to={`/transaction/${h}`}>{h}</Link>;
      }
      const v = hashes.map((h) => <li key={h}><Link className="text-dark" to={`/transaction/${h}`}>{h}</Link></li>)
      return (<ul>
        {v}
      </ul>)
    }

    const renderTwins = () => {
      if (!this.props.transaction.twins) {
        return;
      } else {
        return <p>This transaction has twin transaction{this.props.transaction.twins.length > 1 ? 's' : ''}: {renderListWithLinks(this.props.transaction.twins)}</p>
      }
    }

    const renderConflicts = () => {
      let twins = this.props.transaction.twins ? this.props.transaction.twins : [];
      let conflictNotTwin = this.props.transaction.conflict_with ?
                            this.props.transaction.conflict_with.filter(hash => twins.indexOf(hash) < 0) :
                            []
      if (!this.props.transaction.voided_by) {
        if (!this.props.transaction.conflict_with) {
          // there are conflicts, but it is not voided
          return (
            <div className="alert alert-success">
              <h4 className="alert-heading mb-0">This transaction is valid.</h4>
            </div>
          )
        }

        if (this.props.transaction.conflict_with) {
          // there are conflicts, but it is not voided
          return (
            <div className="alert alert-success">
              <h4 className="alert-heading">This transaction is valid.</h4>
              <p>
                Although there is a double-spending transaction, this transaction has the highest accumulated weight and is valid.
              </p>
              <hr />
              {conflictNotTwin.length > 0 &&
                <p className="mb-0">
                  <span>Transactions double spending the same outputs as this transaction: </span>
                  {renderListWithLinks(conflictNotTwin)}
                </p>}
              {renderTwins()}
            </div>
          );
        }
        return;
      }

      if (!this.props.transaction.conflict_with) {
        // it is voided, but there is no conflict
        return (
          <div className="alert alert-danger">
            <h4 className="alert-heading">This transaction is voided and <strong>NOT</strong> valid.</h4>
            <p>
              This transaction is verifying (directly or indirectly) a voided double-spending transaction, hence it is voided as well.
            </p>
            <p className="mb-0">
              <span>This transaction is voided because of these transactions: </span>
              {renderListWithLinks(this.props.transaction.voided_by)}
            </p>
          </div>
        )
      }

      // it is voided, and there is a conflict
      return (
        <div className="alert alert-danger">
          <h4 className="alert-heading">This transaction is <strong>NOT</strong> valid.</h4>
          <p>
            <span>It is voided by: </span>
            {renderListWithLinks(this.props.transaction.voided_by)}
          </p>
          <hr />
          {conflictNotTwin.length > 0 &&
            <p className="mb-0">
              <span>Conflicts with: </span>
              {renderListWithLinks(conflictNotTwin)}
            </p>}
          {renderTwins()}
        </div>
      )
    }

    const loadTxData = () => {
      return (
        <div className="tx-data-wrapper">
          {this.props.showConflicts ? renderConflicts() : ''}
          <div><label>Hash:</label> {this.props.transaction.hash}</div>
          <div><label>Type:</label> {helpers.getTxType(this.props.transaction)}</div>
          <div><label>Time:</label> {dateFormatter.parseTimestamp(this.props.transaction.timestamp)}</div>
          <div><label>Nonce:</label> {this.props.transaction.nonce}</div>
          <div><label>Weight:</label> {helpers.roundFloat(this.props.transaction.weight)}</div>
          <div><label>Accumulated weight:</label> {helpers.roundFloat(this.props.transaction.accumulated_weight)}</div>
          <div><label>Height:</label> {this.props.transaction.height}</div>
          <div>
            <label>Inputs:</label>
            <ul>
              {renderInputs(this.props.transaction.inputs)}
            </ul>
          </div>
          <div>
            <label>Outputs:</label>
            <ul>
              {renderOutputs(this.props.transaction.outputs)}
            </ul>
          </div>
          <div>
            <label>Parents:</label>
            <ul>
              {renderParents(this.props.transaction.parents)}
            </ul>
          </div>
          {this.props.showRaw ? showRawWrapper() : null}
        </div>
      );
    }

    const showRawWrapper = () => {
      return (
        <div>
          <a href="true" onClick={(e) => this.toggleRaw(e)}>{this.state.raw ? 'Hide raw transaction' : 'Show raw transaction'}</a>
          {this.state.raw ?
            <CopyToClipboard text={this.props.transaction.raw} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-1" title="Copy raw tx to clipboard"></i>
            </CopyToClipboard>
          : null}
          <p className="mt-3" ref="rawTx" style={{display: 'none'}}>{this.props.transaction.raw}</p>
        </div>
      );
    }

    return (
      <div>
        {loadTxData()}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
      </div>
    );
  }
}

export default TxData;
