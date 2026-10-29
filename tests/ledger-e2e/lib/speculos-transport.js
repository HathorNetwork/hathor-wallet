/**
 * A @ledgerhq/hw-transport Transport that talks to Speculos's APDU TCP port.
 *
 * Wire format (Speculos apdu server):
 *   request:  4-byte big-endian length + APDU
 *   response: 4-byte big-endian length N + N bytes of data + 2-byte status word
 *
 * It also stands in for hw-transport-node-hid's static API (`listen`,
 * `create`, `isSupported`, ...) and exposes `device.close()`, which
 * public/ledger.js calls on every queue drain and device removal.
 *
 * CommonJS on purpose: it is loaded into the Electron main process through
 * `--require`, before any app code runs.
 */
const net = require('net');
const http = require('http');

/**
 * hw-transport-node-hid bundles its own copy of @ledgerhq/hw-transport, and
 * public/ledger.js matches errors by name, so extend that exact copy.
 */
function loadBaseTransport(fromDir) {
  const nodeHidPkg = require.resolve('@ledgerhq/hw-transport-node-hid/package.json', { paths: [fromDir] });
  const hwTransportPath = require.resolve('@ledgerhq/hw-transport', { paths: [nodeHidPkg] });
  const mod = require(hwTransportPath);
  return mod.default || mod;
}

function createSpeculosTransportClass({ fromDir, apduHost, apduPort, apiPort, log }) {
  const Transport = loadBaseTransport(fromDir);
  const descriptor = `speculos://${apduHost}:${apduPort}`;
  const deviceModel = { id: 'nanoSP', productName: 'Ledger Nano S Plus (Speculos)' };

  /** Resolves true when the Speculos REST API answers. */
  function apiAlive() {
    return new Promise((resolve) => {
      const req = http.get({ host: apduHost, port: apiPort, path: '/', timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  class SpeculosTransport extends Transport {
    static isSupported = () => Promise.resolve(true);

    static list = async () => ((await apiAlive()) ? [descriptor] : []);

    /**
     * Polls Speculos and emits `add` when it comes up and `remove` when it
     * goes away, like node-hid's usb hot-plug events.
     */
    static listen = (observer) => {
      let present = false;
      let stopped = false;
      let timer = null;
      const tick = async () => {
        if (stopped) return;
        const alive = await apiAlive();
        if (stopped) return;
        if (alive && !present) {
          present = true;
          log(`listen: add ${descriptor}`);
          observer.next({ type: 'add', descriptor, deviceModel });
        } else if (!alive && present) {
          present = false;
          log(`listen: remove ${descriptor}`);
          observer.next({ type: 'remove', descriptor, deviceModel });
        }
        timer = setTimeout(tick, 500);
      };
      tick();
      return { unsubscribe: () => { stopped = true; clearTimeout(timer); } };
    };

    static open = (desc = descriptor) => new Promise((resolve, reject) => {
      const socket = net.connect({ host: apduHost, port: apduPort });
      const onError = (e) => { socket.destroy(); reject(e); };
      socket.once('error', onError);
      socket.once('connect', () => {
        socket.off('error', onError);
        resolve(new SpeculosTransport(socket, desc));
      });
    });

    static create = (openTimeout = 3000) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Speculos open timeout')), openTimeout);
      SpeculosTransport.open().then(
        (t) => { clearTimeout(timer); resolve(t); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });

    constructor(socket, desc) {
      super();
      this.socket = socket;
      this.descriptor = desc;
      this.buffer = Buffer.alloc(0);
      this.pending = null;
      this.closed = false;
      socket.on('data', (chunk) => this.onData(chunk));
      socket.on('error', (e) => this.fail(e));
      socket.on('close', () => {
        this.closed = true;
        this.fail(new Error('Speculos connection closed'));
        this.emit('disconnect');
      });
      // public/ledger.js closes node-hid's HID handle through this.
      this.device = { close: () => this.close() };
    }

    onData(chunk) {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      if (this.buffer.length < 4) return;
      const size = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + size + 2) return;
      const response = this.buffer.slice(4, 4 + size + 2);
      this.buffer = this.buffer.slice(4 + size + 2);
      const pending = this.pending;
      this.pending = null;
      if (pending) pending.resolve(response);
    }

    fail(e) {
      const pending = this.pending;
      this.pending = null;
      if (pending) pending.reject(e);
    }

    exchange(apdu) {
      if (this.closed) return Promise.reject(new Error('Speculos transport closed'));
      if (this.pending) return Promise.reject(new Error('Speculos exchange already in flight'));
      return new Promise((resolve, reject) => {
        this.pending = { resolve, reject };
        const header = Buffer.alloc(4);
        header.writeUInt32BE(apdu.length, 0);
        log(`=> ${apdu.toString('hex')}`);
        this.socket.write(Buffer.concat([header, apdu]));
      }).then((r) => {
        log(`<= ${r.toString('hex')}`);
        return r;
      });
    }

    setScrambleKey() {}

    close() {
      if (!this.closed) {
        this.closed = true;
        this.socket.end();
        this.socket.destroy();
      }
      return Promise.resolve();
    }
  }

  return SpeculosTransport;
}

module.exports = { createSpeculosTransportClass };
