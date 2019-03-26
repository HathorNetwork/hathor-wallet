import React from 'react';
import Transactions from '../components/Transactions';


const TransactionList = (props) => {
  return (
    <div className="content-wrapper">
      <Transactions type="tx" {...props} />
    </div>
  );
}

export default TransactionList;