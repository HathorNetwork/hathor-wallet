/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import { WALLET_HISTORY_COUNT } from '../constants';
import helpers from '../utils/helpers';
import path from 'path';
import AddressList from '../components/AddressList';

/**
 * Screen that has a list of addresses of the wallet
 *
 * @memberof Screens
 */
function AllAddresses() {
  /**
   * Method called when user clicked on address in the list
   * Go to explorer address search page
   *
   * @param {Object} e Event for the click
   * @param {String} address Address to see page on explorer
   */
  const onAddressClick = (address) => {
    const url = path.join(helpers.getExplorerURL(), `address/${address}`);
    helpers.openExternalURL(url);
  }

  return (
    <div className="content-wrapper">
      <h2 className="mb-4">{t`Addresses`}</h2>
      <AddressList
        showNumberOfTransaction={true}
        onAddressClick={onAddressClick}
        count={WALLET_HISTORY_COUNT}
        isModal={false}
      />
    </div>
  )
}

export default AllAddresses;