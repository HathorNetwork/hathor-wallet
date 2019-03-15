import React from 'react';
import $ from 'jquery';
import helpers from '../utils/helpers';
import ModalTokenInfo from './ModalTokenInfo';
import { connect } from "react-redux";
import { HATHOR_TOKEN_CONFIG } from '../constants';


const mapStateToProps = (state) => {
  return { selectedToken: state.selectedToken, tokens: state.tokens };
};

class WalletBalance extends React.Component {

  infoClicked = () => {
    $('#tokenInfoModal').modal('show');
  }

  render = () => {
    const renderBalance = () => {
      const hathorBalance = (this.props.selectedToken in this.props.balance) ? this.props.balance[this.props.selectedToken] : {'available': 0, 'locked': 0};
      const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
      const symbol = token ? token.symbol : '';

      const renderInfoButton = () => {
        return (
          <i className="fa fa-info-circle pointer ml-2" title="Open token information" onClick={this.infoClicked}></i>
        );
      }

      return (
        <div>
          <p className='token-name'>
            <strong>{token ? token.name : ''}</strong>
            {this.props.selectedToken !== HATHOR_TOKEN_CONFIG.uid && renderInfoButton()}
          </p>
          <p><strong>Total:</strong> {helpers.prettyValue(hathorBalance.available + hathorBalance.locked)} {symbol}</p>
          <p><strong>Available:</strong> {helpers.prettyValue(hathorBalance.available)} {symbol}</p>
          <p><strong>Locked:</strong> {helpers.prettyValue(hathorBalance.locked)} {symbol}</p>
        </div>
      );
    }

    return (
      <div>
        {this.props.balance && renderBalance()}
        <ModalTokenInfo />
      </div>
    );
  }
};

export default connect(mapStateToProps)(WalletBalance);