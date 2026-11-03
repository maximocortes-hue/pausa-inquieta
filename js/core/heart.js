// El corazón: el semicírculo que acompaña toda la web.
// Mide cuánto "hacés" (clicks, toques, teclas).
// Mientras más hacés, más aparece Inquieta (su mitad en blanco y negro con ruido).
// Si te quedás quieto, se calma solo.

import { sound } from './sound.js';

const gsap = window.gsap;

const state = {
  level: 0,
  last: performance.now(),
  actions: 0,
  audible: 'auto', // 'auto' | 'always' | 'off'
  ignoreScroll: false,
};

const levelListeners = new Set();
const beatListeners = new Set();

// ---------- Actividad ----------
export const activity = {
  get idle() { return (performance.now() - state.last) / 1000; },
  get actions() { return state.actions; },
  reset() { state.last = performance.now(); },
  // amount: cuánto ruido suma; count: si cuenta como "acción"
  ping(amount = 0.02, count = false) {
    state.last = performance.now();
    state.level = Math.min(1, state.level + amount);
    if (count) state.actions++;
  },
  set ignoreScroll(v) { state.ignoreScroll = v; },
};

// Solo suma ruido lo que es "hacer algo": tocar, clickear, apretar teclas.
// Scrollear y mover el mouse no suman (scrollear es la forma de avanzar),
// pero sí cuentan para saber si estás quieto.
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Tab', 'Shift']);
function bindInputs() {
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') state.last = performance.now();
  }, { passive: true });
  window.addEventListener('pointerdown', () => activity.ping(0.05, true), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (NAV_KEYS.has(e.key) || (e.key === ' ' && !e.target.closest?.('.ctrl, .scene'))) { state.last = performance.now(); return; }
    activity.ping(0.025, true);
  });
  window.addEventListener('wheel', () => { state.last = performance.now(); }, { passive: true });
  window.addEventListener('touchmove', () => { state.last = performance.now(); }, { passive: true });
}

// ---------- HUD ----------
let el, core, inq, pausa, ring, ctx, cv, ringLen = 0, tipEl;

function mount(tip) {
  el = document.createElement('div');
  el.className = 'heart';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg class="heart__ring" viewBox="0 0 58 58"><circle class="track" cx="29" cy="29" r="27.5"/><circle class="prog" cx="29" cy="29" r="27.5"/></svg>
    <div class="heart__core"><div class="heart__pausa"></div><div class="heart__inq"><canvas width="14" height="28"></canvas></div></div>
    <span class="heart__tip">${tip || ''}</span>`;
  document.body.appendChild(el);
  core = el.querySelector('.heart__core');
  inq = el.querySelector('.heart__inq');
  pausa = el.querySelector('.heart__pausa');
  ring = el.querySelector('.prog');
  tipEl = el.querySelector('.heart__tip');
  cv = el.querySelector('canvas');
  ctx = cv.getContext('2d');
  ringLen = 2 * Math.PI * 27.5;
  ring.style.strokeDasharray = ringLen;
  ring.style.strokeDashoffset = ringLen;
}

function drawNoise() {
  const img = ctx.createImageData(cv.width, cv.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export const heart = {
  get level() { return state.level; },
  set level(v) { state.level = Math.max(0, Math.min(1, v)); },
  set audible(v) { state.audible = v; },
  get el() { return el; },
  onLevel(fn) { levelListeners.add(fn); },
  onBeat(fn) { beatListeners.add(fn); },
  show(v = true) { if (el) gsap.to(el, { autoAlpha: v ? 1 : 0, duration: 0.6 }); },
  setRing(p) { if (ring) ring.style.strokeDashoffset = ringLen * (1 - Math.max(0, Math.min(1, p))); },
  setTip(t) { if (tipEl) tipEl.textContent = t; },

  init({ lenis, tip, decay = 0.07 } = {}) {
    mount(tip);
    bindInputs();
    let phase = 0;
    gsap.ticker.add((time, deltaMs) => {
      const dt = Math.min(0.1, deltaMs / 1000);
      const idle = activity.idle;
      if (idle > 1.2) state.level = Math.max(0, state.level - dt * decay * (1 + idle * 0.15));
      const L = state.level;

      // Latido: más rápido con más ruido
      const period = 1.15 - L * 0.6;
      phase += dt / period;
      if (phase >= 1) {
        phase = 0;
        gsap.fromTo(core, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .4)' });
        const play = state.audible === 'always' || (state.audible === 'auto' && L > 0.32);
        if (play) sound.beat(0.35 + L * 0.6);
        if (L > 0.62 && state.audible !== 'off') sound.tick(0.08 + L * 0.12);
        beatListeners.forEach((fn) => fn(L));
      }

      // Visual
      inq.style.opacity = Math.min(1, L * 1.6).toFixed(3);
      pausa.style.filter = `saturate(${1 - L * 0.85}) brightness(${1 - L * 0.35})`;
      pausa.style.boxShadow = `0 0 ${24 - L * 20}px rgba(215,255,58,${0.55 - L * 0.5})`;
      const s = L * L * 4;
      el.style.transform = s > 0.05 ? `translate(${(Math.random() - .5) * s}px, ${(Math.random() - .5) * s}px)` : '';
      if (L > 0.02) drawNoise();
      levelListeners.forEach((fn) => fn(L, dt));
    });
  },
};
