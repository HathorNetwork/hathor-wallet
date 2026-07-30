/**
 * Layer 3 — Component (navigation).
 *
 * Reference smoke test demonstrating how to assert that a user action
 * triggers a navigation. WalletType has two buttons that navigate to
 * different routes; mocking useNavigate lets the test see exactly what was
 * requested without rendering the destination screens.
 *
 * Pattern points worth copying for future feature-area PRs:
 *   - The `mock`-prefixed name on `mockNavigate` is required for the jest
 *     hoisting machinery to allow it inside the `jest.mock` factory.
 *   - `jest.requireActual('react-router-dom')` preserves everything else
 *     (Link, MemoryRouter, useLocation) so the rest of the test runs as if
 *     react-router-dom were untouched.
 *   - The test uses `getByRole('button', { name: ... })` rather than
 *     `getByText(...)` so the matcher is scoped to interactive elements,
 *     avoiding the "found multiple elements" failure mode when the same
 *     literal appears in body copy too.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L3 (navigation)".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils';

// Hoist-friendly mock spy. Must be `mock`-prefixed to satisfy babel-plugin-
// jest-hoist's allowlist of referenceable names inside a jest.mock factory.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Import after the mock so the component receives the mocked useNavigate.
// eslint-disable-next-line import/first
import WalletType from '../../screens/WalletType';

describe('WalletType screen — navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to /software_warning/ when "Software wallet" is clicked', async () => {
    renderWithProviders(<WalletType />);

    await userEvent.click(
      screen.getByRole('button', { name: /Software wallet/i }),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/software_warning/');
  });

  it('navigates to /hardware_wallet/ when "Hardware wallet" is clicked', async () => {
    renderWithProviders(<WalletType />);

    await userEvent.click(
      screen.getByRole('button', { name: /Hardware wallet/i }),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/hardware_wallet/');
  });
});
