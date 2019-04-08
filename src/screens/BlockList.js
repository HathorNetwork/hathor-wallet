/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
