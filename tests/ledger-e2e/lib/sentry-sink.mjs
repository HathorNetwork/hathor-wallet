/**
 * Local stand-in for Sentry. The app is launched with SENTRY_DSN pointing
 * here, so no event leaves the machine; envelopes are counted and kept for
 * the report.
 */
import http from 'http';
import zlib from 'zlib';

export function startSentrySink(port) {
  const envelopes = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let body = Buffer.concat(chunks);
      try {
        if (req.headers['content-encoding'] === 'gzip') body = zlib.gunzipSync(body);
      } catch (_e) { /* keep raw */ }
      const text = body.toString('utf8');
      const types = text.split('\n').filter(Boolean).slice(1)
        .map((l) => { try { return JSON.parse(l).type; } catch (_e) { return null; } })
        .filter(Boolean);
      envelopes.push({ t: Date.now(), url: req.url, types, text });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({
      envelopes,
      close: () => new Promise((r) => server.close(() => r())),
    }));
  });
}
