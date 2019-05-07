/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import hathorLib from 'hathor-wallet-utils';
import { VERSION } from '../constants';


/**
 * Component that renders the version of the wallet
 *
 * @memberof Components
 */
const Version = (props) => {
  return (
    <div className="d-flex flex-column version-wrapper align-items-center">
      <span>Version</span>
      <span>{VERSION}</span>
    </div>
  );
};

export default Version;
