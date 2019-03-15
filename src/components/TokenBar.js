import React from 'react';
import helpers from '../utils/helpers';
import wallet from '../utils/wallet';
import { connect } from "react-redux";
import { selectToken } from '../actions/index';


const mapStateToProps = (state) => {
  return { tokens: state.tokens, selectedToken: state.selectedToken, sortedHistory: state.sortedHistory };
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
      unknownTokens: 0,
    }
  }

  componentDidUpdate = (prevProps) => {
    this.updateUnknownTokens();
  }

  updateUnknownTokens = () => {
    const diffTokens = Object.keys(this.props.sortedHistory).length - this.props.tokens.length;
    if (diffTokens !== this.state.unknownTokens) {
      this.setState({ unknownTokens: diffTokens });
    }
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

  getBalance = (uid) => {
    let total = 0;
    if (uid in this.props.balance) {
      total = this.props.balance[uid].available + this.props.balance[uid].locked;
    }
    return helpers.prettyValue(total);
  }

  unknownClicked = () => {
    this.props.history.push('/unknown_tokens/');
  }

  render() {
    const renderTokens = () => {
      return this.props.tokens.map((token) => {
        return (
          <div key={token.uid} className={`token-wrapper ${token.uid === this.props.selectedToken ? 'selected' : ''}`} onClick={(e) => {this.tokenSelected(token.uid)}}>
            <span className='ellipsis'>{token.symbol} {this.state.opened && ` - ${this.getBalance(token.uid)}`}</span>
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
        <div title={`${this.state.unknownTokens} unknown ${helpers.plural(this.state.unknownTokens, 'token', 'tokens')}`} className={`d-flex align-items-center icon-wrapper ${this.state.opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={this.unknownClicked}>
          <div className="unknown-symbol d-flex flex-row align-items-center justify-content-center">{this.state.unknownTokens}</div>
          {this.state.opened && <span className='ellipsis'>Unknown {helpers.plural(this.state.unknownTokens, 'token', 'tokens')}</span>}
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
            {this.state.unknownTokens > 0 ? renderUnknownTokens() : null}
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