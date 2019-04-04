import React from 'react';
import Transactions from '../components/Transactions';

/**
 * List of blocks in explorer
 *
 * @memberof Screens
 */
const BlockList = (props) => {
  return (
    <div className="content-wrapper">
      <Transactions type="block" {...props} />
    </div>
  );
}

export default BlockList;