/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

/**
 * A reusable button component that copies text to clipboard
 * @param {Object} props Component props
 * @param {string} props.text Text to be copied
 * @param {string} [props.className] Additional CSS classes
 */
export const CopyButton = ({ text, className = '' }) => {
  if (!text) return null;

  return (
    <button 
      className={`btn btn-link btn-sm p-0 ml-2 ${className}`}
      onClick={() => navigator.clipboard.writeText(text)}
    >
      <i className="fa fa-copy"></i>
    </button>
  );
}; 