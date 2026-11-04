/**
 * Local stand-in for sentry.io. Every envelope is parsed into items the
 * scenarios assert on:
 *   { t, url, type: 'event'|'session'|'attachment'|'client_report'|...,
 *     message, source, level, release, status, minidump }
 * It can be stopped and restarted on the same port to simulate going offline.
 */
import http from 'http';
import zlib from 'zlib';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Split an envelope into its item headers and payloads (attachments are binary). */
export function parseEnvelope(buf) {
  const readLine = (from) => {
    const end = buf.indexOf(0x0a, from);
    return end === -1 ? [buf.subarray(from), buf.length] : [buf.subarray(from, end), end + 1];
  };
  let [line, pos] = readLine(0);
  const header = JSON.parse(line.toString('utf8') || '{}');
  const items = [];
  while (pos < buf.length) {
    [line, pos] = readLine(pos);
    if (!line.length) continue;
    const itemHeader = JSON.parse(line.toString('utf8'));
    let payload;
    if (itemHeader.length != null) {
      payload = buf.subarray(pos, pos + itemHeader.length);
      pos += itemHeader.length;
      if (buf[pos] === 0x0a) pos += 1;
    } else {
      [payload, pos] = readLine(pos);
    }
    items.push({ header: itemHeader, payload });
  }
  return { header, items };
}

function toItem({ header, payload }) {
  const item = { type: header.type };
  if (header.type === 'attachment') {
    item.filename = header.filename;
    item.minidump = payload.subarray(0, 4).toString('latin1') === 'MDMP';
    return item;
  }
  let body = null;
  try { body = JSON.parse(payload.toString('utf8')); } catch (_e) { /* binary */ }
  if (!body) return item;
  if (header.type === 'event') {
    const exc = body.exception && body.exception.values && body.exception.values[0];
    item.message = exc ? `${exc.type}: ${exc.value}` : (body.message && (body.message.formatted || body.message)) || '';
    item.level = body.level;
    item.release = body.release;
    item.source = body.extra && body.extra.source;
    item.native = !!(body.contexts && body.contexts.electron && body.contexts.electron.crashed_process)
      || /minidump|native/i.test(JSON.stringify(body.tags || {}));
  } else if (header.type === 'session') {
    item.status = body.status;
    item.errors = body.errors;
    item.release = body.attrs && body.attrs.release;
  }
  return item;
}

export async function startSink(port, { log = () => {} } = {}) {
  const items = [];
  let server = null;

  const handler = (req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let body = Buffer.concat(chunks);
      try { if (req.headers['content-encoding'] === 'gzip') body = zlib.gunzipSync(body); } catch (_e) { /* raw */ }
      const t = Date.now();
      try {
        parseEnvelope(body).items.map(toItem).forEach((it) => {
          items.push({ t, url: req.url, ...it });
          log(`sink: ${it.type}${it.message ? ` "${it.message}"` : ''}${it.status ? ` status=${it.status}` : ''}${it.minidump ? ' MDMP' : ''}`);
        });
      } catch (e) {
        items.push({ t, url: req.url, type: 'unparsed', error: e.message });
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
  };

  const listen = () => new Promise((resolve, reject) => {
    server = http.createServer(handler);
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const stop = () => new Promise((resolve) => {
    if (!server) { resolve(); return; }
    server.closeAllConnections?.();
    server.close(() => resolve());
    server = null;
  });

  await listen();
  return {
    items,
    url: `http://127.0.0.1:${port}`,
    mark: () => Date.now(),
    since: (mark, pred = () => true) => items.filter((i) => i.t >= mark && pred(i)),
    /** Resolve with the first item after `mark` matching `pred`, or throw after `timeout`. */
    async waitFor(pred, { since = 0, timeout = 15000, what = 'a matching envelope' } = {}) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const hit = items.find((i) => i.t >= since && pred(i));
        if (hit) return hit;
        await sleep(100);
      }
      throw new Error(`sink: timed out after ${timeout} ms waiting for ${what}`);
    },
    offline: stop,
    online: listen,
    close: stop,
  };
}
