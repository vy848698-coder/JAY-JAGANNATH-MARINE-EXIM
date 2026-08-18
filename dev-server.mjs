/* Local development server.
   Serves the static site AND runs api/enquiry.js, which a plain static server
   (VS Code Live Server, python -m http.server) cannot do — and which opening
   home.html straight from disk cannot do either, because a file:// page
   resolves /api/enquiry to file:///api/enquiry and the fetch fails outright.

   This is a development convenience only. In production Vercel runs the
   function; this file is not deployed.

     node dev-server.mjs            → http://localhost:4200

   Reads DASHBOARD_URL and INTAKE_KEY from .env (see .env.example). */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/enquiry.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4200);

/* Same minimal .env reader the dashboard uses — real env vars win. */
try {
  const raw = await readFile(resolve(ROOT, '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
} catch {
  /* no .env — the relay reports the missing config itself */
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/enquiry') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body;
    try { body = JSON.parse(raw); } catch { body = raw; }

    /* the slice of Vercel's response object that api/enquiry.js actually uses */
    const shim = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { res.setHeader(k, v); },
      json(obj) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); return this; },
      send(text) { res.writeHead(this.statusCode); res.end(text); return this; },
    };
    try {
      await handler({ method: req.method, headers: req.headers, socket: req.socket, body }, shim);
    } catch (err) {
      console.error('relay threw:', err);
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"Relay failed."}'); }
    }
    console.log(`${req.method} /api/enquiry → ${shim.statusCode}`);
    return;
  }

  // mirror vercel.json's cleanUrls: /product serves product.html
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  if (path === '') path = 'home.html';
  if (!extname(path)) path += '.html';
  if (path.includes('..')) { res.writeHead(403); return res.end('forbidden'); }

  /* This server cannot execute PHP, and serving api/enquiry.php as a static
     file would hand the reader mail-config.php's app password. Apache runs
     that path; here it simply does not exist. */
  if (path.endsWith('.php')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }

  try {
    const data = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`\nJJME site → http://localhost:${PORT}`);
  const url = process.env.DASHBOARD_URL, key = process.env.INTAKE_KEY;
  console.log(`Dashboard  → ${url || '(DASHBOARD_URL not set)'}`);
  console.log(`Intake key → ${key ? 'set' : '(INTAKE_KEY not set)'}`);
  if (!url || !key) console.log('\nBoth must be set in .env before the enquiry form can send.\n');
  else console.log('');
});
