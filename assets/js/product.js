/* Product page — the shared scroll engine only. The homepage extras
   (ash canvas, calculator, drawer, enquiry form) are not on this page,
   so none of that is loaded here. */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══ REVEAL ══ */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12, rootMargin: '0px 0px -8% 0px' });

function observeAll() {
  document.querySelectorAll('.rv:not(.in),.rule:not(.in)').forEach(el => io.observe(el));
  document.querySelectorAll('[data-stagger]').forEach(g => {
    [...g.children].forEach((c, i) => { if (!c.style.transitionDelay) c.style.transitionDelay = (i * 0.09) + 's'; });
  });
}
observeAll();

/* ══ MOBILE DRAWER ══ */
const burger = document.getElementById('burger'), drawer = document.getElementById('drawer');
burger.addEventListener('click', () => {
  const o = drawer.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(o));
  burger.textContent = o ? 'Close' : 'Menu';
});
drawer.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    drawer.classList.remove('open');
    burger.textContent = 'Menu';
    burger.setAttribute('aria-expanded', 'false');
  }
});

/* ══ SCROLL ENGINE: progress, header, parallax, back-to-top ══ */
const prog = document.getElementById('prog'),
      hdr = document.querySelector('.hdr'),
      topBtn = document.getElementById('top-btn'),
      heroImg = document.querySelector('.phero-ph img'),
      introImg = document.querySelector('.pintro-ph img');
let sTick = false;

function onScroll() {
  const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
  prog.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  hdr.classList.toggle('sm', y > 50);
  topBtn.classList.toggle('on', y > 700);
  if (RM) return;
  if (heroImg) heroImg.style.transform = `translateY(${Math.min(y, 600) * -0.06}px)`;
  if (introImg) {
    const r = introImg.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      introImg.style.transform = `translateY(${(r.top - innerHeight / 2) * -0.035}px)`;
    }
  }
}
addEventListener('scroll', () => {
  if (sTick) return;
  sTick = true;
  requestAnimationFrame(() => { onScroll(); sTick = false; });
}, { passive: true });
addEventListener('resize', onScroll);
onScroll();

topBtn.addEventListener('click', () => scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }));

/* ══ ANCHOR SCROLLING THAT CLEARS THE STICKY HEADER ══ */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); if (id === '#' || id.length < 2) return;
  const el = document.querySelector(id); if (!el) return;
  e.preventDefault();
  const top = el.getBoundingClientRect().top + scrollY - (hdr.offsetHeight + 12);
  scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
});
