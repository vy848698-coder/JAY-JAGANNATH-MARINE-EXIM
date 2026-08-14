/* Logistics page extras. Loads after product.js, which already provides
   reveal, nav, progress bar and back-to-top. IIFE so nothing collides with
   the const declarations in that file. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══ INCOTERM SELECTOR ══ */
  const inco = document.getElementById('inco');
  if (inco) {
    const tabs = [...inco.querySelectorAll('[role="tab"]')];

    function select(tab) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.classList.toggle('on', on);
        panel.hidden = !on;
      });
    }

    tabs.forEach(t => t.addEventListener('click', () => select(t)));

    /* left/right arrows move between terms, as expected of a tablist */
    inco.querySelector('[role="tablist"]').addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      tabs[n].focus();
      select(tabs[n]);
    });
  }

  /* ══ ROUTE TRACK: the line draws across as the four stages arrive ══ */
  const route = document.getElementById('route');
  if (!route) return;
  const fillEl = route.querySelector('.route-track span');
  if (RM) { fillEl.style.setProperty('--fill', '100%'); return; }

  let tick = false;
  function fillRoute() {
    const r = route.getBoundingClientRect();
    /* runs from the track entering the lower third to it clearing the middle */
    const start = innerHeight * 0.82, end = innerHeight * 0.42;
    const p = (start - r.top) / Math.max(start - end, 1);
    fillEl.style.setProperty('--fill', (Math.min(Math.max(p, 0), 1) * 100) + '%');
  }
  addEventListener('scroll', () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => { fillRoute(); tick = false; });
  }, { passive: true });
  addEventListener('resize', fillRoute);
  fillRoute();
})();
