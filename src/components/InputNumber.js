/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useLayoutEffect, useRef, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * Component that enhances typing numbers
 *
 * @memberof Components
 * @component
 * @constructor
 * @example
 * const onValueChange = (value) => {
 *  alert(value);
 * }
 * return (
 *   <InputNumber onValueChange={onValueChange} />
 * )
 */
const InputNumber = React.forwardRef(
  (
    {
      defaultValue,
      precision,
      separator,
      locale,
      onValueChange,
      ...otherProps
    },
    ref
  ) => {
    const innerRef = ref || useRef();
    const [value, setValue] = useState(String(defaultValue));

    /**
     * Formats a string following the pattern 9,999.99. It decomposes rawValue into decimal and fractional parts, mainly to add the thousands separator.
     *
     * @param {string} rawValue String to be formatted
     *
     * @return {string} Formatted string
     */
    const format = (rawValue = "") => {
      const value = rawValue.replace(/[^\d]/g, "").padStart(precision + 1, "0");
      const decimalPart = Intl.NumberFormat(locale).format(
        value.substr(0, value.length - precision)
      );
      const fractionalPart = value.substr(value.length - precision);
      return `${decimalPart}${separator}${fractionalPart}`;
    };

    /**
     * Listen keydown events while this component is focused overring the default native input behavior.
     * Only digits and backspace are allowed.
     *
     * @param  {KeyboardEvent} evt Event carrying the keyboard key
     */
    const onKeyDown = (evt) =>
      setValue((value) => {
        const isNumberChar = /\d/.test(evt.key);
        const isBackspace = evt.key === "Backspace";
        if (isNumberChar) {
          return value.concat(evt.key);
        }
        if (isBackspace) {
          return value.slice(0, -1);
        }
        return value;
      });

    /**
     * Listen paste events as the default behavior of inputs is overrided.
     *
     * @param  {ClipboardEvent} evt Event carrying a paste text
     *
     * @method InputNumber#onPaste
     */
    const onPaste = (evt) =>
      setValue(() => {
        const paste = (evt.clipboardData || window.clipboardData).getData(
          "text"
        );
        return paste;
      });

    /**
     * Set listeners to keydown and to paste events.
     */
    useLayoutEffect(() => {
      const { current } = innerRef;
      if (current) {
        current.addEventListener("keydown", onKeyDown);
        current.addEventListener("paste", onPaste);
        return () => {
          current.removeEventListener("keydown", onKeyDown);
          current.removeEventListener("paste", onPaste);
        };
      }
    }, []);

    /**
     * Call onValueChange every time the value changes, similarly the native onChange callback.
     */
    useEffect(() => {
      const parsedValue =
        Number(value.replace(/[^\d]/g, "")) / Math.pow(10, precision);
      onValueChange(parsedValue);
    }, [value]);

    return (
      <input ref={innerRef} value={format(value)} {...otherProps} type="text" />
    );
  }
);

InputNumber.propTypes = {
  /**
   * Same behavior of React input defaultValue
   */
  defaultValue: PropTypes.string,
  /**
   * Number of digits after the separator
   */
  precision: PropTypes.number,
  /**
   * Generally a dot or a comma char
   */
  separator: PropTypes.string,
  /**
   * Locale (e.g.: 'en-US', 'pt-br'). Must be used in conjunction with `separator`
   */
  locale: PropTypes.string,
  /**
   * Similar to onChange, but it receives the parsed value as single parameter
   */
  onValueChange: PropTypes.func,
  /**
   * Same behavior of React input onChange
   */
  onChange: PropTypes.func,
};

InputNumber.defaultProps = {
  defaultValue: "",
  precision: 2,
  separator: ".",
  locale: "en-US",
  onValueChange: () => {},
  onChange: () => {},
};

export default InputNumber;
