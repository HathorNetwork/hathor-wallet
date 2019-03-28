import React from 'react';
import HathorAlert from '../components/HathorAlert';


class SearchTx extends React.Component {
  handleKeyUp = (e) => {
    if (e.key === 'Enter') {
      this.search();
    }
  }

  search = () => {
    const hash = this.refs.txSearch.value;
    if (hash) {
      const regex = /[A-Fa-f\d]{64}/g;
      if (regex.test(hash)) {
        this.props.history.push(`/transaction/${hash}`);
      } else {
        this.showError();
      }
    }
  }

  showError = () => {
    this.refs.alertError.show(3000);
  }

  render = () => {
    return (
      <div className="d-flex flex-row align-items-center search-div col-12 col-md-6">
        <input className="form-control mr-2" type="search" placeholder="Find transaction/block by hash" aria-label="Search" ref="txSearch" onKeyUp={this.handleKeyUp} />
        <i className="fa fa-search pointer" onClick={this.search}></i>
        <HathorAlert ref="alertError" text="Invalid hash format" type="danger" />
      </div>
    );
  }
}

export default SearchTx;