# Hathor Desktop Wallet — QA

This document captures manual QA scenarios required before releasing the desktop wallet.
Run all scenarios on the target platforms before sign-off.

## Web3Auth Social Login

Run on testnet first. Mainnet scenarios are gated on the Web3Auth Mainnet project
provisioning.

### Setup

- Toggle `web3auth-desktop.rollout` ON in Unleash (or use the local fallback by
  editing `FEATURE_TOGGLE_DEFAULTS` in `src/constants.js` and rebuilding).
- Sign out of any existing wallet so the Welcome → WalletType flow is reachable.

### Scenario 1 — Happy path: first-time login

1. Click `Sign in with social`.
2. Click `Continue with Google`.
3. Complete Google OAuth in the popup BrowserWindow.
4. Complete MFA setup (mandatory) in the Web3Auth-hosted webview.
5. Set a PIN and password.
6. Verify the wallet dashboard loads.
7. Receive 1 HTR on testnet from a faucet.
8. Send 0.5 HTR back to the faucet.

Expected: each step completes without errors. Sentry receives no error events.

### Scenario 2 — Restart and unlock with PIN

1. Quit the app (Cmd+Q).
2. Relaunch.
3. Verify the LockedWallet screen appears (PIN prompt, no seed words).
4. Enter PIN.
5. Verify the dashboard reappears with the same balance as before.

### Scenario 3 — Sign out and back in

1. From Settings, click `Sign out of your Hathor account <email>`.
2. Confirm.
3. From Welcome → WalletType, click `Sign in with social` → `Continue with Google`.
   (MFA is NOT prompted this time.)
4. Set a new PIN.
5. Verify the same Hathor address as before is shown in `Receive`.

### Scenario 4 — Cancel OAuth popup

1. Click `Continue with Google`, close the popup without authenticating.
2. Expected: silent return to the social login screen, no error dialog.

### Scenario 5 — Offline

1. Disable the network.
2. Click `Continue with Google`.
3. Expected: `Web3AuthErrorDialog` with "Connection problem" copy and a Try again
   button.

### Scenario 6 — Abort MFA setup

1. Click `Continue with Google`, complete Google OAuth, then close the MFA webview
   without configuring a factor.
2. Expected: `Web3AuthErrorDialog` with "Set up a recovery factor" copy.

### Scenario 7 — Feature toggle off (with existing wallet)

1. With a Web3Auth wallet active, sign out.
2. Disable `web3auth-desktop.rollout`.
3. Open the app — the WalletType screen is reachable, and the `Sign in with social`
   button is NOT shown.
4. Sign in with social again is not possible. But if the user had NOT signed out, the
   LockedWallet screen would still be reachable and the wallet could be unlocked with
   PIN. (Verify by retesting with a wallet that was not signed out.)

### Scenario 8 — Cross-platform key portability

1. Sign in via Web3Auth on the desktop wallet (testnet).
2. Note the address shown in `Receive`.
3. Sign in via the mobile wallet using the same Google account on testnet.
4. Verify the same address is displayed.

### Scenario 9 — Mainnet (when provisioned)

1. Switch the Hathor network to mainnet in Settings.
2. Attempt social login.
3. Until provisioned: `Web3AuthErrorDialog` shows "Sign-in temporarily unavailable".
4. Once provisioned: same as Scenario 1 but on mainnet.

### Scenario 10 — Single-key UI invariants

1. Sign in via Web3Auth.
2. Verify the following menu entries are NOT visible:
   - Reown / WalletConnect (in Settings)
   - Atomic Swap (in top navigation)
   - Nano Contract (in top navigation)
3. Open the `Receive` screen — verify the "Generate new address" button is NOT shown.
4. Settings → reset row label reads "Sign out of your Hathor account &lt;email&gt;",
   not "Reset wallet".
