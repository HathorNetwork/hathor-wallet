## Configure

Electron expects a node (in the branch `feat/thin-wallet`) running with `--status 8080` and `--wallet-index` parameter

## Install

Must use node v8.9.0


## macOS Sign & Notarize

Since macOS 10.14.5, Apple has added new notarization requirements. For further information, [check here](https://developer.apple.com/news/?id=04102019a).

We have followed the link from Valkhof. The runner have to export the following environment variables:

    export APPLEID=your_apple_id
    export APPLEIDPASS=@keychain:your_keychain_key_name
    export APPLETEAMID=your_apple_team_id

It assumes that there is a password in Keychain Access named `your_keychain_key_name`, so the runner does not have to write its real password. It is highly suggested to use an [app-specific password](https://support.apple.com/en-us/HT204397).

For safety information about your Apple ID Password, [check this out](https://github.com/electron-userland/electron-notarize#safety-when-using-appleidpassword).

- https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/
- https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db
