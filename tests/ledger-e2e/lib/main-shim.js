/**
 * Electron main-process shim, loaded with NODE_OPTIONS=--require <this file>.
 *
 * 1. Resolves `@ledgerhq/hw-transport-node-hid` to a Speculos-backed transport,
 *    so public/ledger.js runs unchanged against the emulator.
 * 2. Records every `ledger:*` IPC message in both directions as JSONL
 *    (LEDGER_E2E_IPC_LOG), with the payload's runtime type, so the harness
 *    can assert what crossed the bridge.
 * 3. Quits the app cleanly on SIGUSR2.
 *
 * Nothing in the app is edited; without the env var this file is not loaded.
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');

// Only the main process. Renderers and helpers may inherit NODE_OPTIONS.
if (process.type === 'browser' || (process.versions.electron && !process.type)) {
  install();
}

function install() {
  const logFile = process.env.LEDGER_E2E_IPC_LOG || null;
  const verbose = !!process.env.LEDGER_E2E_VERBOSE;
  const write = (entry) => {
    if (!logFile) return;
    fs.appendFileSync(logFile, JSON.stringify({ t: Date.now(), ...entry }) + '\n');
  };
  const log = (msg) => {
    if (verbose) console.log(`[speculos-shim] ${msg}`);
    write({ kind: 'transport', msg });
  };

  const { createSpeculosTransportClass } = require('./speculos-transport');
  let fakeModule = null;
  const getFakeModule = () => {
    if (!fakeModule) {
      const SpeculosTransport = createSpeculosTransportClass({
        fromDir: process.env.LEDGER_E2E_APP_DIR || process.cwd(),
        apduHost: '127.0.0.1',
        apduPort: Number(process.env.SPECULOS_APDU_PORT || 9999),
        apiPort: Number(process.env.SPECULOS_API_PORT || 5000),
        log,
      });
      fakeModule = { __esModule: true, default: SpeculosTransport };
    }
    return fakeModule;
  };

  let electronHooked = false;
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === '@ledgerhq/hw-transport-node-hid') {
      write({ kind: 'shim', msg: `replaced ${request} (required from ${parent && path.basename(parent.filename)})` });
      return getFakeModule();
    }
    const result = origLoad.apply(this, arguments);
    if (request === 'electron' && !electronHooked && result && result.ipcMain) {
      electronHooked = true;
      hookElectron(result, write);
    }
    return result;
  };
  write({ kind: 'shim', msg: `installed in pid ${process.pid}, electron ${process.versions.electron}` });
}

/** Describe a payload so logs show what type survived the IPC hop. */
function describe(value, depth = 0) {
  if (value === undefined) return { type: 'undefined' };
  if (value === null) return { type: 'null' };
  if (Buffer.isBuffer(value)) return { type: 'Buffer', hex: value.toString('hex') };
  if (value instanceof Uint8Array) return { type: 'Uint8Array', hex: Buffer.from(value).toString('hex') };
  if (Array.isArray(value)) return { type: 'Array', items: value.map((v) => describe(v, depth + 1)) };
  if (value instanceof Error) return { type: 'Error', name: value.name, message: value.message };
  if (typeof value === 'object') {
    if (depth > 3) return { type: 'object' };
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = describe(v, depth + 1);
    return { type: 'object', ctor: value.constructor && value.constructor.name, fields: out };
  }
  return { type: typeof value, value };
}

function hookElectron(electron, write) {
  const { ipcMain, app } = electron;

  const origOn = ipcMain.on.bind(ipcMain);
  ipcMain.on = (channel, listener) => {
    if (typeof channel === 'string' && channel.startsWith('ledger:')) {
      return origOn(channel, (event, ...args) => {
        write({ kind: 'ipc', dir: 'renderer->main', channel, args: args.map((a) => describe(a)) });
        return listener(event, ...args);
      });
    }
    return origOn(channel, listener);
  };

  app.on('web-contents-created', (_e, contents) => {
    const origSend = contents.send.bind(contents);
    contents.send = (channel, ...args) => {
      if (typeof channel === 'string' && channel.startsWith('ledger:')) {
        write({ kind: 'ipc', dir: 'main->renderer', channel, args: args.map((a) => describe(a)) });
      }
      return origSend(channel, ...args);
    };
  });

  process.on('SIGUSR2', () => {
    write({ kind: 'shim', msg: 'SIGUSR2: quitting' });
    app.quit();
  });
}
