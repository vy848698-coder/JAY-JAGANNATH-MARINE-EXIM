/* Fresh Produce tabs — shared by the product page and the homepage.

   Vegetables, fruits and marine are three panels of one section. The ids the
   rest of the site links to sit on the panels rather than the section, so a
   link arriving from another page can name the category that is currently
   hidden — openTab() therefore has to run before anything is measured or
   scrolled to. It is exposed on window because the anchor handlers in both
   main.js and product.js call it, and it is a no-op for every other anchor on
   the page, which is why those handlers can call it unconditionally.

   Lives in its own file rather than in each page script: one copy, and any
   page that drops the markup in gets the behaviour by adding the tag. */
(function () {
  const tabs = [...document.querySelectorAll('.ptab')];
  if (!tabs.length) return;                       // page has no produce section

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches,
        tablist = document.querySelector('.ptabs'),
        ink = document.querySelector('.ptab-ink'),
        hdr = document.querySelector('.hdr');

  const selected = () => tabs.find(t => t.getAttribute('aria-selected') === 'true');

  function moveInk(btn) {
    if (!ink || !btn) return;
    ink.style.width = btn.offsetWidth + 'px';
    ink.style.transform = `translateX(${btn.offsetLeft}px)`;
  }

  /* animate:false is for the first call, where the panel is only being put
     into the state the markup already shows. Re-arming the cards there would
     reveal them on load instead of leaving them to the scroll observer like
     every other section on the page. */
  function openTab(id, { animate = true, focus = false } = {}) {
    const btn = tabs.find(t => t.getAttribute('aria-controls') === id);
    if (!btn) return false;

    tabs.forEach(t => {
      const panel = document.getElementById(t.getAttribute('aria-controls')),
            on = t === btn;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (!panel) return;

      if (!on) { panel.hidden = true; return; }
      if (!animate) { panel.hidden = false; return; }

      /* strip the reveal, let the browser see the stripped state, then put it
         back — the cards run their stagger again rather than appearing already
         finished, which is what a second visit to a tab would otherwise give */
      const cards = panel.querySelectorAll('.rv');
      cards.forEach(c => c.classList.remove('in'));
      panel.hidden = false;
      void panel.offsetWidth;
      requestAnimationFrame(() => cards.forEach(c => c.classList.add('in')));
    });

    moveInk(btn);
    if (focus) btn.focus();
    return true;
  }
  window.openTab = openTab;

  tabs.forEach(t => t.addEventListener('click', () => {
    const id = t.getAttribute('aria-controls');
    const open = document.querySelector('.ppanel:not([hidden])');
    if (open && open.id !== id && !RM) {
      /* fade the outgoing panel out from under the incoming one */
      open.classList.add('is-out');
      setTimeout(() => { open.classList.remove('is-out'); openTab(id); }, 200);
    } else {
      openTab(id);
    }
    /* shareable without the jump that setting location.hash would cause */
    history.replaceState(null, '', '#' + id);
  }));

  tablist.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = e.key === 'ArrowRight' ? (i + 1) % tabs.length
            : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
            : e.key === 'Home' ? 0
            : e.key === 'End' ? tabs.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    openTab(tabs[n].getAttribute('aria-controls'), { focus: true });
  });

  addEventListener('resize', () => moveInk(selected()));
  /* the ink is measured from the label, so it has to be measured again once
     the webfont has replaced the fallback and the labels have changed width */
  if (document.fonts) document.fonts.ready.then(() => moveInk(selected()));

  const fromHash = location.hash.slice(1);
  openTab(fromHash || tabs[0].getAttribute('aria-controls'), { animate: false });

  /* a hidden panel cannot be scrolled to, so the landing scroll happens here
     rather than being left to the browser's own hash handling */
  const landing = fromHash && document.getElementById(fromHash);
  if (landing && landing.classList.contains('ppanel')) {
    requestAnimationFrame(() => scrollTo({
      top: landing.getBoundingClientRect().top + scrollY - ((hdr ? hdr.offsetHeight : 0) + 12),
      behavior: 'auto'
    }));
  }
})();
