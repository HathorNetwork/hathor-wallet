/**
 * Minimal Chrome DevTools Protocol client for the Electron renderer, over the
 * `ws` package already in the wallet's node_modules (no playwright).
 *
 * Records console messages and uncaught exceptions so a flow can fail on
 * renderer errors, and offers DOM helpers that run in the page.
 */
import { createRequire } from 'module';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** In-page helpers, injected once per document. */
const PAGE_HELPERS = `(() => {
  if (window.__e2e) return 'present';
  const visible = (e) => !!(e.offsetParent || e.getClientRects().length);
  const byText = (txt, sel) => [...document.querySelectorAll(sel || 'button,a,label,span,div,p,li,i,td,h1,h2,h3,h4,h5,strong')]
    .filter((e) => visible(e) && ((e.innerText || '').trim() === txt || e.getAttribute('title') === txt));
  window.__e2e = {
    text: () => document.body.innerText,
    has: (txt) => document.body.innerText.includes(txt),
    click: (txt, sel) => {
      const els = byText(txt, sel);
      // innermost match is last in document order among nested matches
      const el = els.pop();
      if (!el) return 'NOTFOUND ' + txt;
      el.click();
      return 'clicked ' + el.tagName;
    },
    clickSel: (sel) => {
      const el = [...document.querySelectorAll(sel)].filter(visible).pop();
      if (!el) return 'NOTFOUND ' + sel;
      el.click();
      return 'clicked ' + el.tagName;
    },
    setInput: (sel, val) => {
      const el = [...document.querySelectorAll(sel)].filter(visible).pop();
      if (!el) return 'NOTFOUND ' + sel;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'set ' + sel;
    },
    check: (sel) => {
      const el = [...document.querySelectorAll(sel)].pop();
      if (!el) return 'NOTFOUND ' + sel;
      if (!el.checked) el.click();
      return 'checked ' + sel;
    },
    visibleModals: () => [...document.querySelectorAll('.modal.show')].map((m) => ({ id: m.id, text: m.innerText.slice(0, 400) })),
    route: () => location.hash,
  };
  return 'installed';
})()`;

export class CDP {
  constructor({ port, nodeModules, log = () => {} }) {
    this.port = port;
    this.log = log;
    const require = createRequire(`${nodeModules}/`);
    this.WebSocket = require('ws');
    this.nextId = 0;
    this.pending = new Map();
    this.console = [];
    this.exceptions = [];
  }

  async connect({ timeout = 60000 } = {}) {
    const end = Date.now() + timeout;
    let target;
    while (Date.now() < end) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${this.port}/json`)).json();
        // Attach only once the app document has parsed its <title>: on
        // Electron 42 an attach during the first navigation made the
        // preload's `loaded` handler throw on localStorage.
        target = list.find((t) => t.type === 'page' && t.url.startsWith('file:') && t.title && !t.title.startsWith('file:'));
        if (target) break;
      } catch (_e) { /* not up yet */ }
      await sleep(300);
    }
    if (!target) throw new Error('no page target on CDP port');
    this.ws = new this.WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { this.ws.once('open', resolve); this.ws.once('error', reject); });
    this.ws.on('message', (raw) => this.onMessage(JSON.parse(raw)));
    this.ws.on('close', () => { this.closed = true; });
    const appContext = new Promise((resolve) => { this.onAppContext = resolve; });
    await this.send('Runtime.enable');
    await Promise.race([appContext, sleep(10000)]);
    return target;
  }

  onMessage(msg) {
    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.executionContextCreated') {
      const c = msg.params.context;
      if (c.auxData && c.auxData.isDefault && String(c.origin).startsWith('file://') && this.onAppContext) this.onAppContext(c);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => (a.value !== undefined ? (typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)) : (a.description || a.type))).join(' ');
      this.console.push({ t: Date.now(), type: msg.params.type, text });
      this.log(`console.${msg.params.type}: ${text.slice(0, 300)}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      const text = `${d.text} ${(d.exception && d.exception.description) || ''}`.trim();
      this.exceptions.push({ t: Date.now(), text });
      this.log(`EXCEPTION: ${text.slice(0, 500)}`);
    }
  }

  /** Fails after `timeout` ms, so an evaluation that never settles fails the run instead of hanging it. */
  send(method, params = {}, { timeout = 60000 } = {}) {
    if (this.closed) return Promise.reject(new Error('CDP socket closed'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeout} ms`));
      }, timeout);
      const settle = (fn) => (value) => { clearTimeout(timer); fn(value); };
      this.pending.set(id, { resolve: settle(resolve), reject: settle(reject) });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.text} ${JSON.stringify(r.exceptionDetails.exception || {})}`);
    return r.result.value;
  }

  /** Calls a window.__e2e helper, (re)installing helpers after navigations. */
  async page(fn, ...args) {
    await this.eval(PAGE_HELPERS);
    return this.eval(`window.__e2e.${fn}(${args.map((a) => JSON.stringify(a)).join(',')})`);
  }

  async waitFor(predicateExpr, { timeout = 30000, interval = 250, what = predicateExpr } = {}) {
    const end = Date.now() + timeout;
    let last;
    while (Date.now() < end) {
      try {
        await this.eval(PAGE_HELPERS);
        // DOM nodes can't be returned by value; treat them as truthy.
        last = await this.eval(`(() => { const v = (${predicateExpr}); return (v instanceof Node) ? true : v; })()`);
        if (last) return last;
      } catch (_e) { /* page reloading */ }
      await sleep(interval);
    }
    let body = '';
    try { body = (await this.page('text')).slice(0, 600); } catch (_e) { /* ignore */ }
    throw new Error(`timed out waiting for ${what}; page text: ${JSON.stringify(body)}`);
  }

  waitForText(text, opts = {}) {
    return this.waitFor(`window.__e2e.has(${JSON.stringify(text)})`, { what: `page text "${text}"`, ...opts });
  }

  async click(text, sel) {
    const r = await this.page('click', text, sel);
    if (String(r).startsWith('NOTFOUND')) throw new Error(`click: ${r}`);
    return r;
  }

  async clickSel(sel) {
    const r = await this.page('clickSel', sel);
    if (String(r).startsWith('NOTFOUND')) throw new Error(`clickSel: ${r}`);
    return r;
  }

  async setInput(sel, value) {
    const r = await this.page('setInput', sel, value);
    if (String(r).startsWith('NOTFOUND')) throw new Error(`setInput: ${r}`);
    return r;
  }

  close() {
    try { this.ws && this.ws.close(); } catch (_e) { /* ignore */ }
  }
}
