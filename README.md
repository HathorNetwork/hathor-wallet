# Hathor Wallet

Welcome to Hathor Desktop Wallet. To view the source code of the project access [Github](https://github.com/HathorNetwork/hathor-wallet).

## Architecture

The wallet is developed using Javascript with [React](https://reactjs.org/). We use [Electron](https://electronjs.org/) to generate native desktop apps from it.

## Download

You can download the newest version of the wallet for each specific platform from the [Releases page](https://github.com/HathorNetwork/hathor-wallet/releases).

## Screenshots

The basic view of the wallet.  Note that different types of tokens are made possible in the Hathor Network.  On the left hand side we see both a HTR tab and a MTK tab, for the Hathor token, and a different, ERC-20 like, token.   
![Wallet Home](https://drive.google.com/thumbnail?id=1pJ4JAxTXjMHW1Xuc4cCG0d0LKeVBGgM6&sz=w3000-h2250)

Sending tokens.  
![Send Tokens](https://drive.google.com/thumbnail?id=1Lq6Q0j2J0989vfYzykVSpYjra3bLTI2u&sz=w3000-h2250)

The wallet includes a block and transaction explorer.  
![Explorer](https://drive.google.com/thumbnail?id=1YdEfGB7L9E2tA4vGDTsGdGvoKw5bqdhT&sz=w3000-h2250)

A transaction is displayed.  
![Transaction Detail](https://drive.google.com/thumbnail?id=1N3IaiT0kBT1QkRq6xU_b_D66EZBVajiB&sz=w3000-h2250)

## For development

### Prerequisites

* Install node v14

### To Install

```
npm install
```

### To Run

```
npm start
```

It will start running in the browser in http://localhost:3000

> **NOTE:** to use Hathor Wallet with Ledger, you need to run it in Electron.

> **NOTE:** use the electron wallet for a more complete experience.

### Quick start to Electron

Run the electron besides the react app. Open a new instance of the terminal and run the following command:

```
npm run electron-dev
```

If you get some error like this `error while loading shared libraries: libxshmfence.so.1: cannot open shared object file: No such file or directory` refer to the [throubleshooting](#troubleshooting) section.

### To Build

`npm run build` and it will create a folder build with the files to use

## Server

By default the wallet will connect to the server selected as the `DEFAULT_SERVER` in the constants file (`src/constants.js`).
You can change this anytime in the 'Change Server' screen inside the wallet.

## Documentation

To generate a html page with the documentation from the code comments run:

```
npm run generate-doc
```

It will generate a `index.html` file in `out/index.html`

## Run Electron

Refer to [ELECTRON.md](/ELECTRON.md)

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

## Troubleshooting

When building, if you get the following error message:

    FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory

Then, you can increase your memory limit running:

    export NODE_OPTIONS=--max_old_space_size=4096

### WSL (Windows Subsystem for Linux)

* Make sure you have the vesion 2
    ```
    wsl -l -v
    ```
* Make sure to install the WSL driver for your GPU, see at [Prerequisites](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps#prerequisites)
* Make sure to update the WSL after install the GPU driver, see at [Existing WSL Install](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps#existing-wsl-install)
* Once the `WSL` is updated you are ready to go

If you still can't run, see this [article](https://www.beekeeperstudio.io/blog/building-electron-windows-ubuntu-wsl2).

### WSL Ubuntu 18 distro

Run the following command to install necessary packages:

```
sudo apt install libnss3-dev libgdk-pixbuf2.0-dev libgtk-3-dev libxss-dev libasound2
```

### WSL Debian distro

Run the following command to install necessary packages:

```
sudo apt install libnss3-dev libgdk-pixbuf2.0-dev libgtk-3-dev libxss-dev libasound2 libusb-1.0-0
```

## TODO

- The algorithm to automatically choose the unspent transactions when sending tokens is naive. For now we do not consider any anonymity factor.
- The addresses shared with the user and the ones used in change outputs are generated by the same chain in the HD Wallet. We don't separate internal and external addresses.

## i18n

We use the `ttag` lib. Check out the docs [here](https://ttag.js.org/docs/quickstart.html).

Run `make update_pot` to update the pot file (`locale/texts.pot`). This file has all strings to be translated in the app.

Run `msgmerge pt-br/texts.po texts.pot -o pt-br/texts.po` to merge a pot file with a po file. This will add the new strings to be transalted and remove the deprecated ones. Any translation marked with `; fuzzy` comment must be reviewed.

Finally, run `make i18n` to compile all po files to json files. You can use `make check_po` to check for problems in translations.

## Release

There is a release guide in [RELEASE.md](/RELEASE.md).

We ship GPG signatures for all release packages. Check our guide in [RELEASING.md#signature-verification](/RELEASING.md#signature-verification) to learn how to verify them.

## License

Code released under [the MIT license](https://github.com/HathorNetwork/hathor-wallet/blob/dev/LICENSE).

Copyright 2019 Hathor Labs.
