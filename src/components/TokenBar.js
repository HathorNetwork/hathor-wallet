import React from 'react';
import helpers from '../utils/helpers';
import wallet from '../utils/wallet';
import { connect } from "react-redux";
import { selectToken } from '../actions/index';


const mapStateToProps = (state) => {
  return {
    registeredTokens: state.tokens,
    allTokens: state.allTokens,
    selectedToken: state.selectedToken,
    historyTransactions: state.historyTransactions,
  };
};


const mapDispatchToProps = dispatch => {
  return {
    selectToken: data => dispatch(selectToken(data)),
  };
};


class TokenBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      opened: false,
      selected: 'HTR',
    }
  }

  getUnknownTokens = () => {
    const diff = this.props.allTokens.size - this.props.registeredTokens.length;
    return diff;
  }

  toggleExpand = () => {
    this.setState({ opened: !this.state.opened });
  }

  tokenSelected = (uid) => {
    this.props.selectToken(uid);
  }

  lockWallet = () => {
    wallet.lock();
    this.props.history.push('/locked/');
  }

  goToSettings = () => {
    this.props.history.push('/settings/');
  }

  getTokenBalance = (uid) => {
    const filteredHistoryTransactions = wallet.filterHistoryTransactions(this.props.historyTransactions, uid);
    const balance = wallet.calculateBalance(filteredHistoryTransactions, uid);
    const total = balance.available + balance.locked;
    return helpers.prettyValue(total);
  }

  unknownClicked = () => {
    this.props.history.push('/unknown_tokens/');
  }

  render() {
    const unknownTokens = this.getUnknownTokens();

    const renderTokens = () => {
      return this.props.registeredTokens.map((token) => {
        return (
          <div key={token.uid} className={`token-wrapper ${token.uid === this.props.selectedToken ? 'selected' : ''}`} onClick={(e) => {this.tokenSelected(token.uid)}}>
            <span className='ellipsis'>{token.symbol} {this.state.opened && ` - ${this.getTokenBalance(token.uid)}`}</span>
          </div>
        )
      });
    }

    const renderExpandedHeader = () => {
      return (
        <div className='d-flex align-items-center justify-content-between flex-row w-100'>
          <span>Tokens</span>
          <i className='fa fa-chevron-left' title='Close bar'></i>
        </div>
      )
    }

    const renderUnknownTokens = () => {
      return (
        <div title={`${unknownTokens} unknown ${helpers.plural(unknownTokens, 'token', 'tokens')}`} className={`d-flex align-items-center icon-wrapper ${this.state.opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={this.unknownClicked}>
          <div className="unknown-symbol d-flex flex-row align-items-center justify-content-center">{unknownTokens}</div>
          {this.state.opened && <span className='ellipsis'>Unknown {helpers.plural(unknownTokens, 'token', 'tokens')}</span>}
        </div>
      );
    }

    return (
      <div className={`d-flex flex-column align-items-center justify-content-between token-bar ${this.state.opened ? 'opened' : 'closed'}`}>
        <div className='d-flex flex-column align-items-center justify-content-between w-100'>
          <div className='header d-flex align-items-center justify-content-center w-100' onClick={this.toggleExpand}>
            {this.state.opened ? renderExpandedHeader() : <i className='fa fa-chevron-right' title='Expand bar'></i>}
          </div>
          <div className='body'>
            {renderTokens()}
            <div className={`d-flex align-items-center icon-wrapper ${this.state.opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={this.props.addToken}>
              <i className='fa fa-plus token-icon' title='Add token'></i>
              {this.state.opened && <span className='ellipsis'>Add token</span>}
            </div>
            {unknownTokens > 0 ? renderUnknownTokens() : null}
          </div>
        </div>
        <div className='footer d-flex align-items-center justify-content-center flex-column'>
          <div className={`d-flex align-items-center icon-wrapper ${this.state.opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={this.lockWallet}>
            <i className='fa fa-lock token-icon' title='Lock wallet'></i>
            {this.state.opened && <span className='ellipsis'>Lock wallet</span>}
          </div>
          <div className={`d-flex align-items-center icon-wrapper ${this.state.opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={this.goToSettings}>
            <i className='fa fa-cog token-icon' title='Settings'></i>
            {this.state.opened && <span className='ellipsis'>Settings</span>}
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TokenBar);
