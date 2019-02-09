import React from 'react';
import helpers from '../utils/helpers';
import { HATHOR_TOKEN_UID } from '../constants';

const WalletBalance = ({balance}) => {
  const renderBalance = () => {
    // TODO Show wallet balance for all tokens
    let hathorBalance = (HATHOR_TOKEN_UID in balance) ? balance[HATHOR_TOKEN_UID] : {'available': 0, 'locked': 0};
    return (
      <div>
        <p><strong>Total:</strong> {helpers.prettyValue(hathorBalance.available + hathorBalance.locked)} hathor{(hathorBalance.available + hathorBalance.locked)  === 1 ? '' : 's'}</p>
        <p><strong>Available:</strong> {helpers.prettyValue(hathorBalance.available)} hathor{hathorBalance.available === 1 ? '' : 's'}</p>
        <p><strong>Locked:</strong> {helpers.prettyValue(hathorBalance.locked)} hathor{hathorBalance.locked === 1 ? '' : 's'}</p>
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