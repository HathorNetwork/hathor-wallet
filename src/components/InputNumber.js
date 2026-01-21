/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useLayoutEffect, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector } from 'react-redux';
import { numberUtils } from "@hathor/wallet-lib";

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
      isNFT,
      onValueChange,
      requirePositive,
      ...otherProps
    },
    ref
  ) => {
    if (ref !== null) {
        // TODO: We should just convert InputNumber from a React.forwardRef to a normal React.Component,
        //  but we may do this in a separate PR
        const msg = 'do not use ref in InputNumber, instead use onValueChange'
        throw Error(msg)
    }
    const decimalPlaces = isNFT ? 0 : useSelector((state) => state.serverInfo.decimalPlaces);

    /**
     * Formats a number following the pattern 9,999.99
     *
     * @param {bigint} rawValue Number to be formatted
     *
     * @return {string} Formatted string
     */
    const format = useCallback((rawValue) => numberUtils.prettyValue(rawValue, decimalPlaces), [decimalPlaces]);

    const innerRef = useRef();
    const [value, setValue] = useState(defaultValue);

    /**
     * Put the caret always at the end.
     *
     * @param  {bigint} value Current input value
     */
    const updateCaretPosition = useCallback((value) => {
      setTimeout(() => {
        const { current } = innerRef;
        if (current) {
          current.selectionStart = format(value).length;
        }
      });
    }, [format]);

    /**
     * Listen keydown events while this component is focused overriding the default native input behavior.
     * Only digits and backspace are allowed.
     *
     * @param  {KeyboardEvent} evt Event carrying the keyboard key
     */
    const onKeyDown = useCallback((evt) =>
      setValue((value) => {
        const isNumberChar = /\d/.test(evt.key);
        const isBackspace = evt.key === "Backspace" || evt.key === "Delete";
        const isDeleteAll =
          isBackspace &&
          evt.target.selectionEnd - evt.target.selectionStart >= format(value).length;
        const isCtrlOrMeta = evt.ctrlKey || evt.metaKey;

        // Do not handle keyboard events when ctrlKey or metaKey are present
        if (isCtrlOrMeta) {
          return value;
        }

        let newValue = value;
        if (isDeleteAll) {
          newValue = 0n;
        } else if (isNumberChar) {
          newValue = value * 10n + BigInt(evt.key);
        } else if (isBackspace) {
          newValue = value / 10n;
        }
        updateCaretPosition(newValue);
        return newValue;
      }), [format, updateCaretPosition]);

    /**
     * Handle onClick events just to update the caret position.
     */
    const onClick = useCallback(() => setValue((currentValue) => {
      updateCaretPosition(currentValue);
      return currentValue;
    }), [updateCaretPosition]);

    /**
     * Listen paste events as the default behavior of inputs is overridden.
     *
     * @param  {ClipboardEvent} evt Event carrying a paste text
     *
     * @method InputNumber#onPaste
     */
    const onPaste = useCallback((evt) =>
      setValue(() => {
        const paste = (evt.clipboardData || window.clipboardData).getData("text");
        const newValue = BigInt(paste.replace(/\D/g, ''))
        updateCaretPosition(newValue);
        return newValue;
      }), [updateCaretPosition]);

    /**
     * Set listeners to keydown and to paste events.
     */
    useLayoutEffect(() => {
      const { current } = innerRef;
      if (current) {
        current.addEventListener("keydown", onKeyDown);
        current.addEventListener("paste", onPaste);
        current.addEventListener("click", onClick);
        return () => {
          current.removeEventListener("keydown", onKeyDown);
          current.removeEventListener("paste", onPaste);
          current.removeEventListener("click", onClick);
        };
      }
    }, [onKeyDown, onPaste, onClick]);

    /**
     * Call onValueChange every time the value changes, similarly the native onChange callback.
     */
    useEffect(() => {
      onValueChange(value);
      if (requirePositive && value <= 0) {
        innerRef.current.setCustomValidity('Must be a positive number.');
      } else {
        innerRef.current.setCustomValidity('');
      }
    }, [value, onValueChange, requirePositive]);

    return <input ref={innerRef} value={format(value)} onChange={() => {}} {...otherProps} type="text" />;
  }
);

InputNumber.propTypes = {
  /**
   * Same behavior of React input defaultValue
   */
  defaultValue: PropTypes.bigint,
  /**
   * Whether this is a NFT input
   */
  isNFT: PropTypes.bool,
  /**
   * Similar to onChange, but it receives the parsed value as single parameter
   */
  onValueChange: PropTypes.func,
  /**
   * If the input value is required to be a positive number, i.e. > 0
   */
  requirePositive: PropTypes.bool,
};

InputNumber.defaultProps = {
  defaultValue: 0n,
  isNFT: false,
  onValueChange: () => {},
  requirePositive: false,
};

export default InputNumber;
