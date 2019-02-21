import React from 'react';
import helpers from '../utils/helpers';
import { HATHOR_TOKEN_UID } from '../constants';

const WalletBalance = ({balance}) => {
  const renderBalance = () => {
    // TODO Show wallet balance for all tokens
    let hathorBalance = (HATHOR_TOKEN_UID in balance) ? balance[HATHOR_TOKEN_UID] : {'available': 0, 'locked': 0};
    return (
      <div>
        <p><strong>Total:</strong> {helpers.prettyValue(hathorBalance.available + hathorBalance.locked)} {helpers.plural(parseFloat(helpers.prettyValue(hathorBalance.available + hathorBalance.locked)), 'hathor', 'hathors')}</p>
        <p><strong>Available:</strong> {helpers.prettyValue(hathorBalance.available)} {helpers.plural(parseFloat(helpers.prettyValue(hathorBalance.available)), 'hathor', 'hathors')}</p>
        <p><strong>Locked:</strong> {helpers.prettyValue(hathorBalance.locked)} {helpers.plural(parseFloat(helpers.prettyValue(hathorBalance.locked)), 'hathor', 'hathors')}</p>
      </div>
    );
  }

  return (
    <div>
      {balance && renderBalance()}
    </div>
  );
};

export default WalletBalance;