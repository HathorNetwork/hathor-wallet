import React from 'react';
import HathorAlert from '../components/HathorAlert';
import walletApi from '../api/wallet';
import transaction from '../utils/transaction';
import AddressError from '../utils/errors';


class SearchTx extends React.Component {
  state = { filtered: false };

  handleKeyUp = (e) => {
    if (e.key === 'Enter') {
      this.search();
    }
  }

  search = () => {
    const text = this.refs.txSearch.value;
    if (text) {
      const regex = /[A-Fa-f\d]{64}/g;
      if (regex.test(text)) {
        // Search for tx id
        this.props.history.push(`/transaction/${text}`);
      } else {
        // Search for address
        try {
          const addressBytes = transaction.decodeAddress(text);
          if (transaction.validateAddress(text, addressBytes)) {
            this.searchAddress(text);
          }
        } catch(e) {
          if (e instanceof AddressError) {
            this.showError();
          } else {
            // Unhandled error
            throw e;
          }
        }
      }
    } else {
      if (this.state.filtered) {
        // Was filtered, so now we need to reset data
        this.setState({ filtered: false });
        this.props.resetData();
      }
    }
  }

  searchAddress = (address) => {
    walletApi.getAddressHistory([address], (response) => {
      this.props.newData(response.history);
      this.setState({ filtered: true });
    });
  }

  showError = () => {
    this.refs.alertError.show(3000);
  }

  render = () => {
    return (
      <div className="d-flex flex-row align-items-center search-div col-12 col-md-6">
        <input className="form-control mr-2" type="search" placeholder="Find transaction/block by hash or address" aria-label="Search" ref="txSearch" onKeyUp={this.handleKeyUp} />
        <i className="fa fa-search pointer" onClick={this.search}></i>
        <HathorAlert ref="alertError" text="Invalid address and hash format" type="danger" />
      </div>
    );
  }
}

export default SearchTx;