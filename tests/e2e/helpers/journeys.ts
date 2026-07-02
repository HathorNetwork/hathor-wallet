import { WalletApp } from './walletApp';
import { CREDENTIALS } from './selectors';

/** Shared start: welcome -> software -> warning. */
async function startSoftwareFlow(app: WalletApp): Promise<void> {
  await app.expectWelcome();
  await app.acceptTermsAndStart();
  await app.chooseSoftwareWallet();
  await app.confirmSoftwareWarning();
}

/** New wallet -> password -> pin -> loaded dashboard (default mainnet). */
export async function provisionNewWallet(app: WalletApp): Promise<void> {
  await startSoftwareFlow(app);
  await app.chooseNewWallet();
  await app.createNewWords();
  await app.skipBackup();
  await app.setPassword(CREDENTIALS.password);
  await app.setPin(CREDENTIALS.pin);
  await app.expectDashboardLoaded();
}

/** Import seed -> password -> pin -> loaded dashboard (default mainnet). */
export async function provisionImportedWallet(app: WalletApp, seed: string): Promise<void> {
  await startSoftwareFlow(app);
  await app.chooseImportWallet();
  await app.enterSeed(seed);
  await app.setPassword(CREDENTIALS.password);
  await app.setPin(CREDENTIALS.pin);
  await app.expectDashboardLoaded();
}

/**
 * Explicit network-switch verb (composed BY the spec, not baked into provisioning).
 * Open settings -> select testnet -> PIN -> Connect -> confirm modal.
 *
 * This drives only the mechanical switch. The connection/re-sync assertion lives
 * in the spec via `app.expectConnectedToTestnet()` (keeping assertions out of the
 * journey layer and avoiding a double restart-wait).
 */
export async function switchToTestnet(app: WalletApp, pin: string = CREDENTIALS.pin): Promise<void> {
  await app.openNetworkSettings();
  await app.selectNetwork('testnet');
  await app.enterNetworkPin(pin);
  await app.clickConnect();
  await app.confirmTestnetModal();
}
