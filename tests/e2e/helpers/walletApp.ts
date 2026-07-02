import { type Page, expect } from '@playwright/test';
import { SEL, CREDENTIALS } from './selectors';
import { TIMEOUTS } from '../driver/timeouts';

/** Wallet UI verbs on the renderer Page. Knows nothing about Electron. */
export class WalletApp {
  constructor(private readonly page: Page) {}

  async expectWelcome(): Promise<void> {
    await expect(this.page.getByText(SEL.welcome.heading)).toBeVisible();
  }

  async acceptTermsAndStart(): Promise<void> {
    await this.page.locator(SEL.welcome.agreeCheckbox).check();
    await this.page.getByRole('button', { name: SEL.welcome.getStarted }).click();
  }

  async chooseSoftwareWallet(): Promise<void> {
    await this.page.getByRole('button', { name: SEL.walletType.software }).click();
  }

  async confirmSoftwareWarning(): Promise<void> {
    await this.page.locator(SEL.softwareWarning.confirmCheckbox).check();
    await this.page.getByRole('button', { name: SEL.softwareWarning.continue }).click();
  }

  async chooseNewWallet(): Promise<void> {
    await this.page.getByRole('button', { name: SEL.signin.newWallet }).click();
  }

  async chooseImportWallet(): Promise<void> {
    await this.page.getByRole('button', { name: SEL.signin.importWallet }).click();
  }

  async createNewWords(): Promise<void> {
    await this.page.locator(SEL.newWallet.confirmCheckbox).check();
    await this.page.getByRole('button', { name: SEL.newWallet.createWords }).click();
    await expect(this.page.getByText(SEL.newWallet.wordsCreatedHeading)).toBeVisible();
  }

  async skipBackup(): Promise<void> {
    await this.page.getByRole('button', { name: SEL.newWallet.doItLater }).click();
  }

  async enterSeed(seed: string): Promise<void> {
    await this.page.locator(SEL.loadWallet.seedTextarea).fill(seed);
    await this.page.getByRole('button', { name: SEL.loadWallet.importData }).click();
  }

  async setPassword(password: string = CREDENTIALS.password): Promise<void> {
    await this.page.locator(SEL.pinPassword.password).fill(password);
    await this.page.locator(SEL.pinPassword.confirmPassword).fill(password);
    await this.page.getByRole('button', { name: SEL.pinPassword.next }).click();
  }

  async setPin(pin: string = CREDENTIALS.pin): Promise<void> {
    await this.page.locator(SEL.pinPassword.pin).fill(pin);
    await this.page.locator(SEL.pinPassword.confirmPin).fill(pin);
    await this.page.getByRole('button', { name: SEL.pinPassword.next }).click();
  }

  async expectDashboardLoaded(): Promise<void> {
    await expect(this.page.getByText(SEL.loading.loadingTransactions)).toBeHidden({
      timeout: TIMEOUTS.walletLoad,
    });
    await expect(this.page.getByText(SEL.loading.syncing)).toBeHidden({
      timeout: TIMEOUTS.networkResync,
    });
    await expect(this.page.getByTestId(SEL.dashboard.balanceTotal).first()).toBeVisible({
      timeout: TIMEOUTS.walletLoad,
    });
  }

  async expectHtrBalance(matcher: RegExp): Promise<void> {
    await expect(this.page.getByTestId(SEL.dashboard.balanceTotal).first()).toHaveText(matcher);
  }

  async expectHistoryRendered(): Promise<void> {
    // Prove the actual transaction history renders: the history table is visible
    // and at least one transaction row is present. The funded testnet wallet has
    // history, so an empty table would (correctly) fail this assertion.
    await expect(this.page.locator(SEL.history.table)).toBeVisible({
      timeout: TIMEOUTS.walletLoad,
    });
    await expect(this.page.locator(SEL.history.rows).first()).toBeVisible({
      timeout: TIMEOUTS.walletLoad,
    });
  }

  async openNetworkSettings(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/network_settings';
    });
    await expect(this.page.locator(SEL.networkSettings.select)).toBeVisible({
      timeout: TIMEOUTS.click,
    });
  }

  async selectNetwork(network: 'mainnet' | 'testnet' | 'custom'): Promise<void> {
    await this.page.locator(SEL.networkSettings.select).selectOption(network);
  }

  async enterNetworkPin(pin: string = CREDENTIALS.pin): Promise<void> {
    await this.page.locator(SEL.networkSettings.pin).fill(pin);
  }

  async clickConnect(): Promise<void> {
    await this.page.getByRole('button', { name: SEL.networkSettings.connect }).click();
  }

  async confirmTestnetModal(): Promise<void> {
    const modal = this.page.locator(SEL.networkSettings.testnetModal);
    await expect(modal).toBeVisible({ timeout: TIMEOUTS.modal });
    await this.page.locator(SEL.networkSettings.testnetModalInput).fill('testnet');
    await this.page.getByRole('button', { name: SEL.networkSettings.connectToTestnet }).click();
  }

  async expectConnectedToTestnet(): Promise<void> {
    // Confirming the testnet modal restarts the wallet on the new network:
    // changeServer stops the wallet, cleans storage and re-dispatches
    // startWalletRequested, routing through /loading_addresses to re-sync. Rather
    // than racing to catch that transient route (which can flip too fast to
    // observe), assert the SETTLED testnet state directly on the Settings screen,
    // where the live node URL is always rendered. A generous timeout absorbs the
    // restart/re-sync. The spec's subsequent goToDashboard()/expectDashboardLoaded()
    // then proves the re-sync completed (syncing text clears, balance renders).
    await this.page.evaluate(() => {
      window.location.hash = '#/settings';
    });
    await expect(this.page.getByText(SEL.settings.testnetNodeUrl).first()).toBeVisible({
      timeout: TIMEOUTS.networkResync,
    });
  }

  async goToDashboard(): Promise<void> {
    await this.page.evaluate(() => {
      window.location.hash = '#/wallet';
    });
  }
}
