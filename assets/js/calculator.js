/* Calculator page. Loads after product.js (reveal, nav, progress, back-to-top).
   IIFE so nothing collides with the const declarations in that file. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const fmt = n => n.toLocaleString('en-IN');

  /* Container specs. Volume is the internal cube; payload is the rated
     maximum. Sources: standard ISO dry container specifications. */
  const BOX = {
    20: { vol: 33, payload: 28.2, label: "20′" },
    40: { vol: 67, payload: 26.7, label: "40′" }
  };
  /* Voids between bags mean you never fill the full cube. Jumbo bags stow
     tighter than palletised 50 kg bags. */
  const STOW = { 50: 0.85, 1000: 0.90, 1500: 0.90 };

  const opts = $('opts'), ctr = $('ctr'), qty = $('qty'), dens = $('dens'),
        rows = $('calcRows'), ctrGroup = $('ctrGroup'), cap = $('cap');
  let bagKg = 50, box = 20;

  /* rewrite a row set, flashing any value that actually changed */
  const prev = {};
  function render(list) {
    rows.innerHTML = list.map(([k, v]) =>
      `<div><dt>${k}</dt><dd data-k="${k}">${v}</dd></div>`).join('');
    rows.querySelectorAll('dd').forEach(dd => {
      const k = dd.dataset.k;
      if (!RM && prev[k] !== undefined && prev[k] !== dd.textContent) dd.classList.add('bump');
      prev[k] = dd.textContent;
    });
  }

  function calc() {
    const mt = +qty.value, d = +dens.value;
    $('qLab').textContent = fmt(mt);
    $('dLab').textContent = fmt(d);

    const bulk = bagKg === 0;
    ctrGroup.hidden = bulk;
    cap.hidden = bulk;

    if (bulk) {
      render([
        ['Loading Mode', 'Loose bulk'],
        ['Discharge', 'Pneumatic'],
        ['Total Weight', fmt(mt) + ' MT'],
        ['Packaging', 'None']
      ]);
      return;
    }

    const b = BOX[box];
    const stow = STOW[bagKg];
    /* the two ceilings, in MT per container */
    const byVolume = (b.vol * stow * d) / 1000;
    const byWeight = b.payload;
    const perBox = Math.min(byVolume, byWeight);
    const volumeLimited = byVolume < byWeight;

    const bags = Math.ceil(mt * 1000 / bagKg);
    const boxes = Math.ceil(mt / perBox);
    const bagsPerBox = Math.floor(perBox * 1000 / bagKg);

    render([
      ['Bags Required', fmt(bags)],
      ['Bag Size', bagKg >= 1000 ? (bagKg / 1000) + ' MT jumbo' : bagKg + ' kg'],
      ['Total Weight', fmt(mt) + ' MT'],
      [b.label + ' Containers', '≈ ' + fmt(boxes)],
      ['Bags per Container', fmt(bagsPerBox)]
    ]);

    /* the verdict block */
    const tag = $('capTag');
    tag.textContent = volumeLimited ? 'Volume limited' : 'Weight limited';
    tag.className = 'cap-tag ' + (volumeLimited ? 'volume' : 'weight');
    $('capA').textContent = perBox.toFixed(1) + ' MT usable';
    $('capB').textContent = b.payload.toFixed(1) + ' MT rated';
    $('capBar').style.width = Math.min(perBox / b.payload, 1) * 100 + '%';
    $('capNote').textContent = volumeLimited
      ? `At ${fmt(d)} kg/m³ the ${b.label} fills to ${b.vol} m³ before it reaches its ${b.payload} MT rating — you are paying to ship air. Denser packing or loose bulk buys more tonnes per box.`
      : `At ${fmt(d)} kg/m³ the ${b.label} reaches its ${b.payload} MT rating with space to spare, so weight is the binding limit.`;
  }

  opts.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b) return;
    opts.querySelectorAll('.opt').forEach(o => o.classList.remove('on'));
    b.classList.add('on'); bagKg = +b.dataset.kg; calc();
  });
  ctr.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b) return;
    ctr.querySelectorAll('.opt').forEach(o => o.classList.remove('on'));
    b.classList.add('on'); box = +b.dataset.c; calc();
  });
  qty.addEventListener('input', calc);
  dens.addEventListener('input', calc);
  calc();

  /* ══ CARRY THE FIGURES INTO THE ENQUIRY FORM ══ */
  $('calcCta').addEventListener('click', () => {
    $('g').value = qty.value;
    const packMap = { 50: '50 kg Bag', 1000: '1000 kg Jumbo Bag', 1500: '1500 kg Jumbo Bag', 0: 'Bulker' };
    const sel = $('f2');
    [...sel.options].forEach(o => { if (o.text === packMap[bagKg]) sel.value = o.value; });
    if (bagKg !== 0) {
      const note = $('k');
      const line = `Calculator: ${fmt(+qty.value)} MT, ${packMap[bagKg]}, ${BOX[box].label} container, assumed bulk density ${fmt(+dens.value)} kg/m³.`;
      note.value = note.value ? note.value.replace(/^Calculator:.*(\n|$)/, '') + line : line;
    }
    $('enquiry').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  });

  /* the enquiry form is wired to the dashboard in assets/js/enquiry.js */
})();
