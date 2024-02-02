/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import './i18nInit';
import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorWrapper from './ErrorWrapper';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GlobalModal } from './components/GlobalModal';
import TokenBar from './components/TokenBar';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';

import store from "./store/index";
import { Provider } from "react-redux";

const routerInstance = createBrowserRouter([
  { element: <TokenBar /> },
  { element: <ErrorWrapper /> },
])

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <GlobalModal>
      <RouterProvider router={routerInstance} />
    </GlobalModal>
  </Provider>
);
