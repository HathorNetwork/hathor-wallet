/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef } from 'react';
import { t } from 'ttag';
import { WEB3AUTH_ERROR_TYPES } from '../sagas/web3auth';
import { useGlobalModalContext, MODAL_TYPES } from './GlobalModal';

/**
 * Copy + observability tag for each Web3Auth error variant. USER_CANCELLED is
 * intentionally absent: the saga swallows it silently before reaching this
 * component, so any errorType reaching us is a real failure worth surfacing.
 */
const COPY = {
  [WEB3AUTH_ERROR_TYPES.NETWORK]: {
    title: () => t`Connection problem`,
    body: () => t`Could not reach Web3Auth. Check your internet connection and try again.`,
    sentryTag: 'network',
  },
  [WEB3AUTH_ERROR_TYPES.VERIFIER_CONFIG]: {
    title: () => t`Sign-in temporarily unavailable`,
    body: () => t`There is a configuration issue with Web3Auth. The Hathor team has been notified.`,
    sentryTag: 'config',
  },
  [WEB3AUTH_ERROR_TYPES.MFA_REQUIRED]: {
    title: () => t`Set up a recovery factor`,
    body: () => t`Hathor wallets require a recovery factor to protect your funds. You can configure it in the next step.`,
    sentryTag: 'mfa',
  },
  [WEB3AUTH_ERROR_TYPES.KEY_DERIVATION]: {
    title: () => t`Could not derive your wallet`,
    body: () => t`Something went wrong while preparing your wallet. Please contact support.`,
    sentryTag: 'key',
  },
  [WEB3AUTH_ERROR_TYPES.UNKNOWN]: {
    title: () => t`Sign-in failed`,
    body: () => t`Something unexpected happened. Please try again.`,
    sentryTag: 'unknown',
  },
};

/**
 * Web3Auth error dialog.
 *
 * Built on top of the project's GlobalModal (MODAL_TYPES.ALERT → ModalAlert).
 * Each error type maps to a copy pair (title + body) and an observability tag.
 * Logs the error context on mount so the team has telemetry even when the
 * user dismisses without action.
 *
 * Behavior:
 *   - Mount: show the alert modal with retry button.
 *   - Click "Try again": call onRetry, then close the modal.
 *   - Dismiss any other way (Bootstrap "hidden.bs.modal" hook): call onCancel.
 *   - Unmount: ensure the modal is hidden.
 *
 * Because GlobalModal auto-injects an onClose handler that fires on every
 * Bootstrap "hidden.bs.modal" event (including the one triggered by the
 * primary button), we use a ref flag to ensure onRetry and onCancel are
 * mutually exclusive.
 *
 * @param {object} props
 * @param {string} props.errorType One of WEB3AUTH_ERROR_TYPES values
 * @param {Function} [props.onRetry] Called when the user taps "Try again"
 * @param {Function} [props.onCancel] Called when the user dismisses the dialog
 */
function Web3AuthErrorDialog({ errorType, onRetry, onCancel }) {
  const { showModal, hideModal } = useGlobalModalContext();
  const copy = COPY[errorType] || COPY[WEB3AUTH_ERROR_TYPES.UNKNOWN];
  // Latch flag: when the user clicks "Try again" we route through onRetry and
  // suppress the auto-injected onClose (which would otherwise fire onCancel
  // too because the primary button calls $.modal('hide') internally).
  const retriedRef = useRef(false);

  useEffect(() => {
    retriedRef.current = false;

    // Observability hook. Sentry forwarding is left to the existing logger
    // (sentry breadcrumbs); we just emit a tagged log here.
    // eslint-disable-next-line no-console
    console.warn('[web3auth] error dialog shown', {
      errorType,
      category: copy.sentryTag,
    });

    showModal(MODAL_TYPES.ALERT, {
      id: 'web3authErrorModal',
      title: copy.title(),
      body: <p>{copy.body()}</p>,
      buttonName: t`Try again`,
      handleButton: () => {
        retriedRef.current = true;
        hideModal();
        if (typeof onRetry === 'function') {
          onRetry();
        }
      },
      // ModalAlert wires the GlobalModal-injected onClose to Bootstrap's
      // hidden.bs.modal event, so this fires on backdrop click, ESC, or after
      // the primary button hides the modal. Skip the cancel path if a retry
      // already happened.
      onClose: () => {
        if (retriedRef.current) {
          retriedRef.current = false;
          return;
        }
        if (typeof onCancel === 'function') {
          onCancel();
        }
      },
    });

    return () => {
      hideModal();
    };
  }, [errorType]);

  return null;
}

export default Web3AuthErrorDialog;
