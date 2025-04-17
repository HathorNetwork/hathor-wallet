/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from 'jquery';
import React, { useState, createContext, useContext, useEffect } from 'react';
import ModalAlert from './ModalAlert';
import ModalAddressQRCode from './ModalAddressQRCode';
import ModalAddToken from './ModalAddToken';
import ModalAddManyTokens from './ModalAddManyTokens';
import ModalAlertNotSupported from './ModalAlertNotSupported';
import ModalConfirm from './ModalConfirm';
import ModalBackupWords from './ModalBackupWords';
import ModalLedgerResetTokenSignatures from './ModalLedgerResetTokenSignatures';
import ModalResetAllData from './ModalResetAllData';
import ModalLedgerSignToken from './ModalLedgerSignToken';
import ModalConfirmTestnet from './ModalConfirmTestnet';
import ModalConfirmClearStorage from './ModalConfirmClearStorage';
import ModalSendTx from './ModalSendTx';
import ModalUnregisteredTokenInfo from './ModalUnregisteredTokenInfo';
import ModalPin from "./ModalPin";
import ModalRegisterNanoContract from "./nano-contract/ModalRegisterNanoContract";
import ModalChangeAddress from "./nano-contract/ModalChangeAddress";
import ModalConfirmUnregister from "./nano-contract/ModalConfirmUnregister";
import ModalSelectAddressToSignData from "./nano-contract/ModalSelectAddressToSignData";
import ModalSelectAddressToSignTx from "./nano-contract/ModalSelectAddressToSignTx";
import { ModalAtomicSend } from "./atomic-swap/ModalAtomicSend";
import { ModalAtomicReceive } from "./atomic-swap/ModalAtomicReceive";
import { ModalAtomicExternalChange } from "./atomic-swap/ExternalChangeModal";
import { ReownModal } from './Reown/ReownModal';
import { setModalContext } from '../sagas/modal';
import { PinPad } from './PinPad';
import { NanoContractFeedbackModal } from './Reown/NanoContractFeedbackModal';
import { TokenCreationFeedbackModal } from './Reown/TokenCreationFeedbackModal';
import { MessageSigningFeedbackModal } from './Reown/MessageSigningFeedbackModal';
import { TransactionFeedbackModal } from './Reown/TransactionFeedbackModal';
import ModalError from './ModalError';

const initialState = {
  showModal: () => {},
  hideModal: () => {},
  store: {},
};

export const MODAL_TYPES = {
  'ALERT': 'ALERT',
  'ADDRESS_QR_CODE': 'ADDRESS_QR_CODE',
  'MODAL_ADD_TOKEN': 'MODAL_ADD_TOKEN',
  'ADD_MANY_TOKENS': 'ADD_MANY_TOKENS',
  'ALERT_NOT_SUPPORTED': 'ALERT_NOT_SUPPORTED',
  'CONFIRM': 'CONFIRM',
  'BACKUP_WORDS': 'BACKUP_WORDS',
  'RESET_TOKEN_SIGNATURES': 'RESET_TOKEN_SIGNATURES',
  'RESET_ALL_DATA': 'RESET_ALL_DATA',
  'LEDGER_SIGN_TOKEN': 'LEDGER_SIGN_TOKEN',
  'CONFIRM_TESTNET': 'CONFIRM_TESTNET',
  'CONFIRM_CLEAR_STORAGE': 'CONFIRM_CLEAR_STORAGE',
  'SEND_TX': 'SEND_TX',
  'UNREGISTERED_TOKEN_INFO': 'UNREGISTERED_TOKEN_INFO',
  'PIN': 'PIN',
  'ATOMIC_SEND': 'ATOMIC_SEND',
  'ATOMIC_RECEIVE': 'ATOMIC_RECEIVE',
  'ATOMIC_EXTERNAL_CHANGE': 'ATOMIC_EXTERNAL_CHANGE',
  'NANOCONTRACT_REGISTER': 'NANOCONTRACT_REGISTER',
  'NANOCONTRACT_CHANGE_ADDRESS': 'NANOCONTRACT_CHANGE_ADDRESS',
  'NANOCONTRACT_CONFIRM_UNREGISTER': 'NANOCONTRACT_CONFIRM_UNREGISTER',
  'NANOCONTRACT_SELECT_ADDRESS_TO_SIGN_DATA': 'NANOCONTRACT_SELECT_ADDRESS_TO_SIGN_DATA',
  'NANOCONTRACT_SELECT_ADDRESS_TO_SIGN_TX': 'NANOCONTRACT_SELECT_ADDRESS_TO_SIGN_TX',
  'REOWN': 'REOWN',
  'PIN_PAD': 'PIN_PAD',
  'NANO_CONTRACT_FEEDBACK': 'NANO_CONTRACT_FEEDBACK',
  'TRANSACTION_FEEDBACK': 'TRANSACTION_FEEDBACK',
  'TOKEN_CREATION_FEEDBACK': 'TOKEN_CREATION_FEEDBACK',
  'MESSAGE_SIGNING_FEEDBACK': 'MESSAGE_SIGNING_FEEDBACK',
  'ERROR_MODAL': 'ERROR_MODAL',
};

export const MODAL_COMPONENTS = {
  [MODAL_TYPES.ALERT]: ModalAlert,
  [MODAL_TYPES.ADDRESS_QR_CODE]: ModalAddressQRCode,
  [MODAL_TYPES.MODAL_ADD_TOKEN]: ModalAddToken,
  [MODAL_TYPES.ADD_MANY_TOKENS]: ModalAddManyTokens,
  [MODAL_TYPES.ALERT_NOT_SUPPORTED]: ModalAlertNotSupported,
  [MODAL_TYPES.CONFIRM]: ModalConfirm,
  [MODAL_TYPES.BACKUP_WORDS]: ModalBackupWords,
  [MODAL_TYPES.RESET_TOKEN_SIGNATURES]: ModalLedgerResetTokenSignatures,
  [MODAL_TYPES.RESET_ALL_DATA]: ModalResetAllData,
  [MODAL_TYPES.LEDGER_SIGN_TOKEN]: ModalLedgerSignToken,
  [MODAL_TYPES.CONFIRM_TESTNET]: ModalConfirmTestnet,
  [MODAL_TYPES.CONFIRM_CLEAR_STORAGE]: ModalConfirmClearStorage,
  [MODAL_TYPES.SEND_TX]: ModalSendTx,
  [MODAL_TYPES.UNREGISTERED_TOKEN_INFO]: ModalUnregisteredTokenInfo,
  [MODAL_TYPES.PIN]: ModalPin,
  [MODAL_TYPES.ATOMIC_SEND]: ModalAtomicSend,
  [MODAL_TYPES.ATOMIC_RECEIVE]: ModalAtomicReceive,
  [MODAL_TYPES.ATOMIC_EXTERNAL_CHANGE]: ModalAtomicExternalChange,
  [MODAL_TYPES.NANOCONTRACT_REGISTER]: ModalRegisterNanoContract,
  [MODAL_TYPES.NANOCONTRACT_CHANGE_ADDRESS]: ModalChangeAddress,
  [MODAL_TYPES.NANOCONTRACT_CONFIRM_UNREGISTER]: ModalConfirmUnregister,
  [MODAL_TYPES.NANOCONTRACT_SELECT_ADDRESS_TO_SIGN_DATA]: ModalSelectAddressToSignData,
  [MODAL_TYPES.NANOCONTRACT_SELECT_ADDRESS_TO_SIGN_TX]: ModalSelectAddressToSignTx,
  [MODAL_TYPES.REOWN]: ReownModal,
  [MODAL_TYPES.PIN_PAD]: PinPad,
  [MODAL_TYPES.NANO_CONTRACT_FEEDBACK]: NanoContractFeedbackModal,
  [MODAL_TYPES.TRANSACTION_FEEDBACK]: TransactionFeedbackModal,
  [MODAL_TYPES.TOKEN_CREATION_FEEDBACK]: TokenCreationFeedbackModal,
  [MODAL_TYPES.MESSAGE_SIGNING_FEEDBACK]: MessageSigningFeedbackModal,
  [MODAL_TYPES.ERROR_MODAL]: ModalError,
};

export const GlobalModalContext = createContext(initialState);

export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal = ({ children }) => {
  const [store, setStore] = useState();

  /**
   * @param {string|unknown} [domSelector] Optional parameter, will attempt to hide this modal if informed with a string
   */
  const hideModal = (domSelector) => {
    setStore({
      ...store,
      modalType: null,
      modalProps: {},
    });

    // jQuery aparently is not happy with us destroying the DOM
    // before he is done with his modal hide events, so to prevent
    // a bug where the backdrop some times gets stuck even after the
    // modal is closed, we can just remove it:
    $('.modal-backdrop').fadeOut(150);

    // Same problem happens with the class jquery adds to the body,
    // causing the app to stop scrolling. We can just remove it
    $('body').removeClass('modal-open');

    // Managing the modal lifecycle, if the string parameter is offered
    if (typeof domSelector === 'string') {
      const domElement = $(domSelector);
      domElement.modal('hide');
      domElement.off();
    }
  };

  /* Without this setTimeout, calling showModal right after hiding an existing
   * modal will not display the backdrop due to a race condition. setTimeout
   * sends this method to the end of the event loop, making sure that it is
   * executed after the previous jquery calls
   */
  const showModal = (modalType, modalProps = {}) => setTimeout(() => {
    const { preventClose = true, ...otherProps } = modalProps;

    setStore({
      ...store,
      modalType,
      modalProps: {
        ...otherProps,
        preventClose,
      },
    });

    // Sometimes the modal backdrop won't show up again after being
    // removed forcefully by the hideModal, so we should just show it
    // again.
    $('.modal-backdrop').fadeIn(150);
  }, 0);

  /**
   * Helper method to handle the modal's DOM lifecycle: showing the modal and
   * treating its hide and dispose methods properly.
   * @param {string} domSelector jQuery selector to find the modal's DOM
   */
  const manageDomLifecycle = (domSelector) => {
    const domElement = $(domSelector);

    // Configure its teardown
    domElement.on('hidden.bs.modal', (e) => {
      hideModal(domSelector);
    });

    domElement.modal({
      show: true,
      backdrop: store.modalProps.preventClose ? 'static' : true, // 'static' prevents closing when clicking outside
      keyboard: !store.modalProps.preventClose // false prevents closing with escape key
    });
  }

  useEffect(() => {
    setModalContext({
      showModal,
      hideModal,
    });
  }, []);

  const renderComponent = () => {
    const { modalType } = store || {};
    const ModalComponent = MODAL_COMPONENTS[modalType];

    if (!modalType || !ModalComponent) {
      return null;
    }

    const componentProps = {
      onClose: hideModal,
      manageDomLifecycle,
      ...store.modalProps,
    };

    return (
      <ModalComponent {...componentProps} />
    );
  };

  return (
    <GlobalModalContext.Provider value={{
      store,
      showModal,
      hideModal,
    }}>
      {renderComponent()}
      { children }
    </GlobalModalContext.Provider>
  );
};
