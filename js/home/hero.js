// HERO — la puerta. El logo aparece "buscando" su peso y reacciona al mouse.
import { split, torn, pixels, orbit, WEIGHTS, pick, finePointer, reduced, clamp } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;

// Pesos del logo original: PAUSA fina y espaciada al ancho de INQUIETA;
// INQUIETA alterna: I fina, N Q gruesas, U fina, I gruesa, E fina, T gruesa, A fina.
const LOGO_A = 200;
const LOGO_B = [200, 700, 700, 200, 700, 200, 700, 200];

export default function hero() {
  const sec = document.querySelector('.hero');
  const rowA = sec.querySelector('.logo__row--a');
  const rowB = sec.querySelector('.logo__row--b');
  const a = split(rowA).chars;
  const b = split(rowB).chars;
  a.forEach((c) => { c.dataset.w = LOGO_A; });
  b.forEach((c, i) => { c.dataset.w = LOGO_B[i]; });
  const chars = [...a, ...b];
  chars.forEach((c) => { c.style.fontWeight = c.dataset.w; });

  // PAUSA se espacia hasta ocupar el mismo ancho que INQUIETA (como en el logo)
  function track() {
    a.forEach((c) => { c.style.marginRight = ''; c.style.fontWeight = c.dataset.w; });
    b.forEach((c) => { c.style.fontWeight = c.dataset.w; });
    const wa = a.reduce((s, c) => s + c.getBoundingClientRect().width, 0);
    const wb = b.reduce((s, c) => s + c.getBoundingClientRect().width, 0);
    const gap = Math.max(0, (wb - wa) / (a.length - 1));
    a.forEach((c, i) => { if (i < a.length - 1) c.style.marginRight = gap + 'px'; });
  }
  track();
  if (document.fonts) document.fonts.ready.then(track);
  window.addEventListener('resize', track);

  torn(sec.querySelector('.hero__sun-core'), { amp: 1.6, step: 2.4, sides: 'tlb' });
  const px = pixels(sec.querySelector('.hero__tramas'), { n: 14, colors: ['#1f3cff', '#a47cff', '#ecebe5', '#d7ff3a'], area: innerWidth < 760 ? [50, 50, 96, 94] : [66, 8, 98, 92] });
  const orb = orbit(sec.querySelector('.hero__tramas'), {
    rx: 420, ry: 120, rot: -14, color: 'rgba(236,235,229,.45)',
    style: 'width:min(62vw,860px);right:-3vw;top:28vh;',
  });
  // un punto azul que viaja por la órbita
  const traveler = document.createElement('div');
  traveler.className = 't-circle';
  Object.assign(traveler.style, { width: '12px', height: '12px', background: '#1f3cff', left: '0', top: '0', zIndex: 3 });
  sec.querySelector('.hero__tramas').appendChild(traveler);

  const sun = sec.querySelector('.hero__sun');
  const sunCore = sec.querySelector('.hero__sun-core');
  const tramas = sec.querySelectorAll('.hero__tramas > .t-circle, .hero__tramas > .t-bar, .hero__ast');
  const photos = sec.querySelectorAll('.hero__city, .hero__boy');
  const brand = sec.querySelector('.hero__brand');

  gsap.set(chars, { opacity: 0, yPercent: 40 });
  gsap.set(sunCore, { scaleX: 0 });
  gsap.set(tramas, { scale: 0 });
  gsap.set(photos, { opacity: 0, y: 60 });
  gsap.set(px, { scale: 0 });
  gsap.set(orb, { opacity: 0 });
  gsap.set(['.hero__tag', '.hero__foot'], { opacity: 0, y: 20 });

  let ready = false;

  // Órbita: posición del punto viajero
  const orbitPos = { t: 0 };
  gsap.to(orbitPos, { t: 1, duration: 14, repeat: -1, ease: 'none' });
  gsap.ticker.add(() => {
    const r = orb.getBoundingClientRect();
    const sr = sec.getBoundingClientRect();
    const ang = orbitPos.t * Math.PI * 2;
    const rad = (-14 * Math.PI) / 180;
    const ex = Math.cos(ang) * (r.width / 2 - 8);
    const ey = Math.sin(ang) * (r.width * (120 / 440) / 2);
    const x = ex * Math.cos(rad) - ey * Math.sin(rad);
    const y = ex * Math.sin(rad) + ey * Math.cos(rad);
    traveler.style.transform = `translate(${r.left - sr.left + r.width / 2 + x - 6}px, ${r.top - sr.top + r.height / 2 + y - 6}px)`;
  });

  // Latido del sol
  const beat = gsap.timeline({ repeat: -1, paused: true })
    .to(sunCore, { scale: 1.06, duration: 0.12, ease: 'power2.out' })
    .to(sunCore, { scale: 0.99, duration: 0.18 })
    .to(sunCore, { scale: 1.035, duration: 0.1 })
    .to(sunCore, { scale: 1, duration: 0.5, ease: 'power2.out' })
    .to({}, { duration: 0.35 });

  // Pesos que tiemblan hasta encontrar su lugar
  function scramble(list, dur = 1.4) {
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / (dur * 1000);
      list.forEach((c) => {
        if (k >= 1) c.style.fontWeight = c.dataset.w;
        else if (Math.random() < 1 - k * 0.8) c.style.fontWeight = pick(WEIGHTS);
        else c.style.fontWeight = c.dataset.w;
      });
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  function intro() {
    if (reduced) {
      gsap.set([chars, photos, tramas, px, orb, sunCore, '.hero__tag', '.hero__foot'], { clearProps: 'all' });
      ready = true;
      return;
    }
    const tl = gsap.timeline({ onComplete: () => { ready = true; } });
    tl.to(sunCore, { scaleX: 1, duration: 1.1, ease: 'expo.out' }, 0)
      .add(() => beat.play(), 0.9)
      .to(chars, { opacity: 1, yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.045, from: 'random' } }, 0.15)
      .add(() => scramble(chars, 1.6), 0.15)
      .to(photos, { opacity: 1, y: 0, duration: 0.6, ease: 'steps(5)', stagger: 0.15 }, 0.5)
      .to(tramas, { scale: 1, duration: 0.8, ease: 'back.out(2)', stagger: 0.06 }, 0.6)
      .to(px, { scale: 1, duration: 0.25, ease: 'steps(2)', stagger: { each: 0.03, from: 'random' } }, 0.8)
      .to(orb, { opacity: 1, duration: 1 }, 1)
      .to(['.hero__tag', '.hero__foot'], { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 1.2);
    // pixeles que titilan siempre
    gsap.to(px, { opacity: () => Math.random(), duration: 0.12, repeat: -1, repeatRefresh: true, repeatDelay: 1.6, ease: 'steps(1)', stagger: { each: 0.4, from: 'random' }, delay: 2 });
  }

  // Mouse: las letras cercanas se vuelven su opuesto (fina ↔ gruesa)
  let rects = [];
  const measure = () => { rects = chars.map((c) => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY }; }); };
  window.addEventListener('resize', measure);
  setTimeout(measure, 600);

  if (finePointer) {
    const layers = [
      { el: sun, d: 18 }, { el: brand, d: -8 },
      ...[...photos].map((el, i) => ({ el, d: 10 + i * 8 })),
      ...[...tramas].map((el, i) => ({ el, d: -20 - (i % 4) * 10 })),
    ].map((l) => ({ x: gsap.quickTo(l.el, 'x', { duration: 1, ease: 'power3.out' }), y: gsap.quickTo(l.el, 'y', { duration: 1, ease: 'power3.out' }), d: l.d }));

    window.addEventListener('pointermove', (e) => {
      if (!ready || window.scrollY > innerHeight) return;
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * l.d); l.y(ny * l.d); });
      if (!rects.length) measure();
      const py = e.clientY + window.scrollY;
      chars.forEach((c, i) => {
        const d = Math.hypot(e.clientX - rects[i].x, py - rects[i].y);
        const R = 220;
        const base = +c.dataset.w;
        if (d < R) {
          const k = 1 - d / R;
          const opp = 1000 - base;
          c.style.fontWeight = Math.round((base + (opp - base) * k) / 100) * 100;
        } else c.style.fontWeight = base;
      });
    }, { passive: true });
  } else {
    // Touch: tocar el logo lo vuelve a sacudir
    sec.querySelector('.logo').addEventListener('click', () => { scramble(chars, 0.9); sound.click(); });
  }

  // Salida con scroll: el sol se achica hacia el corazón
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true } })
    .to(brand, { yPercent: -30, ease: 'none' }, 0)
    .to(sun, { xPercent: 60, yPercent: 60, scale: 0.4, opacity: 0, ease: 'power1.in' }, 0)
    .to(photos, { yPercent: (i) => -10 - i * 12, ease: 'none' }, 0)
    .to(sec.querySelector('.hero__tramas'), { yPercent: -18, rotate: 4, ease: 'none' }, 0);

  return { intro };
}
