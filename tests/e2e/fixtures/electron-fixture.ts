import { test as base } from '@playwright/test';
import { launchWallet, closeWallet, type LaunchedApp } from '../driver/electronApp';
import { WalletApp } from '../helpers/walletApp';
import { provisionNewWallet, provisionImportedWallet } from '../helpers/journeys';
import { lookupWallet } from '../helpers/wallets';

export type WalletSetup =
  | { kind: 'onboard' }
  | { kind: 'import'; wallet: string; network?: 'mainnet' | 'testnet' };

interface WorkerFixtures {
  walletSetup: WalletSetup;
  launched: LaunchedApp;
  wallet: WalletApp;
}

export const test = base.extend<{}, WorkerFixtures>({
  walletSetup: [{ kind: 'onboard' } as WalletSetup, { option: true, scope: 'worker' }],

  launched: [
    async ({}, use) => {
      const launched = await launchWallet();
      await use(launched);
      await closeWallet(launched);
    },
    { scope: 'worker' },
  ],

  wallet: [
    async ({ launched, walletSetup }, use) => {
      const app = new WalletApp(launched.page);
      if (walletSetup.kind === 'onboard') {
        await provisionNewWallet(app);
      } else {
        const seed = lookupWallet(walletSetup.wallet);
        await provisionImportedWallet(app, seed);
      }
      await use(app);
    },
    { scope: 'worker' },
  ],
});
