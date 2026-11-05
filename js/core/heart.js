// PI: el semicírculo, la mascota de la web.
// Es Pausa (su mitad flúor) y tiene un lado opuesto: tu Ruido (Inquieta,
// la mitad en blanco y negro con ruido). Mide cuánto "hacés" (clicks, toques,
// teclas): mientras más hacés, más aparece Inquieta. Si te quedás quieto, se calma.
// Scrollear y mover el mouse no suman ruido.

import { sound } from './sound.js';

const gsap = window.gsap;

const state = {
  level: 0,
  force: 0, // mínimo de "Inquieta" impuesto (para el paso a paso o escenas)
  last: performance.now(),
  actions: 0,
  audible: 'off', // 'auto' | 'always' | 'off' — callado hasta que PI se presenta
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

const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Tab', 'Shift', ' ']);
let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
function bindInputs() {
  window.addEventListener('pointermove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'mouse') state.last = performance.now();
  }, { passive: true });
  window.addEventListener('pointerdown', () => activity.ping(0.05, true), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (NAV_KEYS.has(e.key)) { state.last = performance.now(); return; }
    activity.ping(0.025, true);
  });
  window.addEventListener('wheel', () => { state.last = performance.now(); }, { passive: true });
  window.addEventListener('touchmove', () => { state.last = performance.now(); }, { passive: true });
}

// ---------- Cuerpo de PI ----------
let el, body, core, inq, pausa, ring, ctx, cv, ringLen = 0, tipEl;
let visible = false;
let watching = false;

function mount(tip) {
  el = document.createElement('div');
  el.className = 'pi';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="pi__body">
      <svg class="pi__ring" viewBox="0 0 58 58"><circle class="track" cx="29" cy="29" r="27.5"/><circle class="prog" cx="29" cy="29" r="27.5"/></svg>
      <div class="pi__core"><div class="pi__pausa"></div><div class="pi__inq"><canvas width="16" height="32"></canvas></div></div>
    </div>
    <span class="pi__tip">${tip || ''}</span>`;
  document.body.appendChild(el);
  body = el.querySelector('.pi__body');
  core = el.querySelector('.pi__core');
  inq = el.querySelector('.pi__inq');
  pausa = el.querySelector('.pi__pausa');
  ring = el.querySelector('.prog');
  tipEl = el.querySelector('.pi__tip');
  cv = el.querySelector('canvas');
  ctx = cv.getContext('2d');
  ringLen = 2 * Math.PI * 27.5;
  ring.style.strokeDasharray = ringLen;
  ring.style.strokeDashoffset = ringLen;
  gsap.set(el, { autoAlpha: 0 });
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
  // "Inquieta" mínima impuesta (0..1)
  get force() { return state.force; },
  set force(v) { state.force = Math.max(0, Math.min(1, v)); },
  // nivel que se ve: lo que hiciste o lo impuesto, lo que sea mayor
  get mix() { return Math.max(state.level, state.force); },
  set audible(v) { state.audible = v; },
  get audible() { return state.audible; },
  get el() { return el; },
  get body() { return body; },
  get visible() { return visible; },
  onLevel(fn) { levelListeners.add(fn); },
  onBeat(fn) { beatListeners.add(fn); },
  show(v = true, dur = 0.6) { visible = v; if (el) gsap.to(el, { autoAlpha: v ? 1 : 0, duration: dur }); },
  // En la esquina, PI mira hacia donde está el mouse (se inclina)
  watch(v = true) { watching = v; if (!v && body) gsap.to(body, { rotate: 0, duration: 0.6 }); },
  setRing(p) { if (ring) ring.style.strokeDashoffset = ringLen * (1 - Math.max(0, Math.min(1, p))); },
  setTip(t) { if (tipEl) tipEl.textContent = t; },
  // Centro de PI en pantalla (para ubicar globos de diálogo)
  rect() { return core.getBoundingClientRect(); },

  init({ tip, decay = 0.07 } = {}) {
    mount(tip);
    bindInputs();
    let phase = 0;
    let lean = 0;
    gsap.ticker.add((time, deltaMs) => {
      const dt = Math.min(0.1, deltaMs / 1000);
      const idle = activity.idle;
      if (idle > 1.2) state.level = Math.max(0, state.level - dt * decay * (1 + idle * 0.15));
      const L = Math.max(state.level, state.force);

      // Latido: más rápido con más ruido
      const period = 1.15 - L * 0.6;
      phase += dt / period;
      if (phase >= 1) {
        phase = 0;
        gsap.fromTo(core, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .4)' });
        if (visible) {
          const play = state.audible === 'always' || (state.audible === 'auto' && L > 0.32);
          if (play) sound.beat(0.35 + L * 0.6);
          if (L > 0.62 && state.audible !== 'off') sound.tick(0.08 + L * 0.12);
        }
        beatListeners.forEach((fn) => fn(L));
      }

      // Visual
      inq.style.opacity = Math.min(1, L * 1.6).toFixed(3);
      pausa.style.filter = `saturate(${1 - L * 0.85}) brightness(${1 - L * 0.35})`;
      pausa.style.boxShadow = `0 0 ${24 - L * 20}px rgba(215,255,58,${0.55 - L * 0.5})`;
      if (L > 0.02) drawNoise();

      // Mirar al mouse (solo en la esquina)
      if (watching && visible) {
        const r = core.getBoundingClientRect();
        const dx = mouse.x - (r.left + r.width / 2);
        const dy = mouse.y - (r.top + r.height / 2);
        const target = Math.max(-28, Math.min(28, Math.atan2(dy, Math.abs(dx) + 60) * 40 * (dx < 0 ? -1 : 1)));
        lean += (target - lean) * 0.06;
        body.style.rotate = `${lean.toFixed(2)}deg`;
      }
      const s = L * L * 4;
      core.style.translate = s > 0.05 ? `${((Math.random() - 0.5) * s).toFixed(1)}px ${((Math.random() - 0.5) * s).toFixed(1)}px` : '';
      levelListeners.forEach((fn) => fn(L, dt));
    });
  },
};
