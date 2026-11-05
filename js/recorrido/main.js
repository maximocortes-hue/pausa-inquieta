// RECORRIDO — el paso a paso, contado por PI.
// No te hace hacer la experiencia: te la cuenta. Cada etapa se presenta en grande
// y después se baja con el scroll; PI narra cada parte al lado de lo que pasa.
// Sin que nadie lo diga, la página pierde el color y se vuelve hostil.
import { initScroll, initCursor, initNav, tv, bindPageLinks } from '../core/ui.js';
import { heart, activity } from '../core/heart.js';
import { sound, savedPref } from '../core/sound.js';
import { pi } from '../core/pi.js';
import { photos, split, clamp, map, pick, WEIGHTS, reduced } from '../core/fx.js';
import { SCENES as OLD } from './scenes.js';
import { NEW_SCENES } from './scenes-new.js';
import { hostile } from './hostile.js';

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
heart.init({ tip: 'Tu ruido', decay: 0.05 });
tv.in();

const scenesEl = document.querySelector('.scenes');
hostile.init({ scenes: scenesEl });

// Las luces: tocar los botones te nubla la vista; soltarlos la aclara
function luces(stage, ctx) {
  const api = OLD.luces(stage, ctx);
  stage.querySelectorAll('.lights__pads button').forEach((b) => {
    b.addEventListener('pointerdown', () => hostile.press(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => hostile.press(false)));
  });
  return api;
}
const SCENES = { ...OLD, ...NEW_SCENES, luces };

const ctx = { lenis, heart, activity, sound, tv, stats: () => ({ actions: activity.actions }) };

// ---------- PI narra: el texto va al lado de lo que pasa
const narrEl = document.querySelector('.narr');
const kickEl = narrEl.querySelector('.narr__kicker');
const textEl = narrEl.querySelector('.narr__text');
const narr = {
  current: null,
  hide() { this.current = null; gsap.to(narrEl, { autoAlpha: 0, duration: 0.3 }); },
  say(kicker, text) {
    if (this.current === text) return;
    this.current = text;
    gsap.to(narrEl, { autoAlpha: 1, duration: 0.3 });
    kickEl.textContent = kicker;
    pi.write(textEl, text, { rough: () => heart.mix * 0.8, speed: 24 });
    gsap.fromTo(heart.body, { scale: 1.18 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,.35)' });
  },
};

// ---------- HUD + riel por etapa
const etapas = [...document.querySelectorAll('.etapa')];
const numEl = document.querySelector('.rhud__num');
const nameEl = document.querySelector('.rhud__name');
document.querySelector('.rhud__total').textContent = String(etapas.length).padStart(2, '0');
const rail = document.querySelector('.rail');
const dots = etapas.map((s) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Etapa ${s.dataset.etapa}: ${s.dataset.title}`);
  b.innerHTML = '<i></i>';
  b.addEventListener('click', () => lenis.scrollTo(s.offsetTop + 2, { duration: 1.6, force: true }));
  rail.appendChild(b);
  return b;
});
let currentE = -1;
function setEtapa(i) {
  if (i === currentE || i < 0) return;
  currentE = i;
  numEl.textContent = etapas[i].dataset.etapa;
  nameEl.textContent = etapas[i].dataset.title;
  dots.forEach((d, j) => { d.classList.toggle('is-on', j === i); d.classList.toggle('is-done', j < i); });
  gsap.fromTo([numEl, nameEl], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 });
}

// ---------- Títulos de etapa: se presentan en grande
etapas.forEach((sec, i) => {
  const title = sec.querySelector('.etapa__title');
  const num = sec.querySelector('.etapa__num');
  const { chars } = split(title);
  const bases = chars.map((c, k) => (k % 3 === 1 ? 800 : k % 3 === 2 ? 200 : 400));
  let said = -1;
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onToggle: (self) => {
      if (self.isActive) {
        setEtapa(i);
        narr.hide();
        if (said !== i) { said = i; sound.whoosh(0.8, 0.06, true); sound.beat(0.5); }
      }
    },
    onUpdate: (self) => {
      const p = self.progress;
      const inn = map(p, 0.02, 0.4);
      const out = map(p, 0.75, 1);
      const P = hostile.P;
      chars.forEach((c, k) => {
        const kk = clamp(inn * 1.4 - (k / chars.length) * 0.4);
        // las letras buscan su peso (thin → black) hasta asentarse
        c.style.fontWeight = kk < 1 && kk > 0 && Math.random() < 0.5 ? pick(WEIGHTS) : bases[k];
        const glitch = P > 0.3 && Math.random() < P * 0.04 ? (Math.random() - 0.5) * P * 40 : 0;
        c.style.transform = `translate(${glitch}px, ${(1 - kk) * 60 - out * 40}px)`;
        c.style.opacity = (kk * (1 - out)).toFixed(3);
      });
      num.style.opacity = (map(p, 0, 0.25) * (1 - out)).toFixed(3);
      num.style.transform = `scale(${1 + p * 0.15}) translateY(${-out * 30}px)`;
    },
  });
});

// clic en el texto: lo completa (no hace falta esperar)
narrEl.addEventListener('click', () => { textEl.querySelectorAll('.pi-ch').forEach((s) => { s.textContent = s.dataset.ch; s.classList.add('is-in', 'is-clear'); }); });

// partes que faltan: con más hostilidad, letras del relato desaparecen un rato
gsap.ticker.add(() => {
  const P = hostile.P;
  if (P < 0.45 || Math.random() > P * 0.05) return;
  const chs = textEl.querySelectorAll('.pi-ch.is-clear');
  if (!chs.length) return;
  const c = chs[Math.floor(Math.random() * chs.length)];
  c.style.visibility = 'hidden';
  setTimeout(() => { c.style.visibility = ""; }, 300 + Math.random() * 700);
});

// ---------- Escenas
const scenes = [...document.querySelectorAll('.scene')];
const inst = scenes.map((el) => {
  const stage = el.querySelector('.stage');
  const fn = SCENES[el.dataset.scene];
  const api = (fn && fn(stage, ctx)) || {};
  const paras = [...el.querySelectorAll('.copy p')];
  const n = paras.length;
  const beats = paras.map((p, i) => ({
    at: p.dataset.at !== undefined ? +p.dataset.at : 0.02 + (i * 0.7) / Math.max(1, n),
    text: p.textContent.trim(),
    kicker: p.dataset.kicker || el.dataset.name,
  }));
  const voices = [...el.querySelectorAll('.voice')].map((v) => ({ el: v, at: +v.dataset.at, on: false }));
  const copy = (p) => {
    let b = -1;
    beats.forEach((bt, i) => { if (p >= bt.at) b = i; });
    if (b >= 0 && p < 0.985) narr.say(beats[b].kicker, beats[b].text);
    voices.forEach((v) => {
      const on = p >= v.at && p < 0.92;
      if (on === v.on) return;
      v.on = on;
      if (on) {
        gsap.timeline().set(v.el, { opacity: 1 }).fromTo(v.el, { x: -8, skewX: 20 }, { x: 0, skewX: 0, duration: 0.4, ease: 'steps(4)' });
        sound.beep(196, 0.5, 0.05, 'sawtooth');
      } else gsap.to(v.el, { opacity: 0, duration: 0.3 });
    });
  };
  return { el, api, copy };
});

let current = -1;
inst.forEach((s, i) => {
  ScrollTrigger.create({
    trigger: s.el, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => { s.api.progress && s.api.progress(self.progress); if (current === i) s.copy(self.progress); },
    onToggle: (self) => {
      if (self.isActive) setEtapa(etapas.findIndex((e) => e.dataset.etapa === s.el.dataset.etapa));
      if (self.isActive) { current = i; s.copy(self.progress); s.api.enter && s.api.enter(); document.body.dataset.current = s.el.dataset.scene; }
      else { s.api.leave && s.api.leave(); if (current === i) current = -1; }
    },
  });
});

// ---------- Progreso general → hostilidad y blanco y negro
const firstHostile = scenes.find((s) => s.dataset.scene === 'cubos');
const finalScene = scenes.find((s) => s.dataset.scene === 'final');
function updateHostile() {
  const y = window.scrollY;
  const a = firstHostile.offsetTop - innerHeight;
  const b = finalScene.offsetTop + finalScene.offsetHeight * 0.4;
  const P = clamp((y - a) / (b - a));
  // el color se va yendo desde el salón; al final ya no queda nada
  const g = clamp((y - (scenes[1].offsetTop)) / (b - scenes[1].offsetTop));
  hostile.set(P, g);
}
lenis.on('scroll', updateHostile);

gsap.ticker.add((t, dms) => {
  const dt = Math.min(0.1, dms / 1000);
  if (current >= 0 && inst[current].api.tick) inst[current].api.tick(dt, activity.idle);
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
      lenis.start();
      activity.reset();
      heart.audible = 'auto';
      heart.show(true);
      heart.watch(true);
      updateHostile();
    },
  });
});

if (reduced) hostile.enable(false);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { ScrollTrigger.refresh(); updateHostile(); });
