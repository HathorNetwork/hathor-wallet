/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu} = require('electron')
const Sentry = require('@sentry/electron')
const url = require('url');
const path = require('path');
const constants = require('./constants');

Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: process.env.npm_package_version
})

const appName = 'Hathor Wallet';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

if (process.platform === 'darwin') {
  // Set "About" options only on macOS
  app.setAboutPanelOptions({
    'applicationName': appName,
    'applicationVersion': '0.6.3-beta',
    'version': '',
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
