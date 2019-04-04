import React from 'react';
import $ from 'jquery';
import helpers from '../utils/helpers';
import tokens from '../utils/tokens';
import ModalTokenInfo from './ModalTokenInfo';
import ModalConfirm from './ModalConfirm';
import ModalEditToken from './ModalEditToken';
import { connect } from "react-redux";
import { HATHOR_TOKEN_CONFIG } from '../constants';


const mapStateToProps = (state) => {
  return { selectedToken: state.selectedToken, tokens: state.tokens };
};

/**
 * Component that render the balance of the selected token
 *
 * @memberof Components
 */
class WalletBalance extends React.Component {

  /**
   * Called when user clicks on the info icon of the token, then opens the modal
   */
  infoClicked = () => {
    $('#tokenInfoModal').modal('show');
  }

  /**
   * Called when user clicks to unregister the token, then opens the modal
   */
  unregisterClicked = () => {
    $('#confirmModal').modal('show');
  }

  /**
   * When user confirms the unregister of the token, hide the modal and execute it
   */
  unregisterConfirmed = () => {
    $('#confirmModal').modal('hide');
    tokens.unregisterToken(this.props.selectedToken);
  }

  /**
   * Called when user clicks to edit the token, then  opens the modal
   */
  editClicked = () => {
    $('#editTokenModal').modal('show');
  }

  /**
   * When user finish editing the token, closes the modal
   */
  editSuccess = () => {
    $('#editTokenModal').modal('hide');
  }

  render = () => {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
    const symbol = token ? token.symbol : '';

    const renderBalance = () => {
      const renderTokenButtons = () => {
        return (
          <div className='ml-3'>
            <i className="fa fa-info-circle pointer" title="Open token information" onClick={this.infoClicked}></i>
            <i className="fa fa-pencil pointer ml-3" title="Edit token" onClick={this.editClicked}></i>
            <i className="fa fa-trash pointer ml-3" title="Unregister token" onClick={this.unregisterClicked}></i>
          </div>
        );
      }

      return (
        <div>
          <div className='token-wrapper d-flex flex-row align-items-center mb-3'>
            <p className='token-name mb-0'>
              <strong>{token ? token.name : ''}</strong>
            </p>
            {this.props.selectedToken !== HATHOR_TOKEN_CONFIG.uid && renderTokenButtons()}
          </div>
          <p><strong>Total:</strong> {helpers.prettyValue(this.props.balance.available + this.props.balance.locked)} {symbol}</p>
          <p><strong>Available:</strong> {helpers.prettyValue(this.props.balance.available)} {symbol}</p>
          <p><strong>Locked:</strong> {helpers.prettyValue(this.props.balance.locked)} {symbol}</p>
        </div>
      );
    }

    const getUnregisterBody = () => {
      return (
        <div>
          <p>Are you sure you want to unregister the token <strong>{token.name} ({token.symbol})</strong></p>
          <p>You won't lose your tokens, you just won't see this token on the side bar anymore</p>
        </div>
      )
    }

    return (
      <div>
        {this.props.balance && renderBalance()}
        <ModalTokenInfo />
        <ModalConfirm title="Unregister token" body={getUnregisterBody()} handleYes={this.unregisterConfirmed} />
        <ModalEditToken token={token} success={this.editSuccess} />
      </div>
    );
  }
};

export default connect(mapStateToProps)(WalletBalance);
