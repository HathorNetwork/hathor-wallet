/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

/**
 * It renders a card containing a input field for the data cotent as string,
 * and an action to remove the card.
 *
 * @param {Object} props
 * @property {MutableRefObject} dataInputRef Reference for input field value
 * @property {number} index Data output position in the list
 * @property {(index: number) => void} remove Callback to remove the data output from the list
 */
export const SendDataOutputOne = ({ dataInputRef, index, remove }) => (
  <div className='send-tokens-wrapper card'>
    <div className="outputs-wrapper">
      <label>{t`Data Output`}</label>
      <button
        type="button"
        className="text-danger remove-token-btn ml-3"
        onClick={() => remove(index)}
      >
        {t`Remove`}
      </button>
      <div className="input-group mb-3">
        <input
          className="form-control output-address col-5"
          type="text"
          ref={dataInputRef}
          placeholder={t`Data content`}
        />
      </div>
    </div>
  </div>
);
