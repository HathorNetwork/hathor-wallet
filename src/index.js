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
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { GlobalModal } from './components/GlobalModal';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';

import store from "./store/index";
import { Provider } from "react-redux";

/*
 * We use a HashRouter for this application because when it is built for production we no longer interact with
 * a regular HTTP server, but instead with a filesystem.
 * @see https://reactrouter.com/en/main/routers/create-hash-router
 */
const routerInstance = createHashRouter([
  { path: '*', element: <ErrorWrapper /> },
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
