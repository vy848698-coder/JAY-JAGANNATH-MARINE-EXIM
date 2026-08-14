/* Network page. Loads after product.js (reveal, nav, progress, back-to-top).
   Builds the trade-lane map from real coordinates so a new market is one
   line of data, not hand-drawn SVG. IIFE to avoid colliding with product.js. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* Origin: Paradip, the port 82 km from our Cuttack office. */
  const HOME = { lon: 86.6, lat: 20.3 };

  /* Destinations, positioned by the lon/lat of the receiving port or capital.
     `lab` places the text: a=anchor, dx/dy=offset from the marker. */
  const MARKETS = [
    { n: 'Nepal',      lon: 85.3, lat: 27.7, note: '48% of shipments', lab: { a: 'end',   dx: -14, dy: -6 } },
    { n: 'Bhutan',     lon: 89.6, lat: 27.5, note: '27% of shipments', lab: { a: 'start', dx: 14,  dy: -6 } },
    { n: 'Bangladesh', lon: 91.8, lat: 22.3, note: '23% of shipments', lab: { a: 'start', dx: 16,  dy: 5 } },
    { n: 'Sri Lanka',  lon: 79.9, lat: 6.9,  note: 'Colombo',          lab: { a: 'end',   dx: -14, dy: 5 } },
    { n: 'Maldives',   lon: 73.5, lat: 4.2,  note: 'Malé',             lab: { a: 'end',   dx: -14, dy: 16 } },
    { n: 'Gulf',       lon: 55.8, lat: 24.7, note: 'UAE · Oman',       lab: { a: 'middle', dx: 0,  dy: -16 } },
    { n: 'Saudi Arabia', lon: 39.2, lat: 21.5, note: 'Jeddah',         lab: { a: 'middle', dx: 0,  dy: -16 } },
    { n: 'Tanzania',   lon: 39.3, lat: -6.8, note: 'Dar es Salaam',    lab: { a: 'middle', dx: 0,  dy: 24 } },
    { n: 'Australia',  lon: 115.7, lat: -32.1, note: 'Fremantle',      lab: { a: 'start', dx: 14,  dy: 5 } }
  ];

  /* Equirectangular projection, cropped to the trading window. */
  const W = 1000, H = 560;
  const LON0 = 22, LON1 = 152, LAT0 = 42, LAT1 = -42;
  const px = lon => ((lon - LON0) / (LON1 - LON0)) * W;
  const py = lat => ((LAT0 - lat) / (LAT0 - LAT1)) * H;

  const svg = document.getElementById('nmap-svg');
  if (!svg) return;
  const el = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };

  /* ── graticule ── */
  const grid = el('g', { class: 'nm-grid' });
  for (let lon = LON0; lon <= LON1; lon += 13) grid.appendChild(el('line', { x1: px(lon), y1: 0, x2: px(lon), y2: H }));
  for (let lat = LAT0; lat >= LAT1; lat -= 14) grid.appendChild(el('line', { x1: 0, y1: py(lat), x2: W, y2: py(lat) }));
  svg.appendChild(grid);

  const hx = px(HOME.lon), hy = py(HOME.lat);
  const arcs = el('g'), nodes = el('g'), labs = el('g');

  MARKETS.forEach((m, i) => {
    const x = px(m.lon), y = py(m.lat);

    /* quadratic curve, bowed perpendicular to the lane so lanes fan out
       rather than overlapping — short hops bow less than long ones */
    const dx = x - hx, dy = y - hy;
    const dist = Math.hypot(dx, dy);
    const bow = Math.min(dist * 0.22, 90);
    const cx = (hx + x) / 2 + (-dy / dist) * bow;
    const cy = (hy + y) / 2 + (dx / dist) * bow;
    const d = `M${hx.toFixed(1)},${hy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;

    const path = el('path', { class: 'nm-arc', d: d, id: 'lane-' + i });
    arcs.appendChild(path);

    nodes.appendChild(el('circle', { class: 'nm-node', cx: x, cy: y, r: 6, 'data-i': i }));

    const t = el('text', {
      class: 'nm-lab', x: x + m.lab.dx, y: y + m.lab.dy,
      'text-anchor': m.lab.a, 'data-i': i
    });
    t.textContent = m.n;
    labs.appendChild(t);

    const s = el('text', {
      class: 'nm-share', x: x + m.lab.dx, y: y + m.lab.dy + 15, 'text-anchor': m.lab.a
    });
    s.textContent = m.note;
    labs.appendChild(s);
  });

  svg.appendChild(arcs);
  svg.appendChild(nodes);

  /* ── origin marker ── */
  const home = el('g');
  if (!RM) {
    for (let k = 0; k < 2; k++) {
      const ring = el('circle', { class: 'nm-ring', cx: hx, cy: hy, r: 9 });
      ring.style.animation = `nmRing 3s ${k * 1.5}s var(--ease) infinite`;
      home.appendChild(ring);
    }
  }
  home.appendChild(el('circle', { class: 'nm-home', cx: hx, cy: hy, r: 7 }));
  const hl = el('text', { class: 'nm-home-lab', x: hx - 16, y: hy + 30, 'text-anchor': 'end' });
  hl.textContent = 'INDIA';
  const hs = el('text', { class: 'nm-home-sub', x: hx - 16, y: hy + 46, 'text-anchor': 'end' });
  hs.textContent = 'CUTTACK · PARADIP';
  home.appendChild(hl); home.appendChild(hs);
  svg.appendChild(home);
  svg.appendChild(labs);

  /* ── cargo pulses travelling the lanes ── */
  if (!RM) {
    const pulses = el('g');
    MARKETS.forEach((m, i) => {
      const c = el('circle', { class: 'nm-pulse', r: 3, opacity: 0 });
      const mo = el('animateMotion', { dur: (5 + (i % 4)) + 's', begin: (i * 0.6) + 's', repeatCount: 'indefinite', rotate: 'auto' });
      const mp = el('mpath', { href: '#lane-' + i });
      /* Safari still wants the xlink form */
      mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#lane-' + i);
      mo.appendChild(mp);
      const fade = el('animate', {
        attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.1;0.85;1',
        dur: (5 + (i % 4)) + 's', begin: (i * 0.6) + 's', repeatCount: 'indefinite'
      });
      c.appendChild(mo); c.appendChild(fade);
      pulses.appendChild(c);
    });
    svg.appendChild(pulses);
  }

  /* ── stagger the draw, each lane a beat after the last ── */
  const box = document.getElementById('nmap');
  svg.querySelectorAll('.nm-arc').forEach((p, i) => {
    const len = p.getTotalLength();
    p.style.setProperty('--len', len.toFixed(0));
    p.style.transitionDelay = (i * 0.13) + 's';
  });
  svg.querySelectorAll('.nm-node').forEach((n, i) => { n.style.transitionDelay = (0.5 + i * 0.13) + 's'; });
  svg.querySelectorAll('.nm-lab').forEach((n, i) => { n.style.transitionDelay = (0.7 + i * 0.13) + 's'; });

  new IntersectionObserver((es, ob) => es.forEach(e => {
    if (e.isIntersecting) { box.classList.add('in'); ob.disconnect(); }
  }), { threshold: .25 }).observe(box);

  /* ── legend rows highlight their lane ── */
  const leg = document.getElementById('nmap-leg');
  if (leg) {
    let lit = null;   // the row currently traced by tap, on touch devices
    leg.querySelectorAll('li').forEach(li => {
      const i = li.dataset.i;
      const on = state => {
        svg.querySelector('#lane-' + i).classList.toggle('hot', state);
        svg.querySelector(`.nm-node[data-i="${i}"]`).classList.toggle('hot', state);
        svg.querySelector(`.nm-lab[data-i="${i}"]`).classList.toggle('hot', state);
      };
      li.addEventListener('mouseenter', () => on(true));
      li.addEventListener('mouseleave', () => on(false));
      /* a phone has no hover, so the lane tracing was unreachable there —
         tap a row to trace it, tap it again to clear */
      li.addEventListener('click', () => {
        if (matchMedia('(hover:hover)').matches) return;
        if (lit && lit !== on) lit(false);
        const next = lit !== on;
        on(next);
        lit = next ? on : null;
      });
    });
  }

  /* ── share bars fill when they arrive ── */
  const share = document.querySelector('.share');
  if (share) {
    new IntersectionObserver((es, ob) => es.forEach(e => {
      if (e.isIntersecting) { share.classList.add('in'); ob.disconnect(); }
    }), { threshold: .4 }).observe(share);
  }
})();
