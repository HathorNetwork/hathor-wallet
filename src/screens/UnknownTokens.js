import React from 'react';
import wallet from '../utils/wallet';
import $ from 'jquery';
import HathorAlert from '../components/HathorAlert';
import TokenHistory from '../components/TokenHistory';
import ModalAddToken from '../components/ModalAddToken';
import ModalAddManyTokens from '../components/ModalAddManyTokens';
import helpers from '../utils/helpers';
import { WALLET_HISTORY_COUNT } from '../constants';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return {
    registeredTokens: state.tokens,
    allTokens: state.allTokens,
    historyTransactions: state.historyTransactions,
  };
};


class UnknownTokens extends React.Component {
  constructor(props) {
    super(props);

    this.anchorHideRefs = [];
    this.anchorOpenRefs = [];
    this.historyRefs = [];

    this.state = {
      uidSelected: null,
      successMessage: ''
    };
  }

  getUnknownTokens = () => {
    let unknownTokens = [];
    this.historyRefs = [];
    this.anchorOpenRefs = [];
    this.anchorHideRefs = [];
    for (const token of this.props.allTokens) {
      // If has balance but does not have token saved yet
      if (this.props.registeredTokens.find((x) => x.uid === token) === undefined) {
        const filteredHistoryTransactions = wallet.filterHistoryTransactions(this.props.historyTransactions, token);
        const balance = wallet.calculateBalance(filteredHistoryTransactions, token);

        const calcPages = Math.ceil(filteredHistoryTransactions.length / WALLET_HISTORY_COUNT);
        unknownTokens.push({'uid': token, 'balance': balance, 'history': filteredHistoryTransactions, 'totalPages': calcPages});

        this.historyRefs.push(React.createRef());
        this.anchorOpenRefs.push(React.createRef());
        this.anchorHideRefs.push(React.createRef());
      }
    }
    return unknownTokens;
  }

  openHistory = (e, index) => {
    e.preventDefault();
    $(this.historyRefs[index].current).show(400);
    $(this.anchorHideRefs[index].current).show(300);
    $(this.anchorOpenRefs[index].current).hide(300);
  }

  hideHistory = (e, index) => {
    e.preventDefault();
    $(this.historyRefs[index].current).hide(400);
    $(this.anchorHideRefs[index].current).hide(300);
    $(this.anchorOpenRefs[index].current).show(300);
  }

  addToken = (e, uid) => {
    e.preventDefault();
    this.setState({ uidSelected: uid }, () => {
      $('#addTokenModal').modal('show');
    });
  }

  newTokenSuccess = () => {
    $('#addTokenModal').modal('hide');
    this.setState({ successMessage: 'Token added!'}, () => {
      this.refs.alertSuccess.show(3000);
    });
  }

  massiveImport = (e) => {
    e.preventDefault();
    $('#addManyTokensModal').modal('show');
  }

  massiveImportSuccess = (count) => {
    $('#addManyTokensModal').modal('hide');
    const message = `${count} ${helpers.plural(count, 'token was', 'tokens were')} added!`;
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    });
  }

  render = () => {
    const unknownTokens = this.getUnknownTokens();

    const renderTokens = () => {
      if (unknownTokens.length === 0) {
        return <p>You don't have any unknown tokens</p>;
      } else {
        return unknownTokens.map((token, index) => {
          return (
            <div key={token.uid} className="unknown-token card">
              <div className="header d-flex flex-row align-items-center justify-content-between">
                <div className="d-flex flex-column align-items-center justify-content-center">
                  <p>{token.uid}</p>
                  <div className="d-flex flex-row align-items-center justify-content-start w-100">
                    <span><strong>Total:</strong> {helpers.prettyValue(token.balance.available + token.balance.locked)}</span>
                    <span className="ml-2"><strong>Available:</strong> {helpers.prettyValue(token.balance.available)}</span>
                    <span className="ml-2"><strong>Locked:</strong> {helpers.prettyValue(token.balance.locked)}</span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center">
                  <a href="true" className="mr-3" onClick={(e) => this.addToken(e, token.uid)}>Add token</a>
                  <a onClick={(e) => this.openHistory(e, index)} ref={this.anchorOpenRefs[index]} href="true">See history</a>
                  <a onClick={(e) => this.hideHistory(e, index)} ref={this.anchorHideRefs[index]} href="true" style={{display: 'none'}}>Hide history</a>
                </div>
              </div>
              <div className="body mt-3" ref={this.historyRefs[index]} style={{display: 'none'}}>
                <TokenHistory history={token.history} count={WALLET_HISTORY_COUNT} totalPages={token.totalPages} selectedToken={token.uid} />
              </div>
            </div>
          );
        });
      }
    }

    return (
      <div className="content-wrapper">
        <div className="d-flex flex-row align-items-center mb-5">
          <h3 className="mr-4">Unknown tokens</h3>
          <a onClick={(e) => this.massiveImport(e)} href="true">Bulk import</a>
        </div>
        {unknownTokens && renderTokens()}
        <ModalAddToken success={this.newTokenSuccess} uid={this.state.uidSelected} />
        <ModalAddManyTokens success={this.massiveImportSuccess} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(UnknownTokens);
