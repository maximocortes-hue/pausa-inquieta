// Escenas nuevas o rehechas del paso a paso (se suman a scenes.js).
import { rand, pick, clamp, map, WEIGHTS } from '../core/fx.js';
import { pi } from '../core/pi.js';
import { hostile } from './hostile.js';

const gsap = window.gsap;

function noise(cv) {
  const x = cv.getContext('2d');
  const img = x.createImageData(cv.width, cv.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  x.putImageData(img, 0, 0);
}
function crossing() {
  const seen = new Set();
  return (key, p, at, fn) => {
    if (p >= at && !seen.has(key)) { seen.add(key); fn(); }
    if (p < at - 0.04) seen.delete(key);
  };
}
// Carga diferida de una escena 3D cuando se acerca
function lazy3d(canvas, load) {
  let api = null, p = 0;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    load().then((a) => { api = a; api.setProgress(p); }).catch((err) => console.warn('3D no disponible', err));
  }, { rootMargin: '150% 0px' });
  io.observe(canvas);
  return { set(v) { p = v; if (api) api.setProgress(v); } };
}

// =========================================================
// 01 · ANTES DE ENTRAR — el aula en 3D
// =========================================================
function aula3d(stage, { sound }) {
  const canvas = stage.querySelector('.world');
  const w = lazy3d(canvas, () => import('../three/aula.js').then((m) => m.createAula(canvas)));
  const once = crossing();
  return {
    progress(p) {
      w.set(p);
      once('uv', p, 0.09, () => sound.beep(660, 0.2, 0.03, 'sine'));
      once('door', p, 0.21, () => { sound.click(0.2); sound.whoosh(0.9, 0.08, true); });
      once('lines', p, 0.3, () => sound.tick(0.15));
      once('box', p, 0.5, () => sound.thud(0.25));
      once('open', p, 0.58, () => sound.whoosh(0.6, 0.06, true));
      once('card', p, 0.66, () => sound.chime(523, 0.04));
      once('sheet', p, 0.68, () => sound.click(0.1));
      once('mon', p, 0.75, () => sound.beep(1200, 0.25, 0.04, 'sine'));
      once('zoom', p, 0.86, () => sound.whoosh(1.2, 0.1, true));
    },
  };
}

// =========================================================
// 02 · EL CORAZÓN DE LA PAUSA — el salón en 3D, el piso se abre (loop)
// =========================================================
function salon3d(stage, { sound, heart }) {
  const canvas = stage.querySelector('.world');
  const w = lazy3d(canvas, () => import('../three/salon.js').then((m) => m.createSalon(canvas, {
    onFloor: () => { sound.thud(0.45); setTimeout(() => sound.whoosh(1.1, 0.12, false), 200); },
  })));
  return {
    enter: () => { heart.audible = 'always'; },
    leave: () => { heart.audible = 'auto'; },
    progress(p) { w.set(p); },
  };
}

// =========================================================
// 04 · LAS COMPUTADORAS — se encienden en distintos momentos, una línea
// cruza las pantallas hasta la cuarta: "¿Faltaba algo?". Se corta.
// =========================================================
function pcs(stage, { sound, tv }) {
  const mons = [...stage.querySelectorAll('.mon')];
  const you = stage.querySelector('.mon--you');
  const mid = mons.filter((m) => !m.classList.contains('mon--you') && !m.classList.contains('mon--far'));
  const far = stage.querySelector('.mon--far');
  const q = far.querySelector('.mon__q');
  const paths = mid.map((m) => m.querySelector('path'));
  paths.forEach((p) => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; });
  const youPath = you.querySelector('path');
  youPath.setAttribute('pathLength', '1'); youPath.style.strokeDasharray = '1'; youPath.style.strokeDashoffset = '1';
  const once = crossing();
  let asked = false;
  return {
    progress(p) {
      mid.forEach((m, i) => {
        const at = 0.08 + i * 0.09;
        const on = p >= at && p < 0.8;
        m.classList.toggle('is-on', on);
        once('on' + i, p, at, () => { sound.beep(880 + i * 140, 0.08, 0.04, 'sine'); gsap.fromTo(m.querySelector('.mon__scr'), { filter: 'brightness(4)' }, { filter: 'brightness(1)', duration: 0.5 }); });
        // la línea va pasando de pantalla en pantalla
        paths[i].style.strokeDashoffset = 1 - clamp(map(p, 0.36 + i * 0.06, 0.42 + i * 0.06));
      });
      const farOn = p >= 0.56 && p < 0.8;
      far.classList.toggle('is-on', farOn);
      if (farOn && !asked) { asked = true; sound.chime(587, 0.05); pi.write(q, '¿Faltaba algo?', { speed: 70 }); }
      if (p < 0.5) { asked = false; q.textContent = ''; }
      once('cut', p, 0.8, () => tv.burst(0.5));
      const back = p >= 0.8;
      you.classList.toggle('is-on', back);
      you.classList.toggle('is-focus', back);
      youPath.style.strokeDashoffset = back ? 1 - clamp(map(p, 0.82, 0.92)) : 1;
    },
  };
}

// =========================================================
// 05 · LA PARED DE LETRAS — lo que escribís se vuelve físico y te sigue
// (no solo acá: hasta que termina el paso a paso)
// =========================================================
function letras(stage, { sound, heart }) {
  const grid = stage.querySelector('.wall__grid');
  const typed = stage.querySelector('.wall__typed');
  const go = stage.querySelector('.wall__go');
  const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  ABC.push('←');
  const TRAMA = ['#1f3cff', '#d7ff3a', '#a47cff', '#ff4b2b', '#ecebe5', '#2b3f78'];
  ABC.forEach((ch, i) => {
    const b = document.createElement('button');
    b.textContent = ch;
    b.style.setProperty('--c', TRAMA[[0, 1, 2, 3, 4, 1, 5, 2, 0, 3, 1, 4, 2, 5, 0, 1, 3, 2, 4, 0, 5, 1, 2, 3, 0, 4, 1, 2][i % 28]]);
    b.style.setProperty('--r', `${rand(-22, 22).toFixed(1)}deg`);
    b.style.setProperty('--mx', `${Math.round(rand(0, 300))}px`);
    b.style.setProperty('--my', `${Math.round(rand(0, 300))}px`);
    if (ch === '←') b.setAttribute('aria-label', 'Borrar');
    b.addEventListener('click', () => press(ch === '←' ? 'Backspace' : ch));
    grid.appendChild(b);
  });
  let text = '';
  function press(k) {
    if (k === 'Backspace') text = text.slice(0, -1);
    else if (k === 'Enter' || k === ' ') launch();
    else if (text.length < 16) text += k.toUpperCase();
    typed.textContent = text;
    const btn = [...grid.children].find((b) => b.textContent === k.toUpperCase());
    if (btn) { btn.classList.add('is-hit'); setTimeout(() => btn.classList.remove('is-hit'), 160); }
    sound.click(0.12);
  }
  function launch() {
    if (!text.trim()) return;
    const r = stage.querySelector('.wall__input').getBoundingClientRect();
    hostile.addWord(text, r.left, r.top - 30);
    text = '';
    typed.textContent = '';
    heart.level += 0.08;
    sound.whoosh(0.5, 0.08);
  }
  go.addEventListener('click', launch);
  let active = false;
  window.addEventListener('keydown', (e) => {
    if (!active || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-zñ]$/i.test(e.key) || e.key === 'Backspace' || e.key === 'Enter') { e.preventDefault(); press(e.key); }
  });
  return { enter: () => { active = true; }, leave: () => { active = false; } };
}

// =========================================================
// 06 · LA ESCALERA — no tiene fin. Cuanto más querés subir (scroll), más cuesta.
// =========================================================
function escalera(stage, { sound, lenis }) {
  const world = stage.querySelector('.stairs__world');
  const track = stage.querySelector('.stairs__track');
  const door = stage.querySelector('.stairs__door');
  const cv = stage.querySelector('.stairs__noise');
  const N = 18;
  for (let i = 0; i < N; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--i', i);
    s.innerHTML = '<b></b>';
    track.appendChild(s);
  }
  let active = false, nz = 0, last = -1, climbed = 0, prevScroll = 0, cool = 0, p = 0;
  return {
    enter: () => { active = true; prevScroll = lenis.scroll; },
    leave: () => { active = false; },
    progress(v) {
      p = v;
      const climb = map(v, 0, 0.8);
      const loop = (climb * 16) % 1;
      track.style.setProperty('--loop', loop.toFixed(4));
      // la escalera cambia de lugar, a los saltos
      const shift = map(v, 0.5, 0.8);
      const steps = Math.round(shift * 5) / 5;
      world.style.transform = `rotateY(${(steps * 70 - (v > 0.8 ? 0 : 0)).toFixed(1)}deg) translateX(${(steps * -8).toFixed(1)}vw)`;
      const st = Math.floor(climb * 16);
      if (st !== last && v < 0.8) { last = st; sound.tick(0.1 + climb * 0.2, false); if (climb > 0.3) sound.static(0.12, 0.03 + climb * 0.08); }
      nz = v < 0.8 ? map(v, 0.08, 0.6) * 0.3 : map(v, 0.8, 0.95, 0.3, 0);
      cv.style.opacity = nz;
      const d = map(v, 0.82, 0.94);
      door.style.opacity = d;
      door.style.transform = `translate(-50%, -50%) scale(${0.85 + d * 0.15})`;
    },
    tick(dt) {
      if (!active) return;
      if (nz > 0.01) noise(cv);
      // Subir cuesta: si seguís scrolleando para abajo, la escalera te devuelve un poco
      const s = lenis.scroll;
      const dy = s - prevScroll; prevScroll = s;
      cool -= dt;
      if (p > 0.06 && p < 0.8 && dy > 0) {
        climbed += dy;
        if (climbed > 260 && cool <= 0) {
          cool = 0.9;
          const back = climbed * 0.45;
          climbed = 0;
          sound.glitch(0.05);
          lenis.scrollTo(s - back, { duration: 0.45, force: true, easing: (k) => 1 - Math.pow(1 - k, 3) });
          gsap.fromTo(world, { filter: 'blur(3px)' }, { filter: 'blur(0px)', duration: 0.5 });
        }
      } else if (dy < 0) climbed = 0;
    },
  };
}

// =========================================================
// 06 · LOS DOMINÓS — la primera pieza está de cara al piso. Si la agarrás y la
// movés, cae la cadena. Si no, se acomoda sola. Al final, una frase hecha de dominós.
// =========================================================
const FONT = {
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['#####', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
};
function dominos(stage, { sound, tv, heart }) {
  const row = stage.querySelector('.dominos__row');
  const phrase = stage.querySelector('.dominos__phrase');
  const N = 15;
  const pieces = [];
  for (let i = 0; i < N; i++) {
    const d = document.createElement('div');
    d.className = 'domino' + (i === 0 ? ' domino--first' : '');
    if (i === 0) { d.setAttribute('role', 'button'); d.setAttribute('tabindex', '0'); d.setAttribute('aria-label', 'Primera ficha: agarrala y levantala'); d.dataset.cursor = 'levantar'; }
    row.appendChild(d);
    pieces.push(d);
  }
  const first = pieces[0];
  // La frase, armada con fichas (dos renglones)
  const lines = ['TE DIJE QUE', 'NO HAGAS NADA'];
  const tiles = [];
  lines.forEach((ln, li) => {
    let col = 0;
    [...ln].forEach((ch) => {
      if (ch === ' ') { col += 3; return; }
      const f = FONT[ch];
      f.forEach((r, ry) => [...r].forEach((c, rx) => { if (c === '#') tiles.push({ x: col + rx, y: li * 9 + ry }); }));
      col += 6;
    });
  });
  const cols = Math.max(...tiles.map((t) => t.x)) + 1, rows = 16;
  phrase.style.setProperty('--cols', cols);
  phrase.style.setProperty('--rows', rows);
  const tileEls = tiles.map((t) => {
    const e = document.createElement('i');
    e.style.left = `${(t.x / cols) * 100}%`;
    e.style.top = `${(t.y / rows) * 100}%`;
    phrase.appendChild(e);
    return e;
  });
  // centrar cada renglón
  lines.forEach((ln, li) => {
    const w = [...ln].reduce((s, ch) => s + (ch === ' ' ? 3 : 6), 0) - 1;
    const off = (cols - w) / 2;
    tiles.forEach((t, k) => { if (Math.floor(t.y / 9) === li) tileEls[k].style.left = `${((t.x + off) / cols) * 100}%`; });
  });

  let state = 'down';
  let active = false, p = 0;
  const reset = () => {
    state = 'down';
    gsap.killTweensOf([...pieces, ...tileEls]);
    gsap.set(pieces, { rotate: 0, opacity: 1 });
    gsap.set(first, { rotate: -90 });
    gsap.set(tileEls, { opacity: 0 });
  };
  reset();
  function run(byYou) {
    if (state !== 'down') return;
    state = 'running';
    if (byYou) { tv.burst(0.8); heart.level += 0.3; }
    const tl = gsap.timeline({ onComplete: () => { state = 'done'; } });
    tl.to(first, { rotate: 0, duration: 0.6, ease: 'back.out(2)', onComplete: () => sound.click(0.2) }).add(() => {}, '+=0.5');
    pieces.forEach((d, i) => { tl.to(d, { rotate: 68 - i * 0.6, duration: 0.2, ease: 'power2.in', onComplete: () => sound.click(0.1 + i * 0.01) }, '>-0.1'); });
    // las fichas caídas se juntan y forman la frase
    const rr = row.getBoundingClientRect();
    tl.add(() => {
      const pr = phrase.getBoundingClientRect();
      tileEls.forEach((e) => {
        const sx = rr.left + rand(0, rr.width) - pr.left - e.offsetLeft;
        const sy = rr.top + rr.height * 0.7 - pr.top - e.offsetTop;
        gsap.fromTo(e, { x: sx, y: sy, rotate: rand(-90, 90), opacity: 0 }, { x: 0, y: 0, rotate: 0, opacity: 1, duration: rand(0.7, 1.3), ease: 'power3.inOut', delay: rand(0, 0.8) });
      });
      gsap.to(pieces, { opacity: 0.15, duration: 0.8 });
      sound.whoosh(1.4, 0.08, true);
      setTimeout(() => sound.chime(392, 0.06), 1500);
    }, '+=0.3');
  }
  // agarrar y mover la primera ficha
  let drag = null;
  first.addEventListener('pointerdown', (e) => { if (state !== 'down') return; drag = { y: e.clientY }; first.setPointerCapture(e.pointerId); sound.click(0.1); });
  first.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = clamp((drag.y - e.clientY) / 120);
    gsap.set(first, { rotate: -90 + k * 90 });
    if (k >= 0.85) { drag = null; run(true); }
  });
  first.addEventListener('pointerup', () => { if (drag) { drag = null; if (state === 'down') gsap.to(first, { rotate: -90, duration: 0.4, ease: 'bounce.out' }); } });
  first.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(true); } });
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(v) { p = v; if (p < 0.03 && state !== 'down') reset(); if (p > 0.7) run(false); },
    tick(dt, idle) { if (active && p > 0.14 && idle > 3 && !drag) run(false); },
  };
}

// =========================================================
// 08 · DESPUÉS — ruido; Pausa Inquieta en el proyector; las escenas vuelven
// y se resuelven solas. Tu cuenta de cosas hechas.
// =========================================================
function ruido(stage, { sound, stats, heart }) {
  const cv = stage.querySelector('.static');
  const after = stage.querySelector('.after');
  const quote = stage.querySelector('.after__quote');
  const qText = quote.textContent.trim();
  const piNoise = stage.querySelector('.after__pi canvas');
  const reel = stage.querySelector('.after__reel');
  const num = stage.querySelector('[data-stat]');
  const once = crossing();
  let active = false, sOp = 0, said = false, counted = false;
  quote.textContent = '';
  const markDone = () => { try { sessionStorage.setItem('pi-recorrido-done', '1'); } catch (e) { /* ignore */ } };
  stage.querySelectorAll('[data-exit]').forEach((a) => a.addEventListener('click', markDone));
  return {
    enter: () => { active = true; hostile.clearWords(); hostile.enable(false); },
    leave: () => { active = false; hostile.enable(true); },
    progress(p) {
      sOp = map(p, 0, 0.16);
      cv.style.opacity = sOp * (1 - map(p, 0.2, 0.36) * 0.75);
      const a = map(p, 0.16, 0.28);
      after.style.opacity = a;
      after.style.transform = `translateY(${(1 - a) * 30}px)`;
      once('static', p, 0.02, () => sound.static(1.6, 0.16));
      if (p > 0.26 && !said) {
        said = true;
        pi.write(quote, qText, { rough: () => 0.15, speed: 26 });
        reel.classList.add('is-on');
      }
      if (p < 0.2) { said = false; quote.textContent = ''; reel.classList.remove('is-on'); }
      if (p > 0.6 && !counted) {
        counted = true;
        markDone();
        const s = stats();
        const o = { v: 0 };
        gsap.to(o, { v: s.actions, duration: 1.6, ease: 'power2.out', onUpdate: () => { num.textContent = Math.round(o.v); } });
      }
      if (p < 0.5) counted = false;
    },
    tick() {
      if (!active) return;
      if (sOp > 0.01) noise(cv);
      noise(piNoise);
      heart.force = 1;
    },
  };
}

export const NEW_SCENES = { aula3d, salon3d, pcs, letras, escalera, dominos, ruido };
