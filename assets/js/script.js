/* ═══════════════════════════════════════════════════════
   Site Architects — script.js
═══════════════════════════════════════════════════════ */
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Plansymbole: jede Linie zeichnet sich, Flächen blenden ein */
const canDraw = !reduceMotion && 'IntersectionObserver' in window;
if (canDraw) {
  document.documentElement.classList.add('js-draw');
  document.querySelectorAll('.draw-svg').forEach(svg => {
    [...svg.querySelectorAll('path, rect, circle, line, text')]
      .filter(el => !el.closest('defs'))
      .forEach((el, i) => {
        el.style.setProperty('--i', i);
        if (el.classList.contains('dp') || el.tagName === 'text') el.classList.add('dp');
        else { el.setAttribute('pathLength', '1'); el.classList.add('ds'); }
      });
  });
  const dio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-drawn');
    dio.unobserve(e.target);
  }), { threshold: 0.5 });
  document.querySelectorAll('[data-draw]').forEach(el => dio.observe(el));
}

/* Navigation: Linie beim Scrollen */
const nav = document.getElementById('nav');

/* Bauablauf: rote Linie füllt sich, Phasen und ihre Symbole schalten nacheinander ein */
const phaseList = document.querySelector('.phases');
const phaseItems = [...phaseList.children];

function updatePhases() {
  const r = phaseList.getBoundingClientRect();
  const p = Math.min(Math.max((window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.25), 0), 1);
  phaseList.style.setProperty('--ph', p.toFixed(3));
  phaseItems.forEach((li, i) => li.classList.toggle('on', p >= (i + 0.25) / phaseItems.length));
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
    if (canDraw) updatePhases();
    ticking = false;
  });
}
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

/* Mobile-Menü */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  mobileMenu.hidden = !open;
}
menuBtn.addEventListener('click', () => setMenu(mobileMenu.hidden));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

/* Plankopf: heutiges Datum */
document.getElementById('pkDate').textContent =
  new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

/* Dezentes Einblenden beim Scrollen */
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.section__head, .about__body > p, .about__li, .perk, .phase, .row, .faq, .contact > *, .contact__big')
    .forEach(el => {
      // Geschwister in Gruppen (Phasen, Leistungen, Spalten) erscheinen gestaffelt
      const group = el.matches('.phase, .row, .perk, .contact > *');
      if (group) el.style.setProperty('--d', ([...el.parentElement.children].indexOf(el) % 5) * 70 + 'ms');
      el.classList.add('reveal'); io.observe(el);
    });
}

/* Navigation: aktuellen Abschnitt markieren */
if ('IntersectionObserver' in window) {
  const navLinks = [...document.querySelectorAll('.nav__links a, .mobile-menu a')];
  const sections = [...new Set(navLinks.map(a => a.getAttribute('href')))]
    .map(id => document.querySelector(id)).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => {
        if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
}

/* Plan → Bau: Bauteil für Bauteil. Erst zeichnet sich der Plan, dann wird jede
   Position (A, B, C …) markiert und genau dieser Bereich wird zur echten Website. */
const build       = document.getElementById('build');
const buildFrame  = document.getElementById('buildFrame');
const buildReal   = document.getElementById('buildReal');
const buildPlan   = document.getElementById('buildPlan');
const buildPhase  = document.getElementById('buildPhase');
const buildPct    = document.getElementById('buildPct');
const buildReplay = document.getElementById('buildReplay');

const EASE_OUT    = 'cubic-bezier(.23,1,.32,1)';
const EASE_IN_OUT = 'cubic-bezier(.77,0,.175,1)';
const mobile = window.matchMedia('(max-width: 760px)');

// Bauteile in Pixeln der jeweiligen Aufnahme: [x, y, Breite, Höhe]
const PARTS = {
  desk: { w: 1440, h: 900, parts: [
    { key: 'A', name: 'Navigation', box: [0, 0, 1440, 67] },
    { key: 'B', name: 'Headline',   box: [130, 168, 530, 542] },
    { key: 'C', name: 'Anfrage',    box: [130, 722, 460, 86] },
    { key: 'D', name: 'Bild',       box: [735, 246, 570, 654] },
  ]},
  mob: { w: 390, h: 624, parts: [
    { key: 'A', name: 'Navigation', box: [0, 0, 390, 66] },
    { key: 'B', name: 'Bild',       box: [8, 96, 374, 240] },
    { key: 'C', name: 'Headline',   box: [8, 345, 374, 270] },
  ]},
};

const wait = ms => new Promise(r => setTimeout(r, ms));
const make = (tag, cls, parent) => {
  const el = document.createElement(tag);
  el.className = cls;
  parent.appendChild(el);
  return el;
};

const partsLayer = make('div', 'build__parts', buildFrame);
partsLayer.setAttribute('aria-hidden', 'true');

buildPlan.querySelectorAll('.p-line, .p-dim, .p-thin').forEach(el => {
  el.setAttribute('pathLength', '1'); el.classList.add('p-draw');
});
buildPlan.querySelectorAll('.p-block, .p-callout, .p-note, .p-label, .p-dimtext')
  .forEach(el => el.classList.add('p-pop'));

let pct = 0, runId = 0, running = false;

function countTo(target, duration = 520) {
  const from = pct, t0 = performance.now(), id = runId;
  const step = now => {
    if (id !== runId) return;
    const t = Math.min((now - t0) / duration, 1);
    pct = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
    buildPct.textContent = pct;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Ein Bauteil: Position markieren, Bereich auswählen, echte Seite freilegen */
async function buildPart(part, callout, L, src) {
  const [x, y, w, h] = part.box;
  const l = x / L.w * 100, t = y / L.h * 100;
  const r = 100 - (x + w) / L.w * 100, b = 100 - (y + h) / L.h * 100;

  callout?.classList.add('is-active');

  const sel = make('div', 'part-sel', partsLayer);
  sel.style.cssText = `left:${l}%;top:${t}%;width:${w / L.w * 100}%;height:${h / L.h * 100}%`;
  if (y === 0) sel.classList.add('part-sel--top');
  sel.innerHTML = `<i class="part-sel__c part-sel__c--tl"></i><i class="part-sel__c part-sel__c--tr"></i>
    <i class="part-sel__c part-sel__c--bl"></i><i class="part-sel__c part-sel__c--br"></i>
    <span class="part-sel__tag mono">${part.key} · ${part.name}</span><span class="part-sel__scan"></span>`;
  await sel.animate([{ opacity: 0, transform: 'scale(1.03)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, easing: EASE_OUT, fill: 'forwards' }).finished;
  await wait(180);

  const img = make('img', 'part-img', partsLayer);
  img.src = src; img.alt = '';
  partsLayer.appendChild(sel); // Auswahl bleibt über dem Bild
  const opts = { duration: 820, easing: EASE_IN_OUT, fill: 'forwards' };
  img.animate([
    { clipPath: `inset(${t}% ${100 - l}% ${b}% ${l}%)` },
    { clipPath: `inset(${t}% ${r}% ${b}% ${l}%)` }
  ], opts);
  const scan = sel.querySelector('.part-sel__scan');
  await scan.animate([{ left: '0%', opacity: 1 }, { left: '100%', opacity: 1 }], opts).finished;

  callout?.classList.remove('is-active');
  sel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' })
    .finished.then(() => sel.remove(), () => sel.remove());
}

function cancelAll() {
  [build, buildReal, buildPlan, partsLayer, ...partsLayer.querySelectorAll('*'),
   ...buildPlan.querySelectorAll('.p-draw, .p-pop')]
    .forEach(el => el.getAnimations().forEach(a => a.cancel()));
  partsLayer.innerHTML = '';
  buildPlan.querySelectorAll('.p-callout.is-active').forEach(el => el.classList.remove('is-active'));
}

function resetBuild() {
  runId++;
  cancelAll();
  pct = 0;
  buildPct.textContent = '0';
  buildPhase.textContent = 'Plan';
  buildReplay.hidden = true;
  build.classList.remove('is-done', 'is-building');
}

function finishBuild() {
  runId++;
  running = false;
  cancelAll();
  pct = 100;
  buildPct.textContent = '100';
  buildPhase.textContent = 'Fertig';
  build.classList.remove('is-building');
  build.classList.add('is-done');
  buildReplay.hidden = false;
}

async function runBuild() {
  resetBuild();
  const id = runId;
  const alive = () => id === runId;
  running = true;
  const L = mobile.matches ? PARTS.mob : PARTS.desk;
  const plan = buildPlan.querySelector(mobile.matches ? '.plan-mob' : '.plan-desk');
  const callouts = plan.querySelectorAll('.p-callout');
  const src = buildReal.currentSrc || buildReal.src;

  try {
    // 1. Plan zeichnen
    plan.querySelectorAll('.p-draw').forEach((el, i) => el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      { duration: 650, delay: i * 18, easing: EASE_IN_OUT, fill: 'forwards' }));
    plan.querySelectorAll('.p-pop').forEach((el, i) => el.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: 360, delay: 280 + i * 16, easing: 'ease-out', fill: 'forwards' }));
    await wait(1300); if (!alive()) return;

    // 2. Bauteil für Bauteil
    build.classList.add('is-building');
    const total = L.parts.length;
    for (let i = 0; i < total; i++) {
      const part = L.parts[i];
      buildPhase.textContent = `Bauteil ${part.key} · ${part.name}`;
      const done = buildPart(part, callouts[i], L, src);
      countTo(Math.round((i + 1) / total * 90));
      await done; if (!alive()) return;
      await wait(120); if (!alive()) return;
    }

    // 3. Rest der Seite einsetzen, Plan blendet aus
    buildPhase.textContent = 'Abnahme';
    build.classList.remove('is-building');
    countTo(100, 650);
    buildReal.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1, fill: 'forwards' });
    await buildPlan.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'forwards' }).finished;
    if (!alive()) return;
    finishBuild();
  } catch (e) {
    // abgebrochene Animation, z. B. durch "Nochmal bauen" – der neue Lauf übernimmt
    if (e.name !== 'AbortError') throw e;
  }
}

if (reduceMotion || !('IntersectionObserver' in window)) {
  buildPct.textContent = '100';
  buildPhase.textContent = 'Fertig';
} else {
  build.classList.add('build--js');
  const bio = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    bio.disconnect();
    runBuild();
  }, { threshold: 0.4 });
  bio.observe(buildFrame);
  buildReplay.addEventListener('click', runBuild);
  // Grösse ändert sich während des Baus: direkt fertig zeigen statt schief weiterbauen
  let lastW = innerWidth;
  window.addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    if (running) finishBuild();
  }, { passive: true });
}

/* Porträt: wird beim Hineinscrollen vom Plan (s/w) zum Foto (Farbe) */
const portrait = document.getElementById('portrait');
if ('IntersectionObserver' in window && !reduceMotion) {
  const pio = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    portrait.classList.add('in');
    setTimeout(() => portrait.classList.add('done'), 1900);
    pio.disconnect();
  }, { threshold: 0.35 });
  pio.observe(portrait);
}

/* Kontaktformular — Web3Forms, sendet an sitearchitects.dn@gmail.com */
const WEB3FORMS_ACCESS_KEY = '9736c20e-ec9a-40d1-bb36-e501ce869348';

const contactForm = document.getElementById('contactForm');
const cfSuccess   = document.getElementById('cfSuccess');
const cfError     = document.getElementById('cfError');
const cfSubmit    = document.getElementById('cfSubmit');

contactForm.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));

contactForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name    = contactForm.elements.name.value.trim();
  const email   = contactForm.elements.email.value.trim();
  const project = contactForm.elements.project.value;
  const message = contactForm.elements.message.value.trim();

  const invalid = field => {
    const el = contactForm.elements[field];
    el.removeAttribute('aria-invalid');
    void el.offsetWidth; // Animation neu starten, auch beim zweiten Versuch
    el.setAttribute('aria-invalid', 'true');
    el.focus();
  };
  if (!name)    return invalid('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalid('email');
  if (!message) return invalid('message');

  cfSubmit.disabled = true;
  cfSubmit.querySelector('span').textContent = 'Wird gesendet…';
  cfError.classList.remove('show');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Neue Anfrage von ${name} – Site Architects`,
        from_name: 'Site Architects Webformular',
        name,
        email,
        project: project || '(nicht angegeben)',
        message
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Fehler beim Senden');
    cfSuccess.classList.add('show');
    cfSubmit.hidden = true;
    contactForm.reset();
  } catch {
    cfSubmit.disabled = false;
    cfSubmit.querySelector('span').textContent = 'Nachricht senden';
    cfError.classList.add('show');
  }
});
