/* Server-side hop between the public enquiry form and the dashboard.
   The page posts here same-origin; only this function knows INTAKE_KEY, so the
   key never reaches the browser and the dashboard needs no CORS entry for the
   website. Set DASHBOARD_URL and INTAKE_KEY as environment variables in the
   Vercel project — see .env.example. */

import { check as checkEmail, domainAcceptsMail } from './_email-check.js';

const TIMEOUT_MS = 10000;

/* How long to give DNS before waving the enquiry through. The lookup is
   normally ~30ms; this only bounds the bad case, and it fails open. */
const DNS_TIMEOUT_MS = 3000;

/* Long enough for a real enquiry, short enough that a paste-bomb is refused
   before it reaches the dashboard. The dashboard caps each field again. */
const MAX_BODY_BYTES = 24 * 1024;

const FIELDS = [
  'company', 'contactPerson', 'email', 'phone', 'country', 'product',
  'packing', 'quantityMt', 'dischargePort', 'incoterm', 'notes', 'website',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const base = String(process.env.DASHBOARD_URL || '').trim().replace(/\/+$/, '');
  const key = String(process.env.INTAKE_KEY || '').trim();
  if (!base || !key) {
    // Config problem, not the visitor's — say so without exposing which var.
    console.error('enquiry: DASHBOARD_URL and INTAKE_KEY must both be set');
    return res.status(503).json({
      error: 'The enquiry desk is not connected yet. Please email us directly.',
    });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'That enquiry could not be read.' });
  }

  /* The email is re-checked here, not just in the browser. The page's copy of
     these rules is a courtesy that saves a round trip; this one is the check
     that holds, because a script-disabled browser or a direct POST never runs
     the other. 422 rather than 400 — the request was understood and refused. */
  const verdict = checkEmail(body.email);
  if (!verdict.ok) {
    return res.status(422).json({ error: verdict.message, field: 'email', reason: verdict.code });
  }
  body.email = verdict.email;

  /* Then ask DNS whether that domain takes mail at all. Catches invented
     domains and made-up endings without a list of valid TLDs to keep current.
     Fails open on any resolver trouble — see _email-check.js. */
  const mail = await domainAcceptsMail(verdict.email.split('@')[1], DNS_TIMEOUT_MS);
  if (!mail.ok) {
    return res.status(422).json({
      error: 'That domain does not receive email. Please check the part after the @.',
      field: 'email',
      reason: 'no-mx',
    });
  }

  // Forward only the fields the intake route knows, so nothing else rides along.
  const payload = { source: 'website' };
  for (const f of FIELDS) if (body[f] !== undefined) payload[f] = body[f];

  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json, 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'That enquiry is too long to send.' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Intake-Key': key,
  };
  /* The dashboard rate-limits the intake route per IP. Without this every
     enquiry would arrive from the same Vercel address and share one bucket,
     so one busy hour would lock the form for everyone. */
  const ip = clientIp(req);
  if (ip) headers['X-Forwarded-For'] = ip;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${base}/api/public/enquiries`, {
      method: 'POST', headers, body: json, signal: ac.signal,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(text || '{}');
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    console.error('enquiry: upstream failed —', err?.message);
    return res.status(502).json({
      error: timedOut
        ? 'The enquiry desk did not answer in time. Please email us directly.'
        : 'The enquiry desk is unreachable right now. Please email us directly.',
    });
  } finally {
    clearTimeout(timer);
  }
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] || '').trim() || req.socket?.remoteAddress || '';
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}
