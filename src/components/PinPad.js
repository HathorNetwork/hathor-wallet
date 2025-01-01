/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
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
  }, []);

  const animateErase = (currentPin) => {
    if (currentPin.length === 0) {
      setIsErasing(false);
      return;
    }

    setTimeout(() => {
      setPin(currentPin.slice(0, -1));
      animateErase(currentPin.slice(0, -1));
    }, ERASE_DELAY);
  };

  const handleNumberClick = (number) => {
    if (pin.length < PIN_LENGTH && !isErasing) {
      const newPin = pin + number;
      setPin(newPin);
      setErrorMessage('');
      
      if (newPin.length === PIN_LENGTH) {
        validateAndSubmitPin(newPin);
      }
    }
  };

  const validateAndSubmitPin = async (pinToValidate) => {
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
  };

  const handleDelete = () => {
    if (!isErasing) {
      setPin(pin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const handleClear = () => {
    if (!isErasing) {
      setPin('');
      setErrorMessage('');
    }
  };

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
    <div className="modal fade" id={modalId} tabIndex="-1" role="dialog" aria-labelledby={modalId} aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
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