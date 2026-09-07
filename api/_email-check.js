/* Server-side copy of the enquiry form's email rules, plus the one check a
   browser cannot make: asking DNS whether the domain can receive mail at all.

   Vercel builds every file under api/ into a serverless function except those
   whose name begins with an underscore, which is why this is _email-check.js
   and not email-check.js — otherwise the site would gain a public endpoint
   that does nothing.

   The rule tables below are the same ones in assets/js/email-check.js and are
   meant to stay identical; tools/email-rules-sync.mjs fails if they drift.
   The browser copy exists so a typo is caught without a round trip. This copy
   is the one that decides, because it is the one a visitor cannot skip by
   turning off JavaScript or posting to the endpoint directly. */

import { promises as dns } from 'node:dns';

const DOMAIN_TYPOS = {
  'gmail.con': 'gmail.com',   'gmail.cm': 'gmail.com',    'gmail.co': 'gmail.com',
  'gmail.comm': 'gmail.com',  'gmail.cpm': 'gmail.com',   'gmail.ocm': 'gmail.com',
  'gmail.vom': 'gmail.com',   'gmail.xom': 'gmail.com',   'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',    'gmaill.com': 'gmail.com',  'gnail.com': 'gmail.com',
  'gmail.om': 'gmail.com',    'gamil.com': 'gmail.com',   'gmail.in': 'gmail.com',
  'googlemail.con': 'googlemail.com',
  'yahoo.con': 'yahoo.com',   'yaho.com': 'yahoo.com',    'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',    'yhaoo.com': 'yahoo.com',
  'hotmail.con': 'hotmail.com',  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',   'hotmall.com': 'hotmail.com',
  'outlook.con': 'outlook.com',  'outlok.com': 'outlook.com',  'outlook.co': 'outlook.com',
  'rediffmail.con': 'rediffmail.com', 'rediff.com': 'rediffmail.com',
  'icloud.con': 'icloud.com',    'iclod.com': 'icloud.com',
};

const DISPOSABLE = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
  'tempmail.com', 'temp-mail.org', 'throwawaymail.com', '10minutemail.com',
  '10minutemail.net', 'yopmail.com', 'trashmail.com', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mailnesia.com',
  'mohmal.com', 'moakt.com', 'emailondeck.com', 'spamgourmet.com',
  'tempinbox.com', 'mytemp.email', 'discard.email', 'grr.la', 'spam4.me',
];

const PROVIDERS = {
  'gmail.com':      { min: 6, max: 30, chars: /^[a-z0-9.]+$/, label: 'Gmail' },
  'googlemail.com': { min: 6, max: 30, chars: /^[a-z0-9.]+$/, label: 'Gmail' },
  'yahoo.com':      { min: 4, max: 32, chars: /^[a-z][a-z0-9._]*$/, label: 'Yahoo' },
  'yahoo.co.in':    { min: 4, max: 32, chars: /^[a-z][a-z0-9._]*$/, label: 'Yahoo' },
  'outlook.com':    { min: 1, max: 64, chars: /^[a-z][a-z0-9._-]*$/, label: 'Outlook' },
  'hotmail.com':    { min: 1, max: 64, chars: /^[a-z][a-z0-9._-]*$/, label: 'Outlook' },
  'live.com':       { min: 1, max: 64, chars: /^[a-z][a-z0-9._-]*$/, label: 'Outlook' },
};

const LOCAL_ATOM = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

const bad = (code, message) => ({ ok: false, code, message });

/* Syntax, typo and provider rules. Identical in behaviour to the browser
   copy — same order, same messages, so a visitor who somehow reaches the
   server check first is not told something different. */
export function check(raw) {
  const email = String(raw ?? '').trim();

  if (!email) return bad('required', 'Please add your email so the quotation can be issued.');
  if (email.length > 254) return bad('syntax', 'That email address is too long to be real.');
  if (/\s/.test(email)) return bad('syntax', 'An email address cannot contain a space.');

  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) {
    return bad('syntax', 'That does not look like an email address — it needs a name, an @, then a domain.');
  }
  if (email.indexOf('@') !== at) return bad('syntax', 'An email address can only contain one @.');

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();

  if (local.length > 64) return bad('syntax', 'The part before the @ is too long to be real.');
  if (local.startsWith('.') || local.endsWith('.')) {
    return bad('syntax', 'The part before the @ cannot start or end with a dot.');
  }
  if (local.includes('..')) return bad('syntax', 'The part before the @ has two dots in a row.');
  if (!LOCAL_ATOM.test(local)) {
    return bad('syntax', 'The part before the @ contains a character an email address cannot carry.');
  }

  if (domain.length > 253) return bad('syntax', 'The domain in that address is too long to be real.');
  const labels = domain.split('.');
  if (labels.length < 2) {
    return bad('syntax', 'The domain needs a dot in it — gmail.com, not gmail.');
  }
  for (const l of labels) {
    if (!l) return bad('syntax', 'The domain has two dots in a row, or starts or ends with one.');
    if (l.length > 63) return bad('syntax', 'Part of that domain is too long to be real.');
    if (!LABEL.test(l)) return bad('syntax', 'The domain contains a character a domain name cannot carry.');
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2) return bad('tld', 'The ending of that domain is too short — .com, .in, .ae and so on.');
  if (!/^[a-z]+$/.test(tld)) {
    return bad('tld', 'The ending of that domain should be letters only — .com, .in, .ae and so on.');
  }

  if (Object.prototype.hasOwnProperty.call(DOMAIN_TYPOS, domain)) {
    const fixed = `${local}@${DOMAIN_TYPOS[domain]}`;
    return { ok: false, code: 'typo', suggestion: fixed, message: `Did you mean ${fixed}?` };
  }

  const root2 = labels.slice(-2).join('.');
  if (DISPOSABLE.includes(domain) || DISPOSABLE.includes(root2)) {
    return bad('disposable',
      'That is a temporary inbox. The quotation and test certificate need an address you will still hold next week.');
  }

  const rule = PROVIDERS[domain];
  if (rule) {
    const base = local.split('+')[0].toLowerCase();
    const bare = base.replace(/\./g, '');
    if (!base || !rule.chars.test(base) || base.startsWith('.') || base.endsWith('.')) {
      return bad('provider', `That is not a valid ${rule.label} address — check the part before the @.`);
    }
    if (bare.length < rule.min || bare.length > rule.max) {
      return bad('provider',
        `${rule.label} addresses are ${rule.min} to ${rule.max} characters before the @. Please check yours.`);
    }
  }

  return { ok: true, email: `${local}@${domain}` };
}

/* ── Does this domain accept mail? ──────────────────────────────────────────
   The check the browser cannot make, and the reason there is no hardcoded
   list of valid endings anywhere in this file. An invented domain or a
   made-up TLD has no MX and no address record, and DNS says so in about
   30ms — and it says so about a TLD registered last week too, which a
   checked-in list never would.

   A domain with an A or AAAA record but no MX still receives mail: RFC 5321
   treats the address record as an implicit MX. Both are accepted.

   FAILS OPEN. A DNS timeout, a rate limit or a resolver outage must never
   turn away a real buyer — the only refusal here is a definitive "this name
   does not exist" or "it exists and takes no mail". Anything else lets the
   enquiry through, because losing an order costs more than a junk entry. */

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();   // domain → { ok, until }

export async function domainAcceptsMail(domain, timeoutMs = 3000) {
  const key = String(domain || '').toLowerCase();
  if (!key) return { ok: false, reason: 'no-domain' };

  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return { ok: hit.ok, reason: 'cached' };

  const remember = (ok) => {
    cache.set(key, { ok, until: Date.now() + TTL_MS });
    if (cache.size > 500) cache.clear();
    return ok;
  };

  /* dns.promises has no per-call timeout, so the race is the timeout. The
     "unknown" arm is the fail-open path and is deliberately not cached. */
  const guard = new Promise((resolve) => setTimeout(() => resolve('timeout'), timeoutMs));

  /* Both lookups are tried before anything is decided, because they fail
     independently. resolveMx talks to a nameserver on port 53 directly;
     dns.lookup goes through the host's own resolver. A network that blocks
     outbound 53 — a locked-down container, some corporate egress — breaks the
     first and leaves the second working, so an MX error is not the end of the
     question. Only when neither can answer does this fall open. */
  let mxErr = null;
  try {
    const mx = await Promise.race([dns.resolveMx(key), guard]);
    if (mx === 'timeout') return { ok: true, reason: 'dns-timeout' };
    if (Array.isArray(mx) && mx.some((r) => r && r.exchange)) {
      return { ok: remember(true), reason: 'mx' };
    }
  } catch (err) {
    mxErr = err;   // ENODATA = exists but no MX; anything else = could not ask
  }

  try {
    const a = await Promise.race([dns.lookup(key, { all: true }), guard]);
    if (a === 'timeout') return { ok: true, reason: 'dns-timeout' };
    if (Array.isArray(a) && a.length) return { ok: remember(true), reason: 'a-record' };
  } catch (err) {
    if (isDefinitive(err)) return { ok: remember(false), reason: `no-such-domain:${err.code}` };
    return { ok: true, reason: `dns-error:${err?.code || 'unknown'}` };
  }

  /* Nothing found. If the MX attempt never actually reached a nameserver, we
     have not established absence — only that we could not look. Let it pass. */
  if (mxErr && !isDefinitive(mxErr)) {
    return { ok: true, reason: `dns-error:${mxErr.code || 'unknown'}` };
  }
  return { ok: remember(false), reason: 'no-mx' };
}

/* Only these mean the answer is settled. Everything else — SERVFAIL, refused,
   timeout, connection reset — is the resolver having a bad day, not a verdict
   on the address. */
const DEFINITIVE = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);
const isDefinitive = (err) => DEFINITIVE.has(err?.code);

export const RULES = { DOMAIN_TYPOS, DISPOSABLE, PROVIDERS };
