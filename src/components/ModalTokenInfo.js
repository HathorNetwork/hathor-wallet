import React from 'react';
import tokens from '../utils/tokens';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return {
    selectedToken: state.selectedToken,
    tokens: state.tokens
  };
};


class ModalTokenInfo extends React.Component {
  state = { successMessage: '', token: null };
  timer = null;

  componentWillUnmount = () => {
    // Preventing calling setState when the component is not mounted
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  componentDidMount = () => {
    this.getToken();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.selectedToken !== this.props.selectedToken) {
      this.getToken();
    }
  }

  getToken = () => {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
    this.setState({ token });
  }

  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.setState({ successMessage: 'Copied!' });
      this.timer = setTimeout(() => {
        this.setState({ successMessage: '' });
      }, 2000);
    }
  }

  getTokenConfigurationString = () => {
    return tokens.getConfigurationString(this.state.token.uid, this.state.token.name, this.state.token.symbol);
  }

  render = () => {
    const renderBody = () => {
      return (
        <div className="modal-body">
          <p><strong>UID:</strong>
            <CopyToClipboard text={this.state.token.uid} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-2" title="Copy UID"></i>
            </CopyToClipboard>
          </p>
          <span>{this.state.token.uid}</span>
          <p className="mt-3"><strong>Configuration String:</strong>
            <CopyToClipboard text={this.getTokenConfigurationString()} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-2" title="Copy configuration string"></i>
            </CopyToClipboard>
          </p>
          <span>{this.getTokenConfigurationString()}</span>
        </div>
      );
    }

    const renderTitle = () => {
      return `${this.state.token.name} (${this.state.token.symbol})`;
    }

    return (
      <div className="modal fade" id="tokenInfoModal" tabIndex="-1" role="dialog" aria-labelledby="tokenInfoModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{this.state.token && renderTitle()}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            {this.state.token && renderBody()}
            <div className="col-12 col-sm-10">
                <p className="text-success">
                  {this.state.successMessage}
                </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(ModalTokenInfo);