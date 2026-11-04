#!/usr/bin/env node
/**
 * Local stand-in for sentry.io for the manual Sentry QA (qa/graph/sentry.yaml).
 *
 *   node qa/e2e/sentry/manual-sink.mjs [port]    # default 9876
 *
 * Launch the wallet with SENTRY_DSN=http://qa@127.0.0.1:<port>/1 and every
 * envelope main or preload sends lands here instead of sentry.io. Each one is
 * printed as one line and appended, raw, to envelopes-<date>.jsonl in the
 * system temp directory.
 *
 * Type `m <note>` + Enter to print a marker line (e.g. `m crash-modal:opted-out`),
 * so the log shows where each scenario starts. Type `c` + Enter to print the
 * count so far.
 */
import fs from 'fs';
import os from 'os';
import http from 'http';
import path from 'path';
import readline from 'readline';
import zlib from 'zlib';

const port = Number(process.argv[2] || 9876);
const logFile = path.join(os.tmpdir(), `envelopes-${new Date().toISOString().slice(0, 10)}.jsonl`);
let count = 0;

const time = () => new Date().toISOString().slice(11, 23);

/**
 * Split a Sentry envelope into its header and (item header, payload) pairs.
 * Payloads with a `length` are sliced by byte count, since minidumps are binary.
 */
function parseEnvelope(buf) {
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

function describeItem({ header, payload }) {
  const type = header.type;
  if (type === 'attachment') {
    const magic = payload.subarray(0, 4).toString('latin1');
    return `attachment(${header.filename || '?'}, ${payload.length}B${magic === 'MDMP' ? ', MDMP' : ''})`;
  }
  let body = null;
  try { body = JSON.parse(payload.toString('utf8')); } catch (_e) { /* binary or empty */ }
  if (type === 'event' && body) {
    const exc = body.exception?.values?.[0];
    const what = exc ? `${exc.type}: ${exc.value}` : (body.message?.formatted || body.message || '?');
    const source = body.extra?.source ? ` source=${body.extra.source}` : '';
    const proc = body.contexts?.electron?.crashed_process || body.tags?.['event.process'] || body.tags?.['event_type'] || '';
    return `event[${body.level || '?'}${proc ? `,${proc}` : ''}] "${String(what).slice(0, 120)}"${source} release=${body.release}`;
  }
  if (type === 'session' && body) {
    return `session(status=${body.status}, errors=${body.errors}, release=${body.attrs?.release})`;
  }
  if (type === 'client_report') {
    return 'client_report  <-- should never appear (sendClientReports is off)';
  }
  return type;
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    let body = Buffer.concat(chunks);
    try {
      if (req.headers['content-encoding'] === 'gzip') body = zlib.gunzipSync(body);
    } catch (_e) { /* keep raw */ }
    count += 1;
    let summary;
    try {
      const { items } = parseEnvelope(body);
      summary = items.map(describeItem).join(' + ') || '(empty envelope)';
    } catch (e) {
      summary = `(unparsed ${body.length}B: ${e.message})`;
    }
    console.log(`${time()}  #${count}  ${req.method} ${req.url}  ${summary}`);
    fs.appendFileSync(logFile, `${JSON.stringify({ t: Date.now(), url: req.url, summary, raw: body.toString('base64') })}\n`);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Sentry sink on http://127.0.0.1:${port}  (log: ${logFile})`);
  console.log(`Launch the wallet with SENTRY_DSN=http://qa@127.0.0.1:${port}/1`);
  console.log('Type "m <note>" to mark a scenario, "c" for the count.\n');
});

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (line.startsWith('m ')) console.log(`\n${time()}  ==== ${line.slice(2)} ====  (envelopes so far: ${count})`);
  else if (line.trim() === 'c') console.log(`${time()}  envelopes so far: ${count}`);
});
