import React from 'react';
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