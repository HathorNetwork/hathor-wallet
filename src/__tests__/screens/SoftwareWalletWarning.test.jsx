/**
 * Layer 3 — Component (error / non-happy path).
 *
 * Reference smoke test demonstrating how to assert on a UI error state. The
 * SoftwareWalletWarning screen marks its `<form>` with the `was-validated`
 * class when the user clicks "Continue" without first checking the
 * agreement checkbox — a typical Bootstrap form-validation flow.
 *
 * Future feature-area PRs adapt this pattern for error modals, server
 * error messages, and inline validation banners.
 *
 * Refs RFC 0001 (auto-qa) § PR 1 smoke set, row "L3 (error path)".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils';
import SoftwareWalletWarning from '../../screens/SoftwareWalletWarning';

describe('SoftwareWalletWarning screen — form validation error', () => {
  it('does NOT mark the form as validated before any submit attempt', () => {
    renderWithProviders(<SoftwareWalletWarning />);
    const form = document.querySelector('form');
    expect(form).not.toHaveClass('was-validated');
  });

  it('marks the form as validated when Continue is clicked without checking the box', async () => {
    renderWithProviders(<SoftwareWalletWarning />);
    const form = document.querySelector('form');

    expect(form).not.toHaveClass('was-validated');

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // The bootstrap `was-validated` class is what surfaces the red border on
    // the unchecked checkbox; absence of it would mean the user got no
    // feedback for the invalid submission.
    expect(form).toHaveClass('was-validated');
  });
});
