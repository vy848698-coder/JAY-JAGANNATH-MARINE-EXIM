/* Quality page. Loads after product.js (reveal, nav, progress, back-to-top).
   Certificate lightbox, carrying the fixes made to the homepage version:
   real scroll lock, focus move and restore, and dismissal only from the
   backdrop or the close button. IIFE to avoid colliding with product.js. */
(function () {
  const lb = document.getElementById('lb');
  const certs = document.getElementById('certs');
  if (!lb || !certs) return;

  let lastFocus = null;

  function lockScroll() {
    const sb = innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sb > 0) document.body.style.paddingRight = sb + 'px';
  }
  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  function openLb(card) {
    const src = card.querySelector('img');
    const img = lb.querySelector('img');
    img.src = src.src;
    img.alt = src.alt || 'Certificate';
    lastFocus = document.activeElement;
    lb.classList.add('on');
    lockScroll();
    lb.querySelector('button').focus();
  }
  function closeLb() {
    if (!lb.classList.contains('on')) return;
    lb.classList.remove('on');
    unlockScroll();
    if (lastFocus) lastFocus.focus();
  }

  certs.addEventListener('click', e => {
    const c = e.target.closest('.qcert');
    if (c) openLb(c);
  });
  certs.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.qcert');
    if (c) { e.preventDefault(); openLb(c); }
  });

  /* backdrop and close button only — clicking the certificate itself
     should not dismiss the view you just opened */
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.closest('button')) closeLb();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

  /* keep focus inside the dialog while it is open */
  lb.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); lb.querySelector('button').focus(); }
  });
})();
