/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { t } from 'ttag';
import LOCAL_STORE from '../storage';

const PIN_LENGTH = 6;
const ERASE_DELAY = 100; // 100ms between each digit erasure

export function PinPad({ manageDomLifecycle, onComplete, onCancel }) {
  const modalId = 'pinPadModal';
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    manageDomLifecycle(`#${modalId}`);
    
    // Set a short timeout to ensure the modal is fully rendered before trying to focus
    const focusTimer = setTimeout(() => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        modalElement.setAttribute('tabindex', '-1');
        modalElement.focus();
      }
    }, 100);
    
    return () => {
      clearTimeout(focusTimer);
    };
  }, [modalId, manageDomLifecycle]);

  const animateEraseRef = useRef();

  const animateErase = useCallback((currentPin) => {
    if (currentPin.length === 0) {
      setIsErasing(false);
      return;
    }

    setTimeout(() => {
      setPin(currentPin.slice(0, -1));
      if (animateEraseRef.current) {
        animateEraseRef.current(currentPin.slice(0, -1));
      }
    }, ERASE_DELAY);
  }, []);

  useEffect(() => {
    animateEraseRef.current = animateErase;
  }, [animateErase]);

  const validateAndSubmitPin = useCallback(async (pinToValidate) => {
    try {
      if (!await LOCAL_STORE.checkPin(pinToValidate)) {
        setErrorMessage(t`Invalid PIN`);
        setIsErasing(true);
        animateErase(pinToValidate);
        return;
      }
      onComplete(pinToValidate);
    } catch (error) {
      setErrorMessage(t`Error validating PIN`);
      setIsErasing(true);
      animateErase(pinToValidate);
    }
  }, [onComplete, animateErase]);

  const handleNumberClick = useCallback((number) => {
    if (pin.length < PIN_LENGTH && !isErasing) {
      const newPin = pin + number;
      setPin(newPin);
      setErrorMessage('');
      
      if (newPin.length === PIN_LENGTH) {
        validateAndSubmitPin(newPin);
      }
    }
  }, [pin, isErasing, validateAndSubmitPin]);

  const handleDelete = useCallback(() => {
    if (!isErasing) {
      setPin(pin.slice(0, -1));
      setErrorMessage('');
    }
  }, [pin, isErasing]);

  const handleClear = useCallback(() => {
    if (!isErasing) {
      setPin('');
      setErrorMessage('');
    }
  }, [isErasing]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e) => {
    if (isErasing) return;

    // Handle number keys (both top row and numpad)
    if ((/^[0-9]$/.test(e.key) || (e.keyCode >= 96 && e.keyCode <= 105)) && pin.length < PIN_LENGTH) {
      // Get the actual number regardless of numpad or top row
      const number = e.keyCode >= 96 && e.keyCode <= 105 
        ? String(e.keyCode - 96)
        : e.key;
      
      handleNumberClick(number);
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      handleDelete();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      onCancel();
      e.preventDefault();
    } else if (e.key === 'Enter' && pin.length === PIN_LENGTH) {
      validateAndSubmitPin(pin);
      e.preventDefault(); // Prevent default behavior
    }
  }, [pin, isErasing, onCancel, handleNumberClick, handleDelete, validateAndSubmitPin]);

  // Accept keyboard input
  useEffect(() => {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      return;
    }
    
    // Add event listener directly to the modal element
    modalElement.addEventListener('keydown', handleKeyDown);
    
    // Set focus to the modal to capture keyboard events
    modalElement.setAttribute('tabindex', '-1');
    modalElement.focus();
    
    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, modalId]);

  const renderPinDisplay = () => (
    <div className="d-flex flex-column align-items-center mb-4">
      <div className="d-flex justify-content-center">
        {Array(PIN_LENGTH).fill(0).map((_, index) => (
          <div
            key={index}
            className="mx-1 rounded-circle"
            style={{
              width: '12px',
              height: '12px',
              background: index < pin.length ? '#000' : '#ddd',
            }}
          />
        ))}
      </div>
      {errorMessage && (
        <div className="text-danger mt-2">
          {errorMessage}
        </div>
      )}
      <div className="text-muted mt-2 small">
        <i className="fa fa-keyboard-o mr-1"></i>
        {t`You can use your keyboard to enter PIN`}
      </div>
    </div>
  );

  const renderButton = (content, onClick, className = '') => (
    <button
      type="button"
      className={`btn btn-outline-secondary rounded-circle p-0 ${className}`}
      style={{ width: '60px', height: '60px', margin: '5px' }}
      onClick={onClick}
      disabled={isErasing}
    >
      {content}
    </button>
  );

  return (
    <div 
      className="modal fade" 
      id={modalId} 
      tabIndex="-1" 
      role="dialog" 
      aria-labelledby={modalId} 
      aria-hidden="true"
    >
      <div className="modal-dialog" role="document">
        <div 
          className="modal-content" 
          tabIndex="0" 
          onKeyDown={handleKeyDown}
        >
          <div className="modal-header">
            <h5 className="modal-title">{t`Enter your PIN`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onCancel}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <div className="text-center">
              {renderPinDisplay()}
              
              <div className="d-flex flex-column align-items-center">
                <div className="d-flex justify-content-center flex-wrap" style={{ maxWidth: '220px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
                    renderButton(number, () => handleNumberClick(number.toString()))
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-circle p-0"
                    style={{ width: '60px', height: '60px', margin: '5px' }}
                    onClick={handleClear}
                    disabled={isErasing}
                  >
                    <i className="fa fa-times"></i>
                  </button>
                  {renderButton('0', () => handleNumberClick('0'))}
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-circle p-0"
                    style={{ width: '60px', height: '60px', margin: '5px' }}
                    onClick={handleDelete}
                    disabled={isErasing}
                  >
                    <i className="fa fa-long-arrow-left"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isErasing}
            >
              {t`Cancel`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
