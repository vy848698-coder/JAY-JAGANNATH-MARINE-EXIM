/* Enquiry form → dashboard.
   Posts to this site's own /api/enquiry function, which adds the intake key
   server-side and forwards to the dashboard's public intake route. The reply
   carries the real reference number, so the receipt below the form is now the
   dashboard's record rather than a generated placeholder.

   Shared by the form on the home page and the one on the calculator page —
   the markup of both is identical. */
(function () {
  const form = document.getElementById('form');
  const rc = document.getElementById('rcpt');
  if (!form || !rc) return;

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

  const stamp = () =>
    new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) + ' IST';

  const summary = () =>
    `${val('e')} · ${val('f2')} · ${val('g') || '—'} MT · ${val('h') || 'port to advise'} · ${val('i')}`;

  function setBusy(state) {
    busy = state;
    if (!btn) return;
    btn.disabled = state;
    btn.textContent = state ? 'Sending…' : btnLabel;
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

    setBusy(true);
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: val('a'),
          contactPerson: val('b'),
          email: val('c'),
          country: val('d'),
          product: val('e'),
          packing: val('f2'),
          quantityMt: val('g'),
          dischargePort: val('h'),
          incoterm: val('i'),
          notes: val('k'),
          website: val('hp'),   // honeypot — a real visitor never fills this
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        receipt('Not Sent', '', 'Please Try Again',
          data.error || 'The enquiry could not be sent. Please email jayjagannathmarineexim@gmail.com.');
        return;
      }

      const line = summary();
      receipt('Enquiry Received', stamp(), data.reference || '—', line);
      form.reset();
    } catch {
      // offline, DNS, blocked request — the address is the reliable fallback
      receipt('Not Sent', '', 'Connection Failed',
        'We could not reach the enquiry desk. Please check your connection, or email jayjagannathmarineexim@gmail.com.');
    } finally {
      setBusy(false);
    }
  });
})();
