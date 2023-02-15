import events from 'events';
import { UnleashClient } from 'unleash-proxy-client';
import {
  UNLEASH_URL,
  UNLEASH_CLIENT_KEY,
  UNLEASH_POLLING_INTERVAL,
  WALLET_SERVICE_FEATURE_TOGGLE,
} from './constants';

const IGNORE_WALLET_SERVICE_FLAG = 'featureFlags:ignoreWalletServiceFlag';

export const Events = {
  WALLET_SERVICE_ENABLED: 'wallet-service-enabled',
};

export class FeatureFlags extends events.EventEmitter {
  constructor(userId, network) {
    super();

    this.userId = userId;
    this.network = network;
    this.walletServiceFlag = WALLET_SERVICE_FEATURE_TOGGLE;
    this.walletServiceEnabled = null;
    this.client = new UnleashClient({
      url: UNLEASH_URL,
      clientKey: UNLEASH_CLIENT_KEY,
      refreshInterval: UNLEASH_POLLING_INTERVAL,
      appName: `wallet-service-wallet-desktop`,
    });

    this.client.on('update', () => {
      // Get current flag
      const walletServiceEnabled = this.client.isEnabled(this.walletServiceFlag);

      // We should only emit an update if we already had a value on the instance
      // and if the value has changed
      if (this.walletServiceEnabled !== null && (
        this.walletServiceEnabled !== walletServiceEnabled
      )) {
        this.walletServiceEnabled = walletServiceEnabled;
        this.emit(Events.WALLET_SERVICE_ENABLED, walletServiceEnabled);
      }
    });
  }

  /**
  * Uses the Hathor Unleash Server and Proxy to determine if the
  * wallet should use the WalletService facade or the old facade
  *
  * @params {string} userId An user identifier (e.g. the firstAddress)
  * @params {string} network The network name ('mainnet' or 'testnet')
  *
  * @return {boolean} The result from the unleash feature flag
  */
  async shouldUseWalletService() {
    try {
      const shouldIgnore = await localStorage.getItem(IGNORE_WALLET_SERVICE_FLAG);
      if (shouldIgnore) {
        return false;
      }
      this.client.updateContext({
        userId: this.userId,
        stage: this.network,
      });

      // Start polling for feature flag updates
      await this.client.start();

      // start() method will have already called the fetchToggles, so the flag should be enabled
      const isWalletServiceEnabled = this.client.isEnabled(this.walletServiceFlag);
      this.walletServiceEnabled = isWalletServiceEnabled;

      return this.walletServiceEnabled;
    } catch (e) {
      // If our feature flag service is unavailable, we default to the
      // old facade
      return false;
    }
  }

  /**
   * Sets the ignore flag on the storage to persist it between app restarts
   */
  async ignoreWalletServiceFlag() {
    await localStorage.setItem(IGNORE_WALLET_SERVICE_FLAG, 'true');
    this.walletServiceEnabled = false;

    // Stop the client from polling
    this.client.stop();
  }

  /**
   * Removes the ignore flag from the storage
   */
  static async clearIgnoreWalletServiceFlag() {
    await localStorage.removeItem(IGNORE_WALLET_SERVICE_FLAG);
  }
}
