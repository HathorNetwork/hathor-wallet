# Hathor Wallet

Welcome to Hathor Light Wallet. To view the source code of the project access [Github](https://github.com/HathorNetwork/hathor-wallet).

## Architecture

The wallet is developed using Javascript with [React](https://reactjs.org/). We use [Electron](https://electronjs.org/) to generate native desktop apps from it.

## Download

You can download the newest version of the wallet for each specific platform.

- Download for [macOS](https://github.com/HathorNetwork/hathor-wallet/releases/download/v0.6.5-beta/Hathor.Wallet-0.6.5-beta.dmg)
- Download for [Windows](https://github.com/HathorNetwork/hathor-wallet/releases/download/v0.6.5-beta/Hathor.Wallet.Setup.0.6.5-beta.exe)
- Download for [Linux (deb)](https://github.com/HathorNetwork/hathor-wallet/releases/download/v0.6.5-beta/hathor-wallet_0.6.5-beta_amd64.deb)
- Download for [Linux (AppImage)](https://github.com/HathorNetwork/hathor-wallet/releases/download/v0.6.5-beta/Hathor.Wallet.0.6.5-beta.AppImage)

### Warning Message

We are almost finishing the process of acquiring the certificates for macOS and Windows. While we don't get it you may see a warning message when opening the wallet.

#### For macOS:

![Warning macOS](https://drive.google.com/thumbnail?id=17gxGXmD1Zbd_uSsadnOem_i0tDR-Sdzh&sz=w500-h375)

To be able to run you need to open Security & Privacy, click on the tab "General" and you will see a message "Hathor Wallet was blocked from opening because it is not from an identified developer.". So you just need to click on the button "Open Anyway" to use our wallet. For further information, see [macOS User Guide - Open a Mac app from an unidentified developer](https://support.apple.com/en-gb/guide/mac-help/mh40616/10.14/mac/10.14.3)

#### For Windows:

![Warning Windows](https://drive.google.com/thumbnail?id=1B5kLAXUMj4wmrRfmVtiQyoNe6Q7r8s_h&sz=w500-h375)

This screen will show a warning, so you need to click on 'More info'. Another screen will appear, then just click the button 'Run anyway' to start the wallet.

## Screenshots

The basic view of the wallet.  Note that different types of tokens are made possible in the Hathor Network.  On the left hand side we see both a HTR tab and a MTK tab, for the Hathor token, and a different, ERC-20 like, token.   
![Wallet Home](https://drive.google.com/thumbnail?id=15ocrSVhZ2h1KmvysqSigfS6Vxs1CPChR&sz=w1920-h1080)

Sending tokens.  
![Send Tokens](https://drive.google.com/thumbnail?id=1Nw2eNBvdjftJaMY_X6dp3hssHzif1b2o&sz=w1920-h1080)

The wallet includes a block and transaction explorer.  
![Explorer](https://drive.google.com/thumbnail?id=1YcqUC80FU_xpaymEobxGWKTrYjIALfHJ&sz=w1920-h1080)

A transaction is displayed.  
![Transaction Detail](https://drive.google.com/thumbnail?id=13CMtOMuhdlxJZLHdJ7LxhruI_8PZSdcO&sz=w1920-h1080)

## For development

### To Install

`npm install`

### To Run

`npm start` and it will start running in the browser in http://localhost:3000

### To Build

`npm run buil` and it will create a folder build with the files to use

## Server

By default the wallet will connect to the server selected as the `DEFAULT_SERVER` in the constants file (`src/constants.js`).
You can change this anytime in the 'Change Server' screen inside the wallet.

## Documentation

To generate a html page with the documentation from the code comments run:

`jsdoc -c jsdoc.json -r src/. README.md`

and it will generate a `index.html` file in `out/index.html`

## Run Electron

`npm run build`
`npm run electron`

## Build package for Electron

`npm run electron-pack`

If you have an error building `Error: Python executable "/path/to/python" is v3.6.5, which is not supported by gyp.`

Just run `npm config set python /usr/bin/python` and try again

## Sentry

Sentry is a error tracking tool, that allow us to receive error data from clients - it will be disabled on stable versions of the wallet.

### DSN
On `public/constants.js` we have a default Sentry DSN.
To override it simply set the environment variable `SENTRY_DSN`.

### Source maps
To allow stack traces to be mapped to source code, Sentry needs the source maps.
To upload the source maps, create a `.sentryclirc` with the format:

```
[defaults]
url=https://sentry.io/
org=<ORGANIZATION_NAME>
project=<PROJECT_NAME>

[auth]
token=<CLI_API_TOKEN>
```

You can find more information about the configuration file and its fields [here](https://docs.sentry.io/cli/configuration/).
After configuring it, just run the `upload_source_maps.sh` script to upload the source maps.

**WARNING**: Please note that this will override all the source maps for the current sentry release.

The sentry release used is the `version` field in the `package.json` file.
So in order to not break any released source maps, only run the script after bumping `package.json` to a new version.
For test purposes use `*-beta` versions or identifiers that will not colide with semantic versioning.

## TODO

- The algorithm to automatically choose the unspent transactions when sending tokens is naive. For now we do not consider any anonymity factor.
- The addresses shared with the user and the ones used in change outputs are generated by the same chain in the HD Wallet. We don't separate internal and external addresses.

## License

Code released under [the MIT license](https://github.com/HathorNetwork/hathor-wallet/blob/dev/LICENSE).

Copyright 2019 Hathor Labs.
