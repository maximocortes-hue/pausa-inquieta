// RECORRIDO — motor del paso a paso.
// Regla central (la de Pausa Inquieta): si no hacés nada, la experiencia avanza sola.
// Si hacés, avanza igual… pero con más ruido.
import { initScroll, initCursor, initNav, tv, bindPageLinks } from '../core/ui.js';
import { heart, activity } from '../core/heart.js';
import { sound, savedPref } from '../core/sound.js';
import { photos, clamp } from '../core/fx.js';
import { SCENES } from './scenes.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const lenis = initScroll();
lenis.stop();
photos();
initCursor();
initNav(lenis);
bindPageLinks();
heart.init({ lenis, tip: 'si no hacés nada, avanza', decay: 0.05 });
tv.in();

const IDLE = 4.5; // segundos quieto para que avance sola
const stats = { auto: 0 };
const ctx = { lenis, heart, activity, sound, tv, stats: () => ({ actions: activity.actions, auto: stats.auto }) };

// ---------- HUD
const scenes = [...document.querySelectorAll('.scene')];
const numEl = document.querySelector('.rhud__num');
const nameEl = document.querySelector('.rhud__name');
document.querySelector('.rhud__total').textContent = String(scenes.length).padStart(2, '0');
const rail = document.querySelector('.rail');
const dots = scenes.map((s, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Paso ${i + 1}: ${s.dataset.name}`);
  b.innerHTML = '<i></i>';
  b.addEventListener('click', () => lenis.scrollTo(s.offsetTop + 2, { duration: 1.6, force: true }));
  rail.appendChild(b);
  return b;
});
let current = -1;
function setCurrent(i) {
  if (i === current) return;
  current = i;
  numEl.textContent = String(i + 1).padStart(2, '0');
  nameEl.textContent = scenes[i].dataset.name;
  dots.forEach((d, j) => { d.classList.toggle('is-on', j === i); d.classList.toggle('is-done', j < i); });
  gsap.fromTo([numEl, nameEl], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 });
}

// ---------- Escenas
const inst = scenes.map((el) => {
  const stage = el.querySelector('.stage');
  const fn = SCENES[el.dataset.scene];
  const api = (fn && fn(stage, ctx)) || {};
  const paras = [...el.querySelectorAll('.copy p')];
  const voices = [...el.querySelectorAll('.voice')].map((v) => ({ el: v, at: +v.dataset.at, on: false }));
  const n = paras.length;
  const copy = (p) => {
    paras.forEach((para, i) => para.classList.toggle('is-in', p >= 0.03 + (i * 0.62) / Math.max(1, n)));
    voices.forEach((v) => {
      const on = p >= v.at && p < 0.92;
      if (on === v.on) return;
      v.on = on;
      if (on) {
        gsap.timeline()
          .set(v.el, { opacity: 1 })
          .fromTo(v.el, { x: -8, skewX: 20 }, { x: 0, skewX: 0, duration: 0.4, ease: 'steps(4)' });
        sound.beep(196, 0.5, 0.05, 'sawtooth');
      } else gsap.to(v.el, { opacity: 0, duration: 0.3 });
    });
  };
  return { el, api, copy };
});

inst.forEach((s, i) => {
  ScrollTrigger.create({
    trigger: s.el, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => { s.api.progress && s.api.progress(self.progress); s.copy(self.progress); },
    onToggle: (self) => {
      if (self.isActive) { setCurrent(i); s.api.enter && s.api.enter(); }
      else s.api.leave && s.api.leave();
    },
  });
  // la primera escena se ve desde el principio
  if (i === 0) { s.copy(0.0001); }
});

// ---------- Autopiloto: quedarse quieto también avanza
let stops = [];
function computeStops() {
  stops = [];
  scenes.forEach((s) => {
    const top = s.offsetTop;
    const end = top + s.offsetHeight - innerHeight;
    stops.push(top + 2, top + (end - top) * 0.5, end - 2);
  });
}
window.addEventListener('resize', () => setTimeout(computeStops, 200));

let started = false;
let auto = false;
const stopAuto = () => { if (auto) { auto = false; activity.ignoreScroll = false; } };
window.addEventListener('wheel', stopAuto, { passive: true });
window.addEventListener('touchstart', stopAuto, { passive: true });
window.addEventListener('keydown', stopAuto);

gsap.ticker.add((t, dms) => {
  const dt = Math.min(0.1, dms / 1000);
  if (current >= 0 && inst[current].api.tick) inst[current].api.tick(dt, activity.idle);
  if (!started || window.PI_NO_AUTOPILOT) return;
  if (auto) { heart.setRing(1); return; }
  const idle = activity.idle;
  heart.setRing(clamp(idle / IDLE));
  if (idle < IDLE) return;
  const y = window.scrollY;
  const next = stops.find((s) => s > y + 8);
  if (next === undefined) return;
  auto = true;
  stats.auto++;
  activity.ignoreScroll = true;
  const dur = clamp(((next - y) / innerHeight) * 2.4, 1.8, 5);
  lenis.scrollTo(next, {
    duration: dur,
    force: true,
    easing: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
    onComplete: () => { auto = false; activity.ignoreScroll = false; activity.reset(); },
  });
});

// ---------- Inicio
const start = document.querySelector('.rstart');
start.querySelector('.rstart__btn').addEventListener('click', async () => {
  if (savedPref() !== 'off') await sound.enable();
  sound.chime(330, 0.05);
  try { sessionStorage.setItem('pi-entered', '1'); } catch (e) { /* ignore */ }
  gsap.to(start, {
    autoAlpha: 0, duration: 0.8, ease: 'power2.inOut',
    onComplete: () => {
      start.remove();
      computeStops();
      lenis.start();
      started = true;
      activity.reset();
    },
  });
});

(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { ScrollTrigger.refresh(); computeStops(); });
