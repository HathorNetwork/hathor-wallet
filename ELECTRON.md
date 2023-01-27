## Install

Must use node v14

## Running on Electron

Before running electron you have to execute `npm run electron-deps` to install dependencies.

Then `npm run electron`

If you run into `Error: Unresolved node modules`, you just have to `export ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true`.

## Build package for Electron

To build the package for all platforms:

`npm run electron-pack`

If you have an error building `Error: Python executable "/path/to/python" is v3.6.5, which is not supported by gyp.`, just run `npm config set python /usr/bin/python` and try again

### Building only for one platform

You can use `--mac`, `--win`, or `--linux`. Eg:

`./node_modules/.bin/build --win -c.extraMetadata.main=build/electron.js`

### Provisioning profile

We use a Developer ID provisioning profile and expect it to be in the root directoy under the name `mac_production.provisionprofile` (it's referenced in package.json).

### macOS Sign & Notarize

Since macOS 10.14.5, Apple has added new notarization requirements. For further information, [check here](https://developer.apple.com/news/?id=04102019a).

We have followed the link from Valkhof. The runner have to export the following environment variables:

    export APPLEID=your_apple_id
    export APPLEIDPASS=@keychain:your_keychain_key_name
    export APPLETEAMID=your_apple_team_id

It assumes that your Apple ID password is in your Keychain with name `your_keychain_key_name`, so the runner does not have to write its real password. It is highly suggested to use an [app-specific password](https://support.apple.com/en-us/HT204397). You can get your Apple team ID by going to the [Apple developer website](https://developer.apple.com/account/) -> Membership -> Team ID. It's a sequence of numbers and letters (eg 31BCE234PP).

For safety information about your Apple ID Password, [check this out](https://github.com/electron-userland/electron-notarize#safety-when-using-appleidpassword).

- https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/
- https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

### Windows Code Signing

For Windows, you need to create the following environment variables:

    export WIN_CSC_LINK=./your_certificate.pfx
    export WIN_CSC_KEY_PASSWORD=your_certificate_password

Then, just build it.

### Windows EV Code Signing

To sign using an EV Code Signing Certificate in a YubiKey, [follow this guide](https://www.electron.build/tutorials/code-signing-windows-apps-on-unix.html).

Use [JSign](https://ebourg.github.io/jsign/) to sign files; use osslsigncode to verify the signature.

On macOS, you should install the following: `brew install yubico-piv-tool osslsigncode1`.

You can use the following commands to test whether it is working on your computer:

```bash

# First, sign the exe.
java \
  --add-exports jdk.crypto.cryptoki/sun.security.pkcs11=ALL-UNNAMED \
  --add-exports jdk.crypto.cryptoki/sun.security.pkcs11.wrapper=ALL-UNNAMED \
  --add-opens java.base/java.security=ALL-UNNAMED \
  -jar jsign-4.2.jar \
  --storetype YUBIKEY \
  --certfile "$WIN_EV_CERTIFICATE_FILE" \
  --storepass "$WIN_EV_TOKEN_PASSWORD" \
  --alias "$WIN_EV_CERTIFICATE_NAME" \
  ./dist/Hathor\ Wallet\ Setup\ 0.24.0.exe

# Then, verify the signature is correct.
osslsigncode verify dist/Hathor\ Wallet\ Setup\ 0.24.0.exe
```

#### Troubleshooting:

Error: YubiKey PKCS11 module (ykcs11) is not installed
Fix: `brew install yubico-piv-tool`
