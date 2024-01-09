/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Modules to control application life and create native browser window
const {app, BrowserWindow, Tray, Menu, dialog, ipcMain} = require('electron')
const contextMenu = require('./contextMenu')
const Sentry = require('@sentry/electron')
const url = require('url');
const path = require('path');
const constants = require('./constants');
const { instance: Ledger } = require('./ledger');

Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: process.env.npm_package_version
})

let tray = null
let iconOS = null;
let trayIcon = null;
let msgCheck = false;
// We need to save the event that brought the check message from the renderer process, in order to send back to it
let msgCheckEvent = null;


if (process.platform === 'darwin') {
  iconOS = 'icon.icns';
  trayIcon = 'icon_tray.png';
} else {
  trayIcon = iconOS = 'icon.png';
}

const appName = 'Hathor Wallet';
const walletVersion = '0.27.1-rc3';

const debugMode = (
  process.argv.indexOf('--unsafe-mode') >= 0 &&
  process.argv.indexOf('--hathor-debug') >= 0
);

// Creates the context menu on mouse right-click for allowing copy/paste and other configurable actions
contextMenu({
  showInspectElement: debugMode
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 768,
    icon: path.join(__dirname, iconOS),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Waiting for message from preload.js script to get the saved information in localStorage, if the user already checked it
  ipcMain.on('systray_message:check', (e, check) => {
    msgCheck = check;
    msgCheckEvent = e;
  });
  // Adding wallet version to user agent, so we can get in all request headers
  mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + ' HathorWallet/' + walletVersion);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // and load the index.html of the app.
  mainWindow.loadURL(
    process.env.ELECTRON_START_URL ||
    url.format({
      pathname: path.join(__dirname, './../build/index.html'),
      protocol: 'file:',
      slashes: true
    })
  )

  // Create the Application's main menu
  var template = [{
    label: appName,
    submenu: [
      { label: `About ${appName}`, selector: 'orderFrontStandardAboutPanel:' },
      { type: 'separator' },
      { type: 'checkbox', label: 'Systray', checked: false, click: function(item) {
        if (item.checked) {
          if (tray === null) {
            startSystray();
          }
        } else {
          tray.destroy();
          tray = null;
        }
      }},
      { type: 'separator' },
      { label: 'Quit', accelerator: 'Command+Q', click: function() { app.quit(); }}
    ]}, {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
      ]}
  ];

  if (debugMode) {
    template.push({
      label: 'Debug',
      submenu: [
        { label: `Open DevTools`, accelerator: 'CmdOrCtrl+B', click: function() { mainWindow.webContents.openDevTools(); }}
      ]
    });
  };

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  const optionsClose = {
    type: 'info',
    buttons: ['Ok, thanks'],
    defaultId: 2,
    icon: path.join(__dirname, 'icon.png'),
    title: 'Attention',
    message: 'Your Hathor Wallet has not been closed. It is only hidden, and you can access it through your systray.',
    checkboxLabel: 'Do not show this message again.',
    checkboxChecked: msgCheck
  };

  mainWindow.on('close', (e) => {
    if (tray !== null && !tray.isDestroyed()) {
      e.preventDefault()
      // In case the user is using systray we don't close the app, just hide it
      if (!msgCheck){
        dialog.showMessageBox(null, optionsClose, (response, checkboxChecked) => {
          msgCheck = checkboxChecked;
          if (msgCheckEvent) {
            // Send to renderer process, so it can be saved in localStorage
            msgCheckEvent.sender.send('systray_message:check', checkboxChecked);
          }
        });
      }
      // Update systray menu and hide the window
      updateSystrayMenu(systrayMenuItemShow);
      mainWindow.hide()
    }
  });

  addLedgerListeners(mainWindow);
}

if (process.platform === 'darwin') {
  // Set "About" options only on macOS
  app.setAboutPanelOptions({
    'applicationName': appName,
    'applicationVersion': walletVersion,
    'version': '',
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

const updateSystrayMenu = (firstItem) => {
  if (tray) {
    tray.setContextMenu(getMenu(firstItem));
  }
}

// Systray menu item to hide the window
const systrayMenuItemHide = {
  label: 'Hide Wallet',
  type: 'normal',
  click() {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      updateSystrayMenu(systrayMenuItemShow);
    }
  }
}

// Systray menu item to show the window
const systrayMenuItemShow = {
  label: 'Show Wallet',
  type: 'normal',
  click() {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      updateSystrayMenu(systrayMenuItemHide);
    }
  }
}

// Systray menu created with a first item and the exit label
const getMenu = (firstItem) => {
  return Menu.buildFromTemplate([
    firstItem,
    {
      label: 'Exit',
      type: 'normal',
      click() {
        app.exit()
      }
    }
  ])
}

function startSystray() {
  tray = new Tray(path.join(__dirname, trayIcon));
  tray.setContextMenu(getMenu(systrayMenuItemHide));
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * This dict contains all methods available on public/ledger.js and the corresponding event
 * to be sent when we get a reply from ledger. Eg: we receive the event 'ledger:getVersion' and
 * call Ledger.getVersion(). When we get the reply from ledger, we send the event 'ledger:version'
 */
const ledgerMethods = {
  'getVersion': 'version',
  'getPublicKeyData': 'publicKeyData',
  'checkAddress': 'address',
  'sendTx': 'txSent',
  'getSignatures': 'signatures',
  'signToken': 'tokenSignature',
  'sendTokens': 'tokenDataSent',
  'verifyTokenSignature': 'tokenSignatureValid',
  'verifyManyTokenSignatures': 'manyTokenSignatureValid',
  'resetTokenSignatures': 'tokenSignatureReset',
}

function addLedgerListeners(mainWindow) {
  for (const method in ledgerMethods) {
    ipcMain.on(`ledger:${method}`, (event, data) => {
      const promise = Ledger[method](data);
      const responseEvt = `ledger:${ledgerMethods[method]}`;
      promise.then((response) => {
        mainWindow.webContents.send(responseEvt, {success: true, data: response});
      }, (e) => {
        mainWindow.webContents.send(responseEvt, {success: false, error: e});
      });
    });
  }

  Ledger.mainWindow = mainWindow;
}
