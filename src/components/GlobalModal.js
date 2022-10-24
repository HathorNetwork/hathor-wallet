import $ from 'jquery';
import React, { useState, createContext, useContext } from 'react';
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
};

export const GlobalModalContext = createContext(initialState);

export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal = ({ children }) => {
  const [store, setStore] = useState();

  const hideModal = () => {
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
  };

  const showModal = (modalType, modalProps = {}) => {
    setStore({
      ...store,
      modalType,
      modalProps,
    });

    // Sometimes the modal backdrop won't show up again after being
    // removed forcefully by the hideModal, so we should just show it
    // again.
    $('.modal-backdrop').fadeIn(150);
  };

  const renderComponent = () => {
    const { modalType } = store || {};
    const ModalComponent = MODAL_COMPONENTS[modalType];

    if (!modalType || !ModalComponent) {
      return null;
    }

    const componentProps = {
      onClose: hideModal,
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
