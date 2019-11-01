/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';


/**
 * Component that shows a warning message if user decides to use a software wallet
 *
 * @memberof Components
 */
const SoftwareWalletWarningMessage = (props) => {
  return (
    <div>
      <p className="mt-4">Using a software wallet is not the safest way to secure your tokens. As your seed phrase is stored in your computer and it is connected to the internet, your seed phrase may be stolen by a virus.</p>
      <p className="mt-4">If you want a safer method, you can use a hardware wallet. We currently have support for Ledger.</p>
    </div>
  )
}

export default SoftwareWalletWarningMessage;
