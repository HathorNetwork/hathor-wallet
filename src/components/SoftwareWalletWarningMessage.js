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
      <p className="mt-4">Using a software wallet is not the safest method to store your tokens. Your data is exposed to an attack because it's connected to the internet.</p>
      <p className="mt-4">In case you want a safe method, you should have a hardware wallet (e.g. Ledger) and use it.</p>
    </div>
  )
}

export default SoftwareWalletWarningMessage;