const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* reveal — observeAll() is re-run after every JS injection */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12,rootMargin:'0px 0px -8% 0px'});
function observeAll(){
  document.querySelectorAll('.rv:not(.in),.rule:not(.in)').forEach(el=>io.observe(el));
  // auto-stagger direct children of any grid marked data-stagger
  document.querySelectorAll('[data-stagger]').forEach(g=>{
    [...g.children].forEach((c,i)=>{ if(!c.style.transitionDelay) c.style.transitionDelay=(i*0.09)+'s'; });
  });
}
observeAll();

/* mobile drawer */
const burger=document.getElementById('burger'),drawer=document.getElementById('drawer');
burger.addEventListener('click',()=>{const o=drawer.classList.toggle('open');burger.setAttribute('aria-expanded',String(o));burger.textContent=o?'Close':'Menu';});
drawer.addEventListener('click',e=>{if(e.target.tagName==='A'){drawer.classList.remove('open');burger.textContent='Menu';burger.setAttribute('aria-expanded','false');}});

/* ══ HERO: drifting ash particle field ══ */
const ash=document.getElementById('ash'),actx=ash.getContext('2d');
let aw=0,ah=0,motes=[];
function seedAsh(){
  const n=Math.round(Math.min(innerWidth,1600)/11);
  motes=Array.from({length:n},()=>({x:Math.random(),y:Math.random(),r:.5+Math.random()*2.1,
    sp:.06+Math.random()*.22,sw:.4+Math.random()*1.5,ph:Math.random()*6.28,g:Math.random()<.34}));
}
function sizeAsh(){
  const b=ash.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  aw=b.width;ah=b.height;if(!aw)return;
  ash.width=aw*d;ash.height=ah*d;actx.setTransform(d,0,0,d,0,0);
}
function drawAsh(t){
  if(!aw)return;
  actx.clearRect(0,0,aw,ah);
  for(const m of motes){
    m.y-=m.sp/ah*1.7; if(m.y<-.02){m.y=1.02;m.x=Math.random();}
    const x=m.x*aw+Math.sin(t/2200+m.ph)*m.sw*7, y=m.y*ah;
    actx.beginPath();actx.arc(x,y,m.r,0,6.283);
    actx.fillStyle=m.g?'rgba(212,175,55,.5)':'rgba(150,190,205,.34)';
    actx.fill();
  }
}
seedAsh();sizeAsh();
addEventListener('resize',()=>{seedAsh();sizeAsh();});
addEventListener('load',sizeAsh);
if(RM){drawAsh(0);} else (function ashLoop(t){drawAsh(t);requestAnimationFrame(ashLoop);})(0);

/* ══ HERO: kinetic product rotator ══ */
const kin=document.getElementById('kin');
if(kin&&!RM){
  const items=kin.querySelectorAll('b');
  let ki=0;
  setInterval(()=>{
    ki=(ki+1)%items.length;
    items.forEach(b=>b.style.transform=`translateY(-${ki*100}%)`);
  },2600);
}

/* product catalog */
const CAT=[
 {n:'Fly Ash — Class F',t:'Export · HSN 26219000',img:'assets/img/fly-ash.jpg',
  d:'A fine, grey amorphous powder rich in silica and alumina, spherical in shape. Pozzolanic and effective in sulphate-rich or coastal structural concrete.',
  s:{'Standard':'ASTM C618 / EN 450 S','Packing':'50 kg · Jumbo · Bulker','Market':'Export &amp; Domestic'}},
 {n:'Fly Ash — Class C',t:'Export · HSN 26219000',img:'assets/img/fly-ash-class-c.jpg',
  d:'Higher calcium ash from lignite or sub-bituminous coal, both pozzolanic and self-cementing. Suited to rapid construction and road base stabilisation.',
  s:{'Standard':'On request','Packing':'50 kg · Jumbo · Bulker','Market':'Export &amp; Domestic'}},
 {n:'Zinc Ash',t:'Export · Byproduct',img:'assets/img/zinc-ash.jpg',
  d:'Powdery byproduct formed on molten zinc during hot-dip galvanisation — metallic zinc particles, zinc oxide and trace impurities.',
  s:{'Feeds':'Zinc Sulphate · Fertiliser','Also':'Zinc Oxide Production','Market':'Export'}},
 {n:'Bottom Ash',t:'Domestic · Coarse Grade',img:'assets/img/bottom-ash.jpg',pos:'50% 38%',
  d:'The coarse, heavier fraction collected at the bottom of the boiler furnace. Higher in unburnt carbon, with no pozzolanic property — supplied as a separate grade.',
  s:{'Fraction':'Coarse','Pozzolanic':'No','Market':'Domestic'}},
 {n:'Pond Ash',t:'Domestic · Recovered',img:'assets/img/ash-pond-loading.jpg',pos:'66% center',
  d:'Fly ash and bottom ash carried as slurry to the ash dyke and recovered for bulk civil use.',
  s:{'Uses':'Landfill · Mine Fill · Roads','Handling':'Bulk','Market':'Domestic'}},
 {n:'Marine, Mineral &amp; Agri',t:'Domestic Trade',img:'assets/img/marine-mineral-agri.jpg',
  d:'Alongside ash, JJME trades minerals, ore, marine products, fruits and vegetables within the domestic market.',
  s:{'Categories':'Minerals · Ore','Also':'Marine · Fresh Produce','Market':'Domestic'}}
];
document.getElementById('cat').innerHTML=CAT.map((c,i)=>`
 <article class="card rv" data-i="${i}" tabindex="0" role="button" aria-label="View ${c.n} detail">
   <div class="card-ph"><img src="${c.img}" alt="${c.n}" loading="lazy"${c.pos?` style="object-position:${c.pos}"`:''}></div>
   <div class="card-bd">
     <span class="tagline">${c.t}</span>
     <h3>${c.n}</h3>
     <p>${c.d}</p>
     <dl>${Object.entries(c.s).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
     <span class="card-more">View Specification <i></i></span>
   </div>
 </article>`).join('');
observeAll();

/* ══ PRODUCT DRAWER ══ */
const USES={0:['Structural concrete','Coastal works','Cement blending'],1:['Road base','Rapid construction','RCC'],
 2:['Zinc sulphate','Zinc oxide','Metal recovery'],3:['Civil fill','Bulk supply'],4:['Landfill','Mine fill','Road laying'],
 5:['Minerals','Ore','Marine','Fresh produce']};
const scrim=document.getElementById('scrim'),drawEl=document.getElementById('draw');
let lastFocus=null;

/* shared scroll lock — reference counted so closing one overlay cannot
   unlock the page while another is still open. Pads out the scrollbar
   width so locking does not shift the layout sideways. */
let locks=0;
function lockScroll(){
  if(locks++) return;
  const sb=innerWidth-document.documentElement.clientWidth;
  document.body.style.overflow='hidden';
  if(sb>0) document.body.style.paddingRight=sb+'px';
}
function unlockScroll(){
  if(locks>0) locks--;
  if(locks) return;
  document.body.style.overflow='';
  document.body.style.paddingRight='';
}

function openDraw(i){
  const c=CAT[i]; lastFocus=document.activeElement;
  document.getElementById('dwImg').src=c.img;
  document.getElementById('dwImg').alt=c.n.replace(/&amp;/g,'&');
  document.getElementById('dwTag').textContent=c.t.replace(/&amp;/g,'&');
  document.getElementById('dwName').innerHTML=c.n;
  document.getElementById('dwDesc').textContent=c.d;
  document.getElementById('dwUses').innerHTML=(USES[i]||[]).map(u=>`<span>${u}</span>`).join('');
  document.getElementById('dwSpec').innerHTML=Object.entries(c.s).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  drawEl.dataset.i=i; scrim.classList.add('on'); drawEl.classList.add('on');
  drawEl.querySelector('.dw-bd').scrollTop=0;
  lockScroll(); drawEl.focus();
}
function closeDraw(){
  if(!drawEl.classList.contains('on')) return;
  scrim.classList.remove('on'); drawEl.classList.remove('on');
  unlockScroll(); if(lastFocus) lastFocus.focus();
}
document.getElementById('cat').addEventListener('click',e=>{
  const c=e.target.closest('.card'); if(c) openDraw(+c.dataset.i);
});
document.getElementById('cat').addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ') return;
  const c=e.target.closest('.card'); if(c){e.preventDefault();openDraw(+c.dataset.i);}
});
document.getElementById('dwX').addEventListener('click',closeDraw);
scrim.addEventListener('click',closeDraw);
addEventListener('keydown',e=>{if(e.key==='Escape'){closeLb();closeDraw();}});
document.getElementById('dwCta').addEventListener('click',()=>{
  const map=['Fly Ash — Class F','Fly Ash — Class C','Zinc Ash','Bottom Ash','Pond Ash','Other'];
  const sel=document.getElementById('e');
  [...sel.options].forEach(o=>{if(o.text===map[+drawEl.dataset.i]) sel.value=o.value;});
  closeDraw();
  setTimeout(()=>document.getElementById('enquiry').scrollIntoView({behavior:RM?'auto':'smooth'}),260);
});

/* ══ CERTIFICATE LIGHTBOX ══ */
const lb=document.getElementById('lb');
let lbLastFocus=null;
function closeLb(){
  if(!lb.classList.contains('on')) return;
  lb.classList.remove('on'); unlockScroll();
  if(lbLastFocus) lbLastFocus.focus();
}
document.querySelector('.certs').addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ') return;
  const c=e.target.closest('.cert'); if(c){e.preventDefault();openLb(c);}
});
document.querySelector('.certs').addEventListener('click',e=>{
  const c=e.target.closest('.cert'); if(c) openLb(c);
});
function openLb(c){
  const img=lb.querySelector('img'),src=c.querySelector('img');
  img.src=src.src; img.alt=src.alt||'Certificate';
  lbLastFocus=document.activeElement;
  lb.classList.add('on'); lockScroll();
  lb.querySelector('button').focus();
}
/* only the backdrop and the close button dismiss it — clicking the
   certificate itself used to close the lightbox you just opened */
lb.addEventListener('click',e=>{if(e.target===lb||e.target.closest('button')) closeLb();});


/* ══ SHIPMENT CALCULATOR ══ */
const optWrap=document.getElementById('opts'),qty=document.getElementById('qty'),qLab=document.getElementById('qLab');
let bagKg=50;
const fmt=n=>n.toLocaleString('en-IN');
function calc(){
  const mt=+qty.value; qLab.textContent=fmt(mt);
  const rows=[];
  if(bagKg>0){
    const bags=Math.ceil(mt*1000/bagKg);
    rows.push(['Bags Required',fmt(bags)]);
    rows.push(['Bag Size',bagKg>=1000?(bagKg/1000)+' MT jumbo':bagKg+' kg']);
  } else {
    rows.push(['Loading Mode','Loose bulk']);
    rows.push(['Discharge','Pneumatic']);
  }
  rows.push(['Total Weight',fmt(mt)+' MT']);
  rows.push(["20' Containers",'≈ '+fmt(Math.ceil(mt/20))]);
  document.getElementById('calcRows').innerHTML=rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}
optWrap.addEventListener('click',e=>{
  const b=e.target.closest('.opt'); if(!b) return;
  optWrap.querySelectorAll('.opt').forEach(o=>o.classList.remove('on'));
  b.classList.add('on'); bagKg=+b.dataset.kg; calc();
});
qty.addEventListener('input',calc); calc();
document.getElementById('calcCta').addEventListener('click',()=>{
  document.getElementById('g').value=qty.value;
  const packMap={50:'50 kg Bag',1000:'1000 kg Jumbo Bag',1500:'1500 kg Jumbo Bag',0:'Bulker'};
  const sel=document.getElementById('f2');
  [...sel.options].forEach(o=>{if(o.text===packMap[bagKg]) sel.value=o.value;});
  document.getElementById('enquiry').scrollIntoView({behavior:RM?'auto':'smooth'});
});

/* logistics steps */
const STEPS=[
 ['Sourcing','Material is sourced against your written specification from thermal power stations in Odisha.'],
 ['Classification','Processing separates the fine fraction so an optimum proportion of the product is fine particles.'],
 ['Testing','Samples are drawn and a test certificate issued against ASTM C618, EN 450 S or IS 3812.'],
 ['Packing','Filled into 50 kg machine-stitched bags, 1000 or 1500 kg jumbo bags, or loaded loose for bulkers.'],
 ['Loading','Bags craned into the vessel hold or bulk loaded direct, with loading photographs shared the same day.'],
 ['Documentation','Export documents released against your bank\u2019s terms, with shipment tracked to your discharge port.']
];
document.getElementById('steps').innerHTML=STEPS.map(([t,d],i)=>`
 <div class="step rv" style="--n:'${i+1}'"><b>${String(i+1).padStart(2,'0')}</b><h3>${t}</h3><p>${d}</p></div>`).join('');
observeAll();

/* applications */
const A=['Cement manufacturing','Brick plants','Ready-mix concrete (RMC) plants','Builders — slabs and concreting'];
const B=['Portland cement and grout','Raw feed for cement clinker','Structural fill and flowable fill','Road sub-base and aggregate','Stabilisation of soft soils','Mine reclamation','Waste stabilisation'];
document.getElementById('appA').innerHTML=A.map((t,i)=>`<li class="rv" style="transition-delay:${i*0.07}s">${t}</li>`).join('');
document.getElementById('appB').innerHTML=B.map((t,i)=>`<li class="rv" style="transition-delay:${i*0.07}s">${t}</li>`).join('');
observeAll();

/* classification bench */
const cv=document.getElementById('cv'),ctx=cv.getContext('2d'),sl=document.getElementById('sieve');
const parts=[];for(let i=0;i<560;i++)parts.push({r:Math.random(),x:Math.random(),y:Math.random(),j:Math.random()*6.28,sp:.15+Math.random()*.5});
let W=0,H=0;
function sizeCv(){const b=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=b.width;H=b.height;if(!W)return;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);}
function draw(t){
  if(!W)return;
  const cut=(+sl.value)/100,line=H*0.38;
  ctx.clearRect(0,0,W,H);
  for(const p of parts){
    const coarse=p.r<cut,band=coarse?line:H-line,base=coarse?0:line;
    const x=p.x*W+(RM?0:Math.sin(t/2600+p.j)*4*p.sp);
    const y=base+p.y*band*.9+(coarse?9:6);
    ctx.beginPath();ctx.arc(x,y,coarse?1.6+p.r*7:.8+p.r*1.6,0,6.283);
    ctx.fillStyle=coarse?'rgba(212,175,55,.8)':'rgba(94,190,199,.55)';
    ctx.fill();
  }
}
function read(){
  const v=+sl.value;
  document.getElementById('rVal').textContent=v;
  document.getElementById('rPass').textContent=100-v;
  /* EN 450-1 fineness category S is 12% max; ASTM C618 and IS 3812 both 34% */
  document.getElementById('rGrade').textContent=v<=12?'BS EN 450 S · ASTM C618 · IS 3812':v<=34?'ASTM C618 · IS 3812':'Above the 34% threshold';
}
sl.addEventListener('input',()=>{read();if(RM)draw(0);});
let on=false;
new IntersectionObserver(es=>es.forEach(e=>{on=e.isIntersecting;}),{threshold:.03}).observe(document.getElementById('bench'));
if(RM){sizeCv();draw(0);} else (function loop(t){if(on)draw(t);requestAnimationFrame(loop);})(0);
addEventListener('resize',()=>{sizeCv();if(RM)draw(0);});
addEventListener('load',()=>{sizeCv();if(RM)draw(0);});
sizeCv();read();

/* ══ SCROLL ENGINE: progress, header, parallax, back-to-top ══ */
const prog=document.getElementById('prog'),hdr=document.querySelector('.hdr'),topBtn=document.getElementById('top-btn');
const netImg=document.querySelector('.net-ph img'),aboutImg=document.querySelector('.about-ph img'),bandImg=document.querySelector('.band-ph img');
let sTick=false;
function onScroll(){
  const y=scrollY, max=document.documentElement.scrollHeight-innerHeight;
  prog.style.width=(max>0?(y/max)*100:0)+'%';
  hdr.classList.toggle('sm',y>50);
  topBtn.classList.toggle('on',y>700);
  if(!RM){
    if(netImg){const r=netImg.parentElement.getBoundingClientRect();
      if(r.bottom>0&&r.top<innerHeight){const d=(r.top-innerHeight/2)*-0.05;
        netImg.style.transform=`translateY(${Math.max(-38,Math.min(38,d))}px)`;}}
    /* Clamped: the band only has 12% of its height in slack either side, so the
       travel is capped well inside that. Unclamped, a long scroll ran the
       picture off its own top edge. */
    if(bandImg){const r=bandImg.parentElement.getBoundingClientRect();
      if(r.bottom>0&&r.top<innerHeight){const d=(r.top-innerHeight/2)*-0.045;
        bandImg.style.transform=`translateY(${Math.max(-38,Math.min(38,d))}px)`;}}
    if(aboutImg){const r=aboutImg.getBoundingClientRect();
      if(r.bottom>0&&r.top<innerHeight) aboutImg.style.transform=`translateY(${(r.top-innerHeight/2)*-0.035}px)`;}
  }
}
addEventListener('scroll',()=>{if(sTick)return;sTick=true;requestAnimationFrame(()=>{onScroll();sTick=false;});},{passive:true});
addEventListener('resize',onScroll); onScroll();
topBtn.addEventListener('click',()=>scrollTo({top:0,behavior:RM?'auto':'smooth'}));

/* anchor scrolling that clears the sticky header */
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]'); if(!a) return;
  const id=a.getAttribute('href'); if(id==='#'||id.length<2) return;
  const el=document.querySelector(id); if(!el) return;
  e.preventDefault();
  const off=hdr.getBoundingClientRect().height+10;
  scrollTo({top:el.getBoundingClientRect().top+scrollY-off,behavior:RM?'auto':'smooth'});
});

/* count-up on the hero figures */
const ease=t=>1-Math.pow(1-t,3);
document.querySelectorAll('[data-count]').forEach(el=>{
  new IntersectionObserver((es,ob)=>es.forEach(e=>{
    if(!e.isIntersecting) return; ob.disconnect();
    const target=+el.dataset.count;
    if(RM){el.textContent=target;return;}
    const t0=performance.now();
    (function step(now){
      const q=Math.min((now-t0)/1400,1);
      el.textContent=Math.round(target*ease(q));
      if(q<1) requestAnimationFrame(step);
    })(t0);
  }),{threshold:.6}).observe(el);
});

/* credentials marquee — clone the set until it overflows the rail twice, then
   tell the CSS how far one set is so the loop restarts exactly on the seam.
   Measured rather than guessed: the card width is a clamp(), so one set is a
   different number of pixels at every viewport. */
(function(){
  const rail=document.querySelector('.creds-marquee'), track=rail&&rail.querySelector('.certs');
  if(!track||RM) return;                       // reduced motion keeps the static row

  const originals=[...track.children];
  const setWidth=()=>originals.reduce((w,el)=>{
    const cs=getComputedStyle(el);
    return w+el.getBoundingClientRect().width+parseFloat(cs.marginRight||0);
  },0);

  let clones=[];
  function build(){
    clones.forEach(c=>c.remove()); clones=[];
    const one=setWidth();
    if(!one) return;                           // images not laid out yet
    /* two rails' worth guarantees the tail never shows a gap mid-slide */
    const need=Math.ceil((rail.offsetWidth*2)/one);
    for(let i=0;i<need;i++) originals.forEach(el=>{
      const c=el.cloneNode(true);
      /* decorative repeats: keep them out of the tab order and off the
         accessibility tree so the five marks are announced once, not six times */
      c.setAttribute('aria-hidden','true'); c.setAttribute('tabindex','-1'); c.removeAttribute('role');
      clones.push(c); track.appendChild(c);
    });
    track.style.setProperty('--shift',one+'px');
    track.style.setProperty('--dur',Math.round(one/46)+'s');   // ~46px per second
  }

  build();
  addEventListener('load',build);              // re-measure once images have size
  let t; addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(build,180);});
})();

/* the enquiry form is wired to the dashboard in assets/js/enquiry.js */
