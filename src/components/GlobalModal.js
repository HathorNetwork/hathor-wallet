import React, { useState, createContext, useContext } from 'react';
import ModalAlert from './ModalAlert';

const initialState = {
  showModal: () => {},
  hideModal: () => {},
  store: {},
};

export const MODAL_TYPES = {
  'ADDRESS_QR_CODE': 'ADDRESS_QR_CODE',
  'ALERT': 'ALERT',
};

export const MODAL_COMPONENTS = {
  [MODAL_TYPES.ALERT]: ModalAlert,
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

    return (
      <ModalComponent {...store.modalProps} />
    );
  };

  return (
    <GlobalModalContext.Provider value={{ store, showModal, hideModal }}>
      {renderComponent()}
      { children }
    </GlobalModalContext.Provider>
  );
};
