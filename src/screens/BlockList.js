import React from 'react';
import Transactions from '../components/Transactions';


const BlockList = (props) => {
  return (
    <div className="content-wrapper">
      <Transactions type="block" {...props} />
    </div>
  );
}

export default BlockList;