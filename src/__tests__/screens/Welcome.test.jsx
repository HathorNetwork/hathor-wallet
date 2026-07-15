/**
 * Layer 3 — Component (happy path).
 *
 * Reference smoke test demonstrating the minimal screen-test pattern:
 *   - mount with renderWithProviders (Redux store + MemoryRouter)
 *   - assert the screen renders its baseline elements
 *
 * Feature-area PRs that add per-screen tests with state assertions follow
 * this shape and add `preloadedState` to renderWithProviders to drive UI
 * variants.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L3 (happy path)".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import Welcome from '../../screens/Welcome';

describe('Welcome screen — happy path render', () => {
  it('shows the welcome message and the call-to-action button', () => {
    renderWithProviders(<Welcome />);

    expect(screen.getByText(/Welcome to Hathor Wallet!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get started/i })).toBeInTheDocument();
  });

  it('starts with the terms-of-service checkbox unchecked', () => {
    renderWithProviders(<Welcome />);

    const checkbox = document.getElementById('confirmAgree');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });
});
