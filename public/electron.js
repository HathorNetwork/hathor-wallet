// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu} = require('electron')
const url = require('url');
const path = require('path');

const appName = 'Hathor Wallet';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false
  })
  mainWindow.maximize()
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open chrome dev tools when opening window
  //mainWindow.webContents.openDevTools()

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

// Set "About" options
app.setAboutPanelOptions({
  'applicationName': appName,
  'applicationVersion': '0.1.0',
  'version': '',
});

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