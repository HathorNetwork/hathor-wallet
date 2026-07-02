import { test } from './fixtures/electron-fixture';

test.describe.serial('onboarding — new wallet', () => {
  test('creates a new wallet and reaches the dashboard on Mainnet with zero balance', async ({
    wallet,
  }) => {
    // Provisioning (create -> password -> pin -> dashboard) ran in the worker fixture.
    await wallet.expectDashboardLoaded();
    await wallet.expectHtrBalance(/Total:\s*0\.00\s*HTR/);
  });
});
