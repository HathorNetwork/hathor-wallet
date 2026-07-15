/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Render a React component wrapped in the providers it expects in production:
 *   - Redux Provider with a preloaded test store
 *   - MemoryRouter for react-router-dom v6
 *
 * Returns the standard @testing-library/react render result, plus the store
 * reference so tests can dispatch actions or read state mid-test.
 *
 * Refs RFC 0001 (auto-qa) § Helpers.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createTestStore } from './createTestStore';

/**
 * @param {React.ReactElement} ui  Component to render.
 * @param {object} [options]
 * @param {object} [options.preloadedState] Forwarded to createTestStore.
 * @param {object} [options.store] Use this store instead of creating one. When
 *   both `store` and `preloadedState` are passed, `store` wins.
 * @param {string[]} [options.initialEntries] Router initial history. Defaults to ['/'].
 * @param {import('@testing-library/react').RenderOptions} [options.renderOptions]
 * @returns The render result, augmented with `{ store }`.
 */
export function renderWithProviders(
  ui,
  {
    preloadedState,
    store,
    initialEntries = ['/'],
    ...renderOptions
  } = {},
) {
  const { store: testStore } = store
    ? { store }
    : createTestStore(preloadedState);

  function Wrapper({ children }) {
    return (
      <Provider store={testStore}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }

  return {
    store: testStore,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export default renderWithProviders;
