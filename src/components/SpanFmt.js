/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

/**
 * This component it used to render a text using simple formatting rules.
 * It is useful for i18n to create meaningful strings for translators.
 *
 * Currently, it only supports bold using two asterisks before and after a
 * phrase, e.g., this is an example of **how to use** bold formatting.
 */
const SpanFmt = (props) => {
  const { children, ...otherProps } = props;
  const parts = children.split('**');
  const ret = [];
  if (parts.length % 2 === 0) {
    throw new Error(`invalid string: ${children}`);
  }
  for (let i = 0; i < parts.length; i += 1) {
    if (i % 2 === 0) {
      ret.push(parts[i]);
    } else {
      ret.push(<strong key={i}>{parts[i]}</strong>);
    }
  }
  return <span {...otherProps}>{ret}</span>;
};

export default SpanFmt;
