/* Classification page extras. Loads after product.js, which already provides
   reveal, nav, progress bar and back-to-top. Wrapped in an IIFE so nothing
   here collides with the const declarations in that file. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══ COUNT-UP ON THE FINENESS FIGURES ══ */
  const ease = t => 1 - Math.pow(1 - t, 3);
  document.querySelectorAll('[data-count]').forEach(el => {
    new IntersectionObserver((es, ob) => es.forEach(e => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      const target = +el.dataset.count;
      if (RM) { el.textContent = target; return; }
      const t0 = performance.now();
      (function step(now) {
        const q = Math.min((now - t0) / 1400, 1);
        el.textContent = Math.round(target * ease(q));
        if (q < 1) requestAnimationFrame(step);
      })(t0);
    }), { threshold: .6 }).observe(el);
  });

  /* ══ PROCESS RAIL: the gold line tracks your scroll through the steps ══ */
  const rail = document.getElementById('rail');
  if (!rail) return;
  if (RM) { rail.style.setProperty('--fill', '100%'); return; }

  let tick = false;
  function fillRail() {
    const r = rail.getBoundingClientRect();
    /* 0 when the rail's top reaches 70% of the viewport, 1 once its
       bottom passes 30% - so the line completes as the last step lands */
    const start = innerHeight * 0.7, end = innerHeight * 0.3;
    const p = (start - r.top) / Math.max(r.height - (start - end), 1);
    rail.style.setProperty('--fill', (Math.min(Math.max(p, 0), 1) * 100) + '%');
  }
  addEventListener('scroll', () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => { fillRail(); tick = false; });
  }, { passive: true });
  addEventListener('resize', fillRail);
  fillRail();
})();
