/* Header "Capabilities" dropdown. Loads before the per-page scripts on every
   page, and is deliberately standalone: home.html runs main.js while the rest
   run product.js, so anything shared by both has to sit in its own file rather
   than be written twice and drift.

   Pointer and keyboard are handled separately on purpose. Hover opens it on a
   real mouse, but hover is a lie on touch — there the first tap would open and
   the same tap would follow the link — so the trigger is a <button> that
   toggles on click, and hover is only bound where the pointer is fine. */
(function () {
  const dd = document.querySelector('.ndd');
  if (!dd) return;
  const btn = dd.querySelector('.ndd-t');
  const panel = dd.querySelector('.ndd-p');
  if (!btn || !panel) return;

  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  let closeTimer;

  function open() {
    clearTimeout(closeTimer);
    dd.classList.add('on');
    btn.setAttribute('aria-expanded', 'true');
  }
  function close() {
    clearTimeout(closeTimer);
    dd.classList.remove('on');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', () => {
    dd.classList.contains('on') ? close() : open();
  });

  /* a short grace period on leaving: the gap between the trigger and the panel
     is real, and snapping shut mid-travel makes the menu feel brittle */
  dd.addEventListener('mouseenter', () => { if (fine.matches) open(); });
  dd.addEventListener('mouseleave', () => { if (fine.matches) closeTimer = setTimeout(close, 160); });

  /* tabbing out of the group closes it, tabbing within does not */
  dd.addEventListener('focusout', e => {
    if (!dd.contains(e.relatedTarget)) close();
  });

  document.addEventListener('click', e => { if (!dd.contains(e.target)) close(); });

  addEventListener('keydown', e => {
    if (e.key === 'Escape' && dd.classList.contains('on')) { close(); btn.focus(); }
  });

  /* arrow keys walk the panel, so it is operable without a mouse */
  dd.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...panel.querySelectorAll('a')];
    if (!items.length) return;
    e.preventDefault();
    open();
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown'
      ? (i + 1) % items.length
      : (i <= 0 ? items.length - 1 : i - 1);
    items[next].focus();
  });
})();
