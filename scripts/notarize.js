require('dotenv').config();
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appId = 'network.hathor.macos.wallet';
  const appName = context.packager.appInfo.productFilename;

  console.log(`Notarizing ${appId} found at ${appName}`);

  await notarize({
    appBundleId: appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
    ascProvider: process.env.APPLETEAMID,
  });

  console.log(`Done notarizing ${appId}`);
};
