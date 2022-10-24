import React, { useState, createContext, useContext } from 'react';
import ModalAlert from './ModalAlert';
import ModalAddressQRCode from './ModalAddressQRCode';
import ModalAddToken from './ModalAddToken';
import ModalAddManyTokens from './ModalAddManyTokens';
import ModalAlertNotSupported from './ModalAlertNotSupported';

const initialState = {
  showModal: () => {},
  hideModal: () => {},
  store: {},
};

export const MODAL_TYPES = {
  'ADDRESS_QR_CODE': 'ADDRESS_QR_CODE',
  'MODAL_ADD_TOKEN': 'MODAL_ADD_TOKEN',
  'ADD_MANY_TOKENS': 'ADD_MANY_TOKENS',
  'ALERT_NOT_SUPPORTED': 'ALERT_NOT_SUPPORTED',
  'ALERT': 'ALERT',
};

export const MODAL_COMPONENTS = {
  [MODAL_TYPES.ALERT]: ModalAlert,
  [MODAL_TYPES.ADDRESS_QR_CODE]: ModalAddressQRCode,
  [MODAL_TYPES.MODAL_ADD_TOKEN]: ModalAddToken,
  [MODAL_TYPES.ADD_MANY_TOKENS]: ModalAddManyTokens,
  [MODAL_TYPES.ALERT_NOT_SUPPORTED]: ModalAlertNotSupported,
};

export const GlobalModalContext = createContext(initialState);

export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal = ({ children }) => {
  const [store, setStore] = useState();

  const showModal = (modalType, modalProps = {}) => {
    setStore({
      ...store,
      modalType,
      modalProps,
    });
  };

  const hideModal = () => {
    setStore({
      ...store,
      modalType: null,
      modalProps: {},
    });
  };

  const renderComponent = () => {
    const { modalProps, modalType } = store || {};
    const ModalComponent = MODAL_COMPONENTS[modalType];

    if (!modalType || !ModalComponent) {
      return null;
    }

    const componentProps = {
      ...store.modalProps,
      onClose: hideModal,
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
