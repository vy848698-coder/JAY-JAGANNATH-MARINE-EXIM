/* Email address checking for the enquiry form.

   What this can and cannot do, stated plainly because it decides the design:

   Nothing here proves a mailbox exists. "xkjhsdf@gmail.com" is a perfectly
   well-formed address on a real, mail-accepting domain; the only way to know
   whether anyone reads it is to send mail there and wait for the visitor to
   click something. So this file does not try to guess. It rejects what is
   provably wrong, corrects what is obviously mistyped, and lets the rest
   through — and the function in api/ then asks DNS whether the domain can
   receive mail at all, which is the last check that can be made without
   involving the visitor.

   The same rules exist in api/_email-check.js for the server side. Client
   checks are a courtesy — they give an answer without a round trip — but a
   form is only really protected by the copy the browser cannot reach.
   tools/email-rules-sync.mjs asserts the two tables stay identical.

   Exposes window.EmailCheck.check(address) →
     { ok:true,  email }                      normalised, safe to send
     { ok:false, code, message, suggestion? } suggestion is a corrected address
*/
(function (root) {
  'use strict';

  /* Domains people reach for and mistype. Value is what they meant. Ordered
     by how often it actually turns up in a B2B enquiry inbox: the Gmail
     misses dominate, and ".con" beats every other TLD slip because n sits
     next to m. */
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

  /* Throwaway inboxes. An enquiry is answered with a quotation and a test
     certificate; an address that expires in ten minutes cannot receive one. */
  const DISPOSABLE = [
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
    'tempmail.com', 'temp-mail.org', 'throwawaymail.com', '10minutemail.com',
    '10minutemail.net', 'yopmail.com', 'trashmail.com', 'getnada.com',
    'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mailnesia.com',
    'mohmal.com', 'moakt.com', 'emailondeck.com', 'spamgourmet.com',
    'tempinbox.com', 'mytemp.email', 'discard.email', 'grr.la', 'spam4.me',
  ];

  /* The big providers publish their own username rules, and they are much
     tighter than the RFC. Applying them is what turns "any letters at all
     @gmail.com" into a real check: Gmail will not issue a1@gmail.com or
     a_b@gmail.com, so an address in that shape cannot be anyone's. */
  const PROVIDERS = {
    'gmail.com':      { min: 6, max: 30, chars: /^[a-z0-9.]+$/, label: 'Gmail' },
    'googlemail.com': { min: 6, max: 30, chars: /^[a-z0-9.]+$/, label: 'Gmail' },
    'yahoo.com':      { min: 4, max: 32, chars: /^[a-z][a-z0-9._]*$/, label: 'Yahoo' },
    'yahoo.co.in':    { min: 4, max: 32, chars: /^[a-z][a-z0-9._]*$/, label: 'Yahoo' },
    'outlook.com':    { min: 1, max: 64, chars: /^[a-z][a-z0-9._-]*$/, label: 'Outlook' },
    'hotmail.com':    { min: 1, max: 64, chars: /^[a-z][a-z0-9._-]*$/, label: 'Outlook' },
    'live.com':       { min: 1, max: 64, chars: /^[a-z][a-z0-9._-]*$/, label: 'Outlook' },
  };

  /* Local part per RFC 5322's dot-atom form — the quoted form ("a b"@x.com)
     is legal and never once typed into a web form on purpose, so it is out. */
  const LOCAL_ATOM = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
  const LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

  function check(raw) {
    const email = String(raw == null ? '' : raw).trim();

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

    /* ── local part ── */
    if (local.length > 64) return bad('syntax', 'The part before the @ is too long to be real.');
    if (local.startsWith('.') || local.endsWith('.')) {
      return bad('syntax', 'The part before the @ cannot start or end with a dot.');
    }
    if (local.includes('..')) return bad('syntax', 'The part before the @ has two dots in a row.');
    if (!LOCAL_ATOM.test(local)) {
      return bad('syntax', 'The part before the @ contains a character an email address cannot carry.');
    }

    /* ── domain shape ── */
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

    /* ── top level ──
       Letters only and at least two of them. No hardcoded list of valid
       endings: that list changes, and a stale copy would turn a real customer
       on a new TLD away at the door. Whether the ending actually exists is
       settled on the server by asking DNS, which is never out of date. */
    const tld = labels[labels.length - 1];
    if (tld.length < 2) return bad('tld', 'The ending of that domain is too short — .com, .in, .ae and so on.');
    if (!/^[a-z]+$/.test(tld)) {
      return bad('tld', 'The ending of that domain should be letters only — .com, .in, .ae and so on.');
    }

    /* ── known mistypings, offered as a correction rather than a refusal ── */
    if (Object.prototype.hasOwnProperty.call(DOMAIN_TYPOS, domain)) {
      const fixed = local + '@' + DOMAIN_TYPOS[domain];
      return {
        ok: false, code: 'typo', suggestion: fixed,
        message: 'Did you mean ' + fixed + '?',
      };
    }

    /* ── throwaway inboxes ── */
    const root2 = labels.slice(-2).join('.');
    if (DISPOSABLE.indexOf(domain) !== -1 || DISPOSABLE.indexOf(root2) !== -1) {
      return bad('disposable',
        'That is a temporary inbox. The quotation and test certificate need an address you will still hold next week.');
    }

    /* ── provider username rules ── */
    const rule = PROVIDERS[domain];
    if (rule) {
      /* +tagging is real addressing, not part of the username being checked */
      const base = local.split('+')[0].toLowerCase();
      const bare = base.replace(/\./g, '');
      if (!base || !rule.chars.test(base) || base.startsWith('.') || base.endsWith('.')) {
        return bad('provider', 'That is not a valid ' + rule.label + ' address — check the part before the @.');
      }
      if (bare.length < rule.min || bare.length > rule.max) {
        return bad('provider',
          rule.label + ' addresses are ' + rule.min + ' to ' + rule.max +
          ' characters before the @. Please check yours.');
      }
    }

    return { ok: true, email: local + '@' + domain };
  }

  function bad(code, message) { return { ok: false, code: code, message: message }; }

  root.EmailCheck = { check: check, DOMAIN_TYPOS: DOMAIN_TYPOS, DISPOSABLE: DISPOSABLE, PROVIDERS: PROVIDERS };
})(typeof window !== 'undefined' ? window : globalThis);
