/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Helper for tests that need to assert on react-router-dom v6 navigation.
 *
 * Usage:
 *   import { useMockNavigate, mockNavigationModule } from '../../test-utils/mockNavigation';
 *
 *   jest.mock('react-router-dom', () => mockNavigationModule());
 *
 *   it('navigates to /wallet_type/ when the form is valid', () => {
 *     const navigate = useMockNavigate();
 *     // ... render the component and trigger navigation ...
 *     expect(navigate).toHaveBeenCalledWith('/wallet_type/');
 *   });
 *
 * Refs RFC 0001 (auto-qa) § Helpers.
 */

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/', search: '', hash: '', state: null, key: 'mock' };
const mockParams = {};

/**
 * Returns the shared navigate spy. Call between tests to assert calls;
 * `jest.resetAllMocks()` (or a beforeEach with `mockNavigate.mockClear()`) is
 * the caller's responsibility.
 */
export function useMockNavigate() {
  return mockNavigate;
}

/**
 * Returns the factory object expected by `jest.mock('react-router-dom', () => …)`.
 * Preserves all real exports except `useNavigate`, `useLocation`, `useParams`,
 * which become the shared mocks above.
 */
export function mockNavigationModule() {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
  };
}

export { mockNavigate, mockLocation, mockParams };
