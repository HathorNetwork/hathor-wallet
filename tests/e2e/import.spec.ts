import { test } from './fixtures/electron-fixture';
import { hasWallet } from './helpers/wallets';
import { switchToTestnet } from './helpers/journeys';

test.describe.serial('import the funded wallet and switch network', () => {
  test.skip(
    !hasWallet('funded'),
    'Set E2E_IMPORT_SEED (.env.e2e) to a funded testnet stub seed to run this journey.',
  );

  test('imports the funded wallet and reaches the dashboard on Mainnet', async ({ wallet }) => {
    await wallet.expectDashboardLoaded();
  });

  test('switches the Hathor network to testnet and re-syncs', async ({ wallet }) => {
    await switchToTestnet(wallet, '123456');
    await wallet.expectConnectedToTestnet();
    await wallet.goToDashboard();
    await wallet.expectDashboardLoaded();
    await wallet.expectHistoryRendered();
  });
});
