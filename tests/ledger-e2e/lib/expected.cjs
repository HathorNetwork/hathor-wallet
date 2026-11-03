/**
 * Ground truth computed independently of the app: the xpub and addresses the
 * Speculos seed must produce, and the token config string to register.
 * Runs in a child process because wallet-lib keeps handles open.
 *
 *   node expected.cjs <appDir> <mnemonic> <tokenUid> <name> <symbol>
 */
const path = require('path');

const [appDir, words, uid, name, symbol] = process.argv.slice(2);
const lib = require(path.join(appDir, 'node_modules/@hathor/wallet-lib'));

const xpub = lib.walletUtils.getXPubKeyFromSeed(words, { networkName: 'mainnet', accountDerivationIndex: "0'/0" });
const addresses = [];
for (let i = 0; i < 5; i += 1) {
  addresses.push(lib.addressUtils.deriveAddressFromXPubP2PKH(xpub, i, 'mainnet').base58);
}

/** What src/screens/StartHardwareWallet.js#handlePublicKeyData builds from the device reply. */
function xpubFromDeviceData(hex) {
  const data = Buffer.from(hex, 'hex');
  const compressed = lib.walletUtils.toPubkeyCompressed(data.slice(0, 65));
  return lib.walletUtils.xpubFromData(compressed, data.slice(65, 97), data.slice(97, 101));
}

const out = {
  xpub,
  addresses,
  configString: uid ? lib.tokensUtils.getConfigurationString(uid, name, symbol) : null,
};
if (process.env.DEVICE_XPUB_DATA) out.xpubFromDevice = xpubFromDeviceData(process.env.DEVICE_XPUB_DATA);
process.stdout.write(JSON.stringify(out));
process.exit(0);
