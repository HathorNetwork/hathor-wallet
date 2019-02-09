import React from 'react';
import { VERSION } from '../constants';


const Version = (props) => {
  return (
    <div className="d-flex flex-column version-wrapper align-items-center">
      <span>Version</span>
      <span>{VERSION}</span>
    </div>
  );
};

export default Version;