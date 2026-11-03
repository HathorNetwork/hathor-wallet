/**
 * Electron main-process shim for the e2e suites, loaded with
 * NODE_OPTIONS=--require <this file>. Nothing in the app is edited; without
 * the env var this file is not loaded.
 *
 * 1. Network, one onBeforeRequest listener on the default session:
 *    - every request to a Sentry host goes to the local sink when
 *      E2E_SENTRY_REDIRECT is set, and is cancelled otherwise; each one is
 *      recorded, so a request that would have left the machine fails the run;
 *    - stub rules, added at run time through the control endpoint
 *      (`stub?includes=<text>&status=<code>`), answer every request whose URL
 *      contains <text> with that status, from this shim's own server.
 * 2. Control: a localhost HTTP endpoint (E2E_CONTROL_PORT) lets the harness
 *    do what a tester does from the main-process inspector: crash the renderer
 *    or main, throw in main, send IPC to the page, reset all data, click app
 *    or systray menu items, exit the app, read the consent file.
 * 3. Main's shell.openExternal is recorded. The preload's goes through
 *    xdg-open, which the harness replaces on PATH (harness.mjs openStub).
 * 4. SIGUSR2 quits the app cleanly (app.quit, so sessions end normally).
 */
const Module = require('module');
const fs = require('fs');
const http = require('http');
const path = require('path');

// Only the main process. Renderers and helpers may inherit NODE_OPTIONS.
const isMain = process.type === 'browser' || (process.versions.electron && !process.type);
if (isMain) install();

const SENTRY_HOST = /(^|\.)sentry\.io$/i;

function install() {
  const logFile = process.env.E2E_LOG || null;
  const write = (entry) => {
    if (logFile) fs.appendFileSync(logFile, `${JSON.stringify({ t: Date.now(), ...entry })}\n`);
  };

  let hooked = false;
  const origLoad = Module._load;
  Module._load = function load(request, ...rest) {
    const result = origLoad.call(this, request, ...rest);
    if (request === 'electron' && !hooked && result && result.ipcMain) {
      hooked = true;
      hookElectron(result, write);
    }
    return result;
  };
  write({ kind: 'shim', msg: `installed in pid ${process.pid}, electron ${process.versions.electron}` });
}

let trayMenu = null;
const stubRules = [];
const controlPort = Number(process.env.E2E_CONTROL_PORT || 0);

function hookElectron(electron, write) {
  const { app, session, shell, Tray } = electron;

  // Keep the systray's current menu, so the harness can click its items.
  const origSetContextMenu = Tray.prototype.setContextMenu;
  Tray.prototype.setContextMenu = function setContextMenu(menu) {
    trayMenu = menu;
    return origSetContextMenu.call(this, menu);
  };
  const redirectTo = process.env.E2E_SENTRY_REDIRECT || null; // e.g. http://127.0.0.1:9877

  shell.openExternal = (url) => {
    write({ kind: 'openExternal', url });
    return Promise.resolve();
  };

  app.on('render-process-gone', (_event, _contents, details) => {
    write({ kind: 'render-process-gone', reason: details.reason });
  });

  app.whenReady().then(() => {
    // The app registers onBeforeSendHeaders/onHeadersReceived; onBeforeRequest
    // is free, and a session has one listener per event.
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      let u = null;
      try { u = new URL(details.url); } catch (_e) { /* not a URL */ }
      const stub = u && controlPort && !details.url.startsWith(`http://127.0.0.1:${controlPort}/`)
        && stubRules.find((r) => details.url.includes(r.includes));
      if (stub) {
        write({ kind: 'stub', url: details.url, method: details.method, status: stub.status });
        callback({ redirectURL: `http://127.0.0.1:${controlPort}/stub-reply?status=${stub.status}` });
        return;
      }
      if (!u || !SENTRY_HOST.test(u.hostname)) {
        callback({});
        return;
      }
      if (redirectTo) {
        const target = `${redirectTo}${u.pathname}${u.search}`;
        write({ kind: 'sentry-request', action: 'redirected', url: details.url, method: details.method, target });
        callback({ redirectURL: target });
      } else {
        write({ kind: 'sentry-request', action: 'cancelled', url: details.url, method: details.method });
        callback({ cancel: true });
      }
    });
    startControl(electron, write);
  });

  process.on('SIGUSR2', () => {
    write({ kind: 'shim', msg: 'SIGUSR2: quitting' });
    app.quit();
  });
}

/** Depth-first search of a menu for an item with this label. */
function findItem(menu, label) {
  for (const item of (menu && menu.items) || []) {
    if (item.label === label) return item;
    const inner = findItem(item.submenu, label);
    if (inner) return inner;
  }
  return null;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function startControl({
  app, webContents, Menu, BrowserWindow,
}, write) {
  if (!controlPort) return;
  const page = () => webContents.getAllWebContents().find((w) => w.getType() === 'window');
  const consentFile = () => path.join(app.getPath('userData'), 'sentry-consent.json');

  const actions = {
    'crash-renderer': () => { page().forcefullyCrashRenderer(); return 'ok'; },
    'crash-main': () => { setTimeout(() => process.crash(), 50); return 'ok'; },
    'throw-main': (q) => {
      setTimeout(() => { throw new Error(q.get('message') || 'qa-main-throw'); }, 0);
      return 'ok';
    },
    send: (q) => {
      page().send(q.get('channel'), JSON.parse(q.get('args') || '[]')[0]);
      return 'ok';
    },
    'reset-all-data': () => { page().send('app:clear_storage'); return 'ok'; },
    'close-window': () => {
      BrowserWindow.getAllWindows().forEach((w) => w.close());
      return 'ok';
    },
    // Clicks run on the next tick, so a quit they start does not cut this reply.
    'menu-click': (q) => {
      const item = findItem(Menu.getApplicationMenu(), q.get('label'));
      if (!item) throw new Error(`no app menu item '${q.get('label')}'`);
      setTimeout(() => item.click(), 0);
      return 'ok';
    },
    'tray-click': (q) => {
      const item = findItem(trayMenu, q.get('label'));
      if (!item) throw new Error(`no systray menu item '${q.get('label')}'`);
      setTimeout(() => item.click(), 0);
      return 'ok';
    },
    'window-visible': () => String(BrowserWindow.getAllWindows().some((w) => w.isVisible())),
    consent: () => {
      try { return fs.readFileSync(consentFile(), 'utf8'); } catch (_e) { return 'absent'; }
    },
    'user-data': () => app.getPath('userData'),
    stub: (q) => {
      const includes = q.get('includes');
      if (!includes) throw new Error('stub needs includes=<text>');
      stubRules.push({ includes, status: Number(q.get('status') || 500) });
      return 'ok';
    },
  };

  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/stub-reply') {
      // What a failing full node answers. CORS headers: the page's origin is file://.
      const status = Number(u.searchParams.get('status') || 500);
      res.writeHead(req.method === 'OPTIONS' ? 204 : status, { ...CORS, 'content-type': 'application/json' });
      res.end(req.method === 'OPTIONS' ? '' : JSON.stringify({ success: false, message: 'Internal Server Error' }));
      return;
    }
    const action = actions[u.pathname.slice(1)];
    let body;
    try {
      body = action ? String(action(u.searchParams)) : `unknown action ${u.pathname}`;
      res.writeHead(action ? 200 : 404);
    } catch (e) {
      body = `error: ${e.message}`;
      res.writeHead(500);
    }
    write({ kind: 'control', action: u.pathname, result: body.slice(0, 200) });
    res.end(body);
  }).listen(controlPort, '127.0.0.1');
}
