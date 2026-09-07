/* Enquiry form → enquiry desk.

   Two back ends exist and the page uses whichever is actually present:

     api/enquiry.php  Apache/PHP hosting — mails the enquiry over Gmail SMTP
     /api/enquiry     Vercel function — relays it to the dashboard

   The PHP endpoint is tried first and the function is the fallback, so the
   same build works on XAMPP, on shared hosting and on Vercel with nothing to
   switch over. Either way the reply carries the real reference number, so the
   receipt below the form is a record rather than a generated placeholder.

   Shared by the form on the home page and the one on the calculator page —
   the markup of both is identical. */
(function () {
  const form = document.getElementById('form');
  const rc = document.getElementById('rcpt');
  if (!form || !rc) return;

  /* Built from this script's own URL rather than location, so the endpoint
     resolves the same from /home.html, /calculator.html and from a site
     installed in a subfolder (htdocs/Jay Jagannath Marine Exim/…). */
  const ROOT = new URL('../../', document.currentScript.src);
  const ENDPOINTS = [new URL('api/enquiry.php', ROOT).href, new URL('api/enquiry', ROOT).href];

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (id) => document.getElementById(id);
  const val = (id) => (el(id)?.value || '').trim();

  const btn = form.querySelector('button[type=submit]');
  const btnLabel = btn ? btn.textContent : '';
  let busy = false;

  /* The receipt block doubles as the error panel — heading, timestamp,
     headline and detail line are all rewritten per outcome. */
  function receipt(heading, stamp, headline, detail) {
    el('rH').textContent = heading;
    el('rT').textContent = stamp;
    el('rR').textContent = headline;
    el('rL').textContent = detail;
    rc.classList.add('on');
    rc.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
  }

  /* Product and Packing can now be left on "Select", so both need the same
     fallback the discharge port already had — without one the receipt opened
     on two empty segments and a stray separator. */
  const summary = () =>
    `${val('e') || 'product to advise'} · ${val('f2') || 'packing to advise'} · ` +
    `${val('g') || '—'} MT · ${val('h') || 'port to advise'} · ${val('i')}`;

  /* Used only when the back end sends no timestamp of its own. Pinned to
     Asia/Kolkata so a buyer in Rotterdam still reads the desk's own clock,
     which is what the IST suffix claims. */
  const stamp = () =>
    new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) + ' IST';

  function setBusy(state) {
    busy = state;
    if (!btn) return;
    btn.disabled = state;
    btn.textContent = state ? 'Sending…' : btnLabel;
  }

  /* Statuses that mean "this back end is not installed here" rather than
     "your enquiry was refused" — try the next one instead of reporting them.

     404 is the obvious one, but Vercel answers 403 for any /api/* path with no
     function behind it, and a host with the PHP path blocked or PHP disabled
     can produce 403 or 405 too. Anything else — including a 500 or the 502
     the PHP endpoint returns when Gmail is unreachable — is a real answer from
     a back end that does exist, and must reach the visitor. */
  const NOT_INSTALLED = [403, 404, 405, 501];

  async function post(payload) {
    let lastError;
    for (const url of ENDPOINTS) {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        lastError = err;
        continue;
      }
      if (NOT_INSTALLED.includes(res.status)) continue;
      return res;
    }
    throw lastError || new Error('No enquiry endpoint responded.');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!val('a') || !val('c')) {
      receipt('Action Required', '', 'Incomplete',
        'Please add your company and email so the quotation can be issued.');
      (val('a') ? el('c') : el('a'))?.focus();
      return;
    }
    /* The form carries novalidate, so the browser's own email check never
       runs. email-check.js applies the real rules — syntax, the endings and
       usernames the big providers will not issue, throwaway inboxes — and
       offers a correction when the domain is a known mistyping. The same
       rules run again in api/enquiry.js, which is the copy that decides.

       If the script is missing for any reason, fall back to the shape check
       rather than letting everything through. */
    const verdict = window.EmailCheck
      ? window.EmailCheck.check(val('c'))
      : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('c'))
          ? { ok: true, email: val('c') }
          : { ok: false, message: 'That email address does not look right. Please check it.' });

    if (!verdict.ok) {
      /* A known typo is a correction, not a refusal: put the fix in the field
         so the visitor confirms it with the same button rather than hunting
         for the character that is wrong. */
      if (verdict.suggestion && el('c')) {
        el('c').value = verdict.suggestion;
        receipt('Action Required', '', 'Check Email',
          verdict.message + ' We have put that in the field — send again to confirm, or edit it.');
      } else {
        receipt('Action Required', '', 'Check Email', verdict.message);
      }
      el('c')?.focus();
      el('c')?.select?.();
      return;
    }

    setBusy(true);
    try {
      const res = await post({
        company: val('a'),
        contactPerson: val('b'),
        email: verdict.email,
        country: val('d'),
        product: val('e'),
        packing: val('f2'),
        quantityMt: val('g'),
        dischargePort: val('h'),
        incoterm: val('i'),
        notes: val('k'),
        website: val('hp'),   // honeypot — a real visitor never fills this
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        receipt('Not Sent', '', 'Please Try Again',
          data.error || 'The enquiry could not be sent. Please email info@jjmeexporthouse.com.');
        return;
      }

      const line = summary();
      receipt('Enquiry Received', data.receivedAt || stamp(), data.reference || '—', line);
      form.reset();
    } catch {
      // offline, DNS, blocked request — the address is the reliable fallback
      receipt('Not Sent', '', 'Connection Failed',
        'We could not reach the enquiry desk. Please check your connection, or email info@jjmeexporthouse.com.');
    } finally {
      setBusy(false);
    }
  });
})();
