/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactLoading from 'react-loading';
import colors from '../index.module.scss';

const defaults = {
  width: 18,
  height: 18,
  delay: 500,
  color: colors.purpleHathor,
  type: 'spin',
  className: 'loading-inline',
};

export default function Loading(props) {
  const attributes = {
    ...defaults,
    ...props,
  };
  return <ReactLoading
    type={attributes.type}
    className={attributes.className}
    width={attributes.width}
    height={attributes.height}
    color={attributes.color}
    delay={attributes.delay} />
}
