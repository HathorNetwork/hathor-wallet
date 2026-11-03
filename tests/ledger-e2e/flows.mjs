/**
 * The Ledger flows. Each flow drives the app over CDP and the device over
 * the Speculos REST API, and throws on the first failed assertion. What it
 * returns is printed in the report.
 *
 * To add a flow, append `{ id, title, run: async (ctx) => details }` to
 * FLOWS. See README.md for the `ctx` API.
 */
import { Device } from './lib/device.mjs';

export class AssertionError extends Error {}

function assert(cond, msg) {
  if (!cond) throw new AssertionError(msg);
}

function eq(actual, expected, label) {
  assert(actual === expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const lsGet = (ctx, key) => ctx.cdp.eval(`localStorage.getItem(${JSON.stringify(key)})`);

/** Clicks through the first-run screens until the wallet-type choice. */
async function reachWalletType(ctx) {
  const { cdp } = ctx;
  for (let i = 0; i < 20; i += 1) {
    const text = await cdp.waitFor('document.body && document.body.innerText.length > 20 && document.body.innerText', { timeout: 30000 });
    if (text.includes('Hardware wallet') && text.includes('Software wallet')) return;
    if (text.includes('I agree with the Terms of Service')) {
      await cdp.page('check', '#confirmAgree');
      await cdp.click('Get started', 'button');
    } else if (text.includes('Automatic bug report')) {
      // Opt out: the run then asserts that nothing reached the Sentry sink.
      const checked = await cdp.eval(`(() => {
        const box = document.querySelector('#permission');
        if (box && box.checked) box.click();
        return box ? box.checked : null;
      })()`);
      eq(checked, false, 'bug report checkbox unticked');
      await cdp.click('Continue', 'button');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new AssertionError('never reached the wallet type screen');
}

/** Hardware-wallet start: version check, xpub approval, wallet loads. */
async function startHardwareWallet(ctx) {
  const { cdp, device, ipc, expected } = ctx;
  await reachWalletType(ctx);
  const mark = ipc.mark();
  await cdp.click('Hardware wallet', 'button');

  const getVersion = await ipc.waitFor((e) => e.dir === 'renderer->main' && e.channel === 'ledger:getVersion', { since: mark });
  const version = await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:version', { since: mark });
  const vArg = version.args[0];
  eq(vArg.fields.success.value, true, 'ledger:version success');
  const vHex = vArg.fields.data.hex;
  assert(vHex.startsWith('485452'), `ledger:version data should start with "HTR", got ${vHex}`);
  const appVersion = [...Buffer.from(vHex, 'hex').slice(3, 6)].join('.');

  await ipc.waitFor((e) => e.dir === 'renderer->main' && e.channel === 'ledger:getPublicKeyData', { since: mark });
  const xpubScreens = await device.walkAndConfirm('access?');
  const pkd = await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:publicKeyData', { since: mark });
  eq(pkd.args[0].fields.success.value, true, 'ledger:publicKeyData success');
  const pkdHex = pkd.args[0].fields.data.hex;
  const xpubFromDevice = await ctx.xpubFromDeviceData(pkdHex);
  eq(xpubFromDevice, expected.xpub, 'xpub rebuilt from device reply vs seed-derived xpub');

  await cdp.waitFor('location.hash === "#/wallet/" && document.body.innerText.includes("Address to receive tokens")', { timeout: 120000, what: 'wallet screen' });
  const accessData = JSON.parse(await lsGet(ctx, 'localstorage:accessdata'));
  eq(accessData.xpubkey, expected.xpub, 'xpub stored by the app');
  const shown = await cdp.eval(`(() => { const a = [...document.querySelectorAll('a')].find((x) => x.innerText.trim() === 'Show full address'); return a && a.previousElementSibling ? a.previousElementSibling.innerText.trim() : null; })()`);
  eq(shown, `${expected.addresses[0].substring(0, 10)}...`, 'first address shown (truncated)');

  return {
    getVersionSent: !!getVersion,
    appVersion,
    device: xpubScreens.map((s) => s.join(' ')).join(' > '),
    xpub: `${xpubFromDevice.slice(0, 16)}... == seed xpub`,
    shownAddress: shown,
    payloadTypes: `version.data=${vArg.fields.data.type}, publicKeyData.data=${pkd.args[0].fields.data.type}`,
  };
}

/** Builds the bytes src/utils/ledger.js#serializeTokenInfo sends with a signature. */
function tokenWithSignatureHex(token, signatureHex) {
  const sym = Buffer.from(token.symbol, 'utf8');
  const name = Buffer.from(token.name, 'utf8');
  return Buffer.concat([
    Buffer.from([1]), Buffer.from(token.uid, 'hex'),
    Buffer.from([sym.length]), sym, Buffer.from([name.length]), name,
    Buffer.from(signatureHex, 'hex'),
  ]).toString('hex');
}

/**
 * Sends a ledger:* request through the renderer's own IPC object
 * (window.electronAPI on the isolated build, ipcRenderer on nodeIntegration
 * builds) and resolves with the reply payload.
 */
function bridgeRequest(ctx, method, replyChannel, dataHex) {
  return ctx.cdp.eval(`(async () => {
    const ipc = window.electronAPI || (window.require && window.require('electron').ipcRenderer);
    const data = ${dataHex ? `new Uint8Array(${JSON.stringify(dataHex)}.match(/../g).map((h) => parseInt(h, 16)))` : 'undefined'};
    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ timeout: true }), 20000);
      ipc.on(${JSON.stringify(replyChannel)}, (_event, arg) => {
        clearTimeout(timer);
        ipc.removeAllListeners(${JSON.stringify(replyChannel)});
        resolve({ eventArg: _event === undefined ? 'undefined' : typeof _event, success: arg.success, error: arg.error || null });
      });
      ipc.send(${JSON.stringify(`ledger:${method}`)}, data);
    });
  })()`);
}

async function selectToken(ctx, symbol) {
  await ctx.cdp.click('Wallet', 'a');
  await ctx.cdp.waitFor(`[...document.querySelectorAll('.token-wrapper')].some((e) => e.innerText.trim() === ${JSON.stringify(symbol)})`, { what: `${symbol} in token list` });
  await ctx.cdp.eval(`[...document.querySelectorAll('.token-wrapper')].find((e) => e.innerText.trim() === ${JSON.stringify(symbol)}).click()`);
  await ctx.cdp.waitFor(`document.querySelector('.token-wrapper.selected') && document.querySelector('.token-wrapper.selected').innerText.trim() === ${JSON.stringify(symbol)}`);
}


/**
 * A hardware wallet left open must not reopen on the next launch when the
 * device is gone: the preload drops its access data at startup.
 */
function closedHardwareWalletFlow({ id, early }) {
  return {
    id,
    title: `Closed hardware wallet does not reopen without the device (${early ? 'early CDP attach' : 'normal attach'})`,
    async run(ctx) {
      await ctx.startSpeculos();
      if (!(await ctx.cdp.eval('location.hash === "#/wallet/"'))) await startHardwareWallet(ctx);
      const saved = await lsGet(ctx, 'localstorage:accessdata');
      const before = JSON.parse(saved);
      assert(before && (before.walletFlags & 0x02) > 0, `precondition: hardware access data stored (${saved})`);

      // The early attach only sometimes lands before the first navigation
      // commits, so relaunch until it does. Each attempt restores the access
      // data the previous launch removed, as if the wallet had been left open.
      const maxAttempts = early ? 8 : 1;
      let attempt = 0;
      let raceFired = false;
      let route;
      let accessData;
      let contextsSeen = [];
      while (attempt < maxAttempts && !(early && raceFired)) {
        attempt += 1;
        if (attempt > 1) await ctx.cdp.eval(`localStorage.setItem('localstorage:accessdata', ${JSON.stringify(saved)})`);
        const consoleBefore = ctx.cdp.console.length;
        await ctx.restartApp({ early, beforeLaunch: attempt === 1 ? () => ctx.stopSpeculos() : undefined });
        const { cdp } = ctx;
        await cdp.waitFor('location.hash !== "" && document.body.innerText.length > 20', { what: 'app to route' });
        // Give the router time to settle before judging where the app landed.
        await new Promise((r) => setTimeout(r, 3000));
        // The race shows as the preload's isolated world being created for a
        // document other than the wallet's (the initial about:blank).
        raceFired = raceFired || cdp.contexts.some((c) => c.type === 'isolated' && !c.origin.startsWith('file://'));
        const stepErrors = cdp.console.slice(consoleBefore).filter((c) => c.text.includes('preload: startup step'));
        assert(stepErrors.length === 0, `relaunch ${attempt} logged preload startup step errors: ${stepErrors.map((c) => c.text.slice(0, 200)).join(' | ')}`);
        contextsSeen = cdp.contexts.map((c) => `${c.type}:${c.origin || '(empty)'}`);
        route = await cdp.eval('location.hash');
        accessData = await lsGet(ctx, 'localstorage:accessdata');
        eq(accessData, null, `hardware access data after relaunch ${attempt}`);
        assert(route === '#/wallet_type/' || route === '#/welcome/', `relaunch ${attempt} landed on ${route}, expected the wallet type or welcome screen`);
      }
      if (early) assert(raceFired, `early attach never hit the first navigation in ${attempt} relaunches`);
      return { route, accessDataAfterRelaunch: accessData, relaunches: attempt, storageRaceFired: raceFired, contextsSeen };
    },
  };
}

export const FLOWS = [
  {
    id: 'hw-start',
    title: 'Hardware-wallet start (getVersion, getPublicKeyData, wallet opens)',
    run: startHardwareWallet,
  },
  {
    id: 'show-address',
    title: 'Show address on device (checkAddress -> ledger:address)',
    async run(ctx) {
      const { cdp, device, ipc, expected } = ctx;
      const mark = ipc.mark();
      await cdp.click('Show full address', 'a');
      await cdp.waitFor('document.querySelector("#ledgerAlert.show strong")', { what: 'address modal' });
      const appAddress = await cdp.eval('document.querySelector("#ledgerAlert.show strong").innerText.trim()');
      const req = await ipc.waitFor((e) => e.dir === 'renderer->main' && e.channel === 'ledger:checkAddress', { since: mark });
      const screens = await device.walkAndConfirm('Address');
      const deviceAddress = Device.field(screens, 'Address');
      const reply = await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:address', { since: mark });
      eq(reply.args[0].fields.success.value, true, 'ledger:address success');
      await cdp.waitFor('!document.querySelector("#ledgerAlert.show")', { what: 'address modal to close' });
      eq(deviceAddress, appAddress, 'device address vs app address');
      eq(appAddress, expected.addresses[0], 'app address vs seed-derived m/44\'/280\'/0\'/0/0');
      return {
        index: `${req.args[0].type}:${req.args[0].value}`,
        device: screens.map((s) => s.join(' ')).join(' > '),
        app: appAddress,
        modalClosed: true,
      };
    },
  },
  {
    id: 'token-sign',
    title: 'Register custom token, sign on device (signToken), verify (verifyTokenSignature)',
    async run(ctx) {
      const { cdp, device, ipc, token } = ctx;
      await cdp.click('Custom tokens', 'a');
      await cdp.click('Register a token', 'button');
      await cdp.waitFor('document.querySelector("#addTokenModal.show textarea")', { what: 'register token modal' });
      await cdp.setInput('#addTokenModal.show textarea', token.configString);
      await cdp.click('Register', '#addTokenModal.show button');
      await cdp.waitFor('!document.querySelector("#addTokenModal.show")', { what: 'register modal to close' });

      await selectToken(ctx, token.symbol);
      await cdp.clickSel('i[title="Sign token on Ledger"]');
      await cdp.waitFor('document.querySelector("#signTokenDataModal.show")', { what: 'sign token modal' });
      const modalText = await cdp.eval('document.querySelector("#signTokenDataModal.show").innerText');
      const mark = ipc.mark();
      await cdp.click('Sign token', '#signTokenDataModal.show button');
      const req = await ipc.waitFor((e) => e.dir === 'renderer->main' && e.channel === 'ledger:signToken', { since: mark });
      const screens = await device.walkAndConfirm('Confirm token data');
      const reply = await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:tokenSignature', { since: mark });
      eq(reply.args[0].fields.success.value, true, 'ledger:tokenSignature success');
      await cdp.waitForText('Token was signed!');

      const devSymbol = Device.field(screens, 'Symbol');
      const devName = Device.field(screens, 'Name');
      const devUid = Device.field(screens, 'UID').toLowerCase();
      eq(devSymbol, token.symbol, 'device symbol');
      eq(devName, token.name, 'device name');
      eq(devUid, token.uid, 'device uid');
      assert(modalText.includes(`Symbol: ${token.symbol}`) && modalText.includes(`Name: ${token.name}`), `app modal shows token: ${JSON.stringify(modalText)}`);

      const sigs = JSON.parse(await lsGet(ctx, 'localstorage:token:signatures') || '{}');
      const sig = sigs[token.uid];
      eq(sig, reply.args[0].fields.data.hex, 'signature stored by the app vs device reply');
      ctx.state.signature = sig;
      await cdp.click('Close', '#signTokenDataModal.show button');
      await cdp.waitFor('!document.querySelector("#signTokenDataModal.show")');
      await cdp.waitFor('!!document.querySelector(\'i[title="Token signed with Ledger"]\')', { what: 'signed icon' });

      // The UI only calls verifyTokenSignature when the sign modal opens on a
      // token that already has a signature, which the key icon never allows,
      // so drive it through the renderer's bridge object instead.
      const verify = await bridgeRequest(ctx, 'verifyTokenSignature', 'ledger:tokenSignatureValid', tokenWithSignatureHex(token, sig));
      eq(verify.success, true, `verifyTokenSignature via bridge (${JSON.stringify(verify)})`);
      return {
        request: `${req.args[0].type} ${req.args[0].hex.length / 2}B`,
        device: `Symbol=${devSymbol}, Name=${devName}, UID=${devUid.slice(0, 12)}...`,
        app: `Symbol=${token.symbol}, Name=${token.name}`,
        signature: `${sig.slice(0, 16)}... (${reply.args[0].fields.data.type})`,
        verifyViaBridge: `success=${verify.success}, listener event arg=${verify.eventArg}`,
      };
    },
  },
  {
    id: 'token-verify-restart',
    title: 'Restart app; startup verifyManyTokenSignatures({uid: bytes}) succeeds',
    async run(ctx) {
      const { ipc, token } = ctx;
      assert(ctx.state.signature, 'needs token-sign to have run');
      await ctx.restartApp();
      const mark = ipc.mark();
      await startHardwareWallet(ctx);
      const req = await ipc.waitFor((e) => e.dir === 'renderer->main' && e.channel === 'ledger:verifyManyTokenSignatures', { since: mark, timeout: 60000 });
      const reply = await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:manyTokenSignatureValid', { since: mark });
      const payload = req.args[0];
      eq(payload.type, 'object', 'verifyMany payload type');
      const entry = payload.fields[token.uid];
      assert(entry, `verifyMany payload has key ${token.uid}: ${JSON.stringify(payload)}`);
      eq(entry.hex, tokenWithSignatureHex(token, ctx.state.signature), 'verifyMany payload bytes');
      eq(reply.args[0].fields.success.value, true, 'manyTokenSignatureValid success');
      eq(reply.args[0].fields.data.items.length, 0, 'tokens with invalid signatures');
      const sigs = JSON.parse(await lsGet(ctx, 'localstorage:token:signatures') || '{}');
      eq(sigs[token.uid], ctx.state.signature, 'signature kept after verifyMany');
      await selectToken(ctx, token.symbol);
      await ctx.cdp.waitFor('!!document.querySelector(\'i[title="Token signed with Ledger"]\')', { what: 'signed icon after restart' });
      return {
        payload: `{${token.uid.slice(0, 10)}...: ${entry.type} ${entry.hex.length / 2}B}`,
        reply: `success=true, invalid=[]`,
        signedIconAfterRestart: true,
      };
    },
  },
  {
    id: 'token-reset',
    title: 'Reset token signatures (resetTokenSignatures)',
    async run(ctx) {
      const { cdp, device, ipc, token } = ctx;
      assert(ctx.state.signature, 'needs token-sign to have run');
      await cdp.clickSel('i[title="Settings"]');
      await cdp.click('Untrust all tokens on Ledger', 'a');
      await cdp.waitFor('document.querySelector("#resetTokenSignatures.show")', { what: 'reset modal' });
      const mark = ipc.mark();
      await cdp.click('Start', '#resetTokenSignatures.show button');
      const screens = await device.walkAndConfirm('Reset token signatures');
      const reply = await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:tokenSignatureReset', { since: mark });
      eq(reply.args[0].fields.success.value, true, 'tokenSignatureReset success');
      await cdp.waitForText('Custom tokens on Ledger were reset!');
      eq(await lsGet(ctx, 'localstorage:token:signatures'), null, 'app signatures after reset');
      await cdp.click('Close', '#resetTokenSignatures.show button');
      // The device must now reject the old signature.
      const verify = await bridgeRequest(ctx, 'verifyTokenSignature', 'ledger:tokenSignatureValid', tokenWithSignatureHex(token, ctx.state.signature));
      eq(verify.success, false, 'old signature rejected after reset');
      eq(verify.error && verify.error.status, 0xb00a, 'device status for old signature (SW_INVALID_SIGNATURE)');
      return {
        device: screens.map((s) => s.join(' ')).join(' > '),
        app: 'Custom tokens on Ledger were reset!',
        oldSignature: `rejected, status 0x${verify.error.status.toString(16)}`,
      };
    },
  },
  {
    id: 'disconnect',
    title: 'Device disconnect while wallet open (ledger:closed)',
    async run(ctx) {
      const { cdp, ipc } = ctx;
      await cdp.click('Wallet', 'a');
      await cdp.waitFor('location.hash === "#/wallet/"');
      const mark = ipc.mark();
      await ctx.stopSpeculos();
      await ipc.waitFor((e) => e.kind === 'transport' && e.msg.startsWith('listen: remove'), { since: mark, timeout: 15000 });
      await ipc.waitFor((e) => e.dir === 'main->renderer' && e.channel === 'ledger:closed', { since: mark, timeout: 15000 });
      await cdp.waitFor('location.hash !== "#/wallet/"', { what: 'app to leave the wallet screen', timeout: 15000 });
      await cdp.waitForText('Ledger disconnected', { timeout: 10000 });
      const route = await cdp.eval('location.hash');
      const unhandled = await cdp.eval('!!document.querySelector("#unhandledErrorModal.show")');
      eq(unhandled, false, 'unhandled error modal shown');
      return { route, alert: 'Ledger disconnected! ...', unhandledErrorModal: false };
    },
  },
  closedHardwareWalletFlow({ id: 'closed-hw-no-reopen', early: false }),
  closedHardwareWalletFlow({ id: 'closed-hw-no-reopen-early', early: true }),
];
