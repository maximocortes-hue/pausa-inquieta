// Las escenas del recorrido. Cada una recibe su "stage" y devuelve
// { progress(p), enter(), leave(), tick(dt, idle) } según lo que necesite.
import { split, torn, rand, pick, clamp, map, WEIGHTS } from '../core/fx.js';

const gsap = window.gsap;
const BRAND = ['#d7ff3a', '#a47cff', '#1f3cff', '#ff4b2b', '#ecebe5'];

function noise(cv, alpha = 255) {
  const x = cv.getContext('2d');
  const img = x.createImageData(cv.width, cv.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = alpha;
  }
  x.putImageData(img, 0, 0);
}

// Detecta cuando p cruza un umbral hacia adelante (para sonidos de una vez)
function crossing() {
  const seen = new Set();
  return (key, p, at, fn) => {
    if (p >= at && !seen.has(key)) { seen.add(key); fn(); }
    if (p < at - 0.04) seen.delete(key);
  };
}

// =========================================================
// 01 · EL COMIENZO — la puerta con el mapping; lentes UV que no revelan nada nuevo
// =========================================================
function puerta(stage) {
  const door = stage.querySelector('.door');
  const uv = stage.querySelector('.door__map--uv');
  const move = (e) => {
    const r = door.getBoundingClientRect();
    uv.style.clipPath = `circle(80px at ${e.clientX - r.left}px ${e.clientY - r.top}px)`;
  };
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerleave', () => { uv.style.clipPath = 'circle(0 at 50% 50%)'; });
  gsap.from(door, { scaleY: 0.02, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.4 });
  return {};
}

// =========================================================
// 02 · TU LUGAR — líneas, caja, hoja para dibujar, monitor
// =========================================================
function lugar(stage, { sound, heart }) {
  const lines = stage.querySelector('.desk__lines');
  const items = stage.querySelectorAll('.desk__kb, .desk__box, .desk__sheet');
  const mon = stage.querySelector('.desk__monitor i');
  const sheet = stage.querySelector('.desk__sheet');
  const cv = sheet.querySelector('canvas');
  const cx = cv.getContext('2d');
  const once = crossing();

  const fit = () => {
    const r = sheet.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio);
    const prev = cv.width ? cx.getImageData(0, 0, cv.width, cv.height) : null;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    cx.scale(dpr, dpr);
    if (prev) cx.putImageData(prev, 0, 0);
  };
  let drawing = false, lx = 0, ly = 0;
  sheet.addEventListener('pointerdown', (e) => {
    if (!cv.width) fit();
    drawing = true;
    const r = cv.getBoundingClientRect();
    lx = e.clientX - r.left; ly = e.clientY - r.top;
    sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    // el lápiz sigue la rotación de la hoja aproximadamente
    cx.strokeStyle = '#0b0b0b'; cx.lineWidth = 1.6; cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(lx, ly); cx.lineTo(x, y); cx.stroke();
    lx = x; ly = y;
    heart.level += 0.002;
  });
  sheet.addEventListener('pointerup', () => { drawing = false; });

  gsap.set(items, { opacity: 0, y: 30 });
  return {
    enter: () => setTimeout(fit, 50),
    progress(p) {
      const k = map(p, 0, 0.3);
      lines.style.clipPath = `inset(${(1 - k) * 100}% 0 0 0)`;
      items.forEach((el, i) => {
        const v = map(p, 0.12 + i * 0.12, 0.26 + i * 0.12);
        el.style.opacity = v; el.style.transform = `translateY(${(1 - v) * 30}px)${el.classList.contains('desk__sheet') ? ' rotate(4deg)' : ''}`;
      });
      const on = map(p, 0.74, 0.86);
      mon.style.transform = `scaleY(${on < 0.3 ? on * 0.05 : on})`;
      once('mon', p, 0.75, () => sound.beep(1200, 0.25, 0.04, 'sine'));
    },
  };
}

// =========================================================
// 03 · EL INICIO — el corazón late; si avanzás, el piso se abre
// =========================================================
function inicio(stage, { sound, heart }) {
  const cols = stage.querySelector('.hall__cols');
  for (let i = 0; i < 7; i++) cols.appendChild(document.createElement('span'));
  const core = stage.querySelector('.bigsemi__core');
  const semi = stage.querySelector('.bigsemi');
  const hall = stage.querySelector('.hall');
  const floor = stage.querySelectorAll('.hall__floor i');
  torn(core, { amp: 1.6, step: 2.2, sides: 'tlb' });
  const beat = gsap.timeline({ repeat: -1, paused: true })
    .to(core, { scale: 1.07, duration: 0.12 })
    .to(core, { scale: 0.99, duration: 0.18 })
    .to(core, { scale: 1.04, duration: 0.1 })
    .to(core, { scale: 1, duration: 0.5 })
    .to({}, { duration: 0.3 });
  const once = crossing();
  return {
    enter: () => { beat.play(); heart.audible = 'always'; },
    leave: () => { beat.pause(); heart.audible = 'auto'; },
    progress(p) {
      const open = map(p, 0.7, 0.82);
      const fall = map(p, 0.78, 1);
      floor[0].style.transform = `translateX(${-open * 100}%)`;
      floor[1].style.transform = `translateX(${open * 100}%)`;
      hall.style.transform = `translateY(${-fall * fall * 110}vh)`;
      semi.style.transform = `translateY(${-fall * fall * 90}vh)`;
      hall.style.opacity = 1 - fall * 0.6;
      once('open', p, 0.71, () => sound.thud(0.4));
      once('fall', p, 0.8, () => sound.whoosh(1, 0.14, false));
    },
  };
}

// =========================================================
// 04 · EL PROYECTOR — pausa se transforma en inquieta y te observa
// =========================================================
function proyector(stage, { sound, tv }) {
  const a = stage.querySelector('.morph__a');
  const b = stage.querySelector('.morph__b');
  const morph = stage.querySelector('.morph');
  const cv = b.querySelector('canvas');
  let k = 0, lastTick = -1, active = false, look = 0, lookT = 0;
  const once = crossing();
  stage.addEventListener('pointermove', (e) => {
    const r = morph.getBoundingClientRect();
    lookT = clamp((e.clientX - (r.left + r.width / 2)) / 400, -1, 1);
  });
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(p) {
      k = map(p, 0.1, 0.7);
      a.style.transform = `scaleX(${1 - k})`;
      a.style.filter = `saturate(${1 - k})`;
      b.style.transform = `scaleX(${k})`;
      const t = Math.floor(p * 30);
      if (t !== lastTick) { lastTick = t; sound.tick(0.12, t % 2 === 0); }
      once('tv', p, 0.55, () => tv.burst(0.9));
    },
    tick() {
      if (!active) return;
      if (k > 0.02) noise(cv);
      look += (lookT - look) * 0.08;
      morph.style.transform = `rotate(${look * 12 * k}deg) translateX(${look * 10 * k}px)`;
    },
  };
}

// =========================================================
// 05 · PLANTA BAJA — el cubo y los huecos
// =========================================================
function cubos(stage, { sound, heart }) {
  const box = stage.querySelector('.room__box');
  const cube = stage.querySelector('.cube');
  const holes = [...stage.querySelectorAll('.hole')];
  // cubos con glow en las paredes
  stage.querySelectorAll('.room__wall').forEach((w) => {
    for (let i = 0; i < 9; i++) {
      const g = document.createElement('i');
      g.className = 'glow';
      const c = pick(BRAND.slice(0, 4));
      Object.assign(g.style, { left: rand(6, 88) + '%', top: rand(10, 80) + '%', background: c, boxShadow: `0 0 12px ${c}` });
      if (Math.abs(parseFloat(g.style.left) - 50) > 12 || Math.abs(parseFloat(g.style.top) - 50) > 18) w.appendChild(g);
    }
  });
  let ci = 0;
  const lightUp = () => { ci = (ci + 1) % 4; stage.style.setProperty('--room-c', BRAND[ci]); };
  stage.addEventListener('pointerdown', lightUp);

  let drag = null;
  let placed = false;
  const pos = { x: 0, y: 0 };
  const setPos = () => { cube.style.transform = `translate(${pos.x}px, ${pos.y}px)`; };
  cube.addEventListener('pointerdown', (e) => {
    if (placed) return;
    drag = { sx: e.clientX - pos.x, sy: e.clientY - pos.y };
    cube.setPointerCapture(e.pointerId);
    sound.click();
  });
  cube.addEventListener('pointermove', (e) => {
    if (!drag) return;
    pos.x = e.clientX - drag.sx; pos.y = e.clientY - drag.sy;
    setPos();
    const near = nearest();
    holes.forEach((h) => h.classList.toggle('is-hot', h === near.h && near.d < 70));
  });
  const nearest = () => {
    const cr = cube.getBoundingClientRect();
    let best = { h: null, d: 1e9 };
    holes.forEach((h) => {
      const r = h.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - (cr.left + cr.width / 2), r.top + r.height / 2 - (cr.top + cr.height / 2));
      if (d < best.d) best = { h, d };
    });
    return best;
  };
  cube.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    const near = nearest();
    holes.forEach((h) => h.classList.remove('is-hot'));
    if (near.d < 70) {
      const br = box.getBoundingClientRect();
      const r = near.h.getBoundingClientRect();
      pos.x = r.left + r.width / 2 - (br.left + br.width / 2);
      pos.y = r.top + r.height / 2 - (br.top + br.height / 2);
      cube.style.transition = 'transform .35s cubic-bezier(.2,.7,.1,1)';
      setPos();
      setTimeout(() => { cube.style.transition = ''; }, 400);
      placed = true;
      holes.forEach((h) => { if (h !== near.h) h.classList.add('is-gone'); });
      sound.thud(0.3);
      heart.level += 0.15;
    } else {
      gsap.to(pos, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,.5)', onUpdate: setPos });
    }
  });
  // Teclado: E para "interactuar" con el cubo (accesible)
  cube.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== 'e') return;
    if (placed) return;
    const h = pick(holes);
    const br = box.getBoundingClientRect();
    const r = h.getBoundingClientRect();
    pos.x = r.left + r.width / 2 - (br.left + br.width / 2);
    pos.y = r.top + r.height / 2 - (br.top + br.height / 2);
    setPos(); placed = true;
    holes.forEach((o) => { if (o !== h) o.classList.add('is-gone'); });
  });

  let active = false, tt = 0, side = 0;
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(p) {
      if (p < 0.02 && placed) {
        placed = false; pos.x = pos.y = 0; setPos();
        holes.forEach((h) => h.classList.remove('is-gone'));
      }
    },
    tick(dt) {
      if (!active) return;
      tt += dt;
      if (tt > 1) { tt = 0; side = 1 - side; sound.tick(0.1, !!side); }
    },
  };
}

// =========================================================
// 06 · EL CORAZÓN — mientras más hacés, más hostil
// =========================================================
function corazon(stage, { sound, heart }) {
  const a = stage.querySelector('.hheart__a');
  const b = stage.querySelector('.hheart__b');
  const bcv = b.querySelector('canvas');
  const cine = stage.querySelector('.hheart__cine');
  const ccv = cine.querySelector('canvas');
  const shards = stage.querySelector('.shards');
  const bar = stage.querySelector('.meter b');
  let active = false, cineT = 4, cineOn = false, kick = 0;

  stage.addEventListener('pointerdown', (e) => {
    heart.level += 0.1;
    sound.beep(pick([1400, 1800, 2200]), 0.09, 0.05);
    kick = 1;
    for (let i = 0; i < 4; i++) {
      const s = document.createElement('i');
      const size = rand(20, 90);
      Object.assign(s.style, {
        left: e.clientX + 'px', top: e.clientY + 'px',
        width: size + 'px', height: size * rand(0.2, 1) + 'px',
        background: pick(['#ff4b2b', '#ecebe5', '#1f3cff']),
        clipPath: pick(['polygon(50% 0,100% 100%,0 100%)', 'polygon(0 0,100% 30%,20% 100%)', 'none']),
      });
      shards.appendChild(s);
      gsap.fromTo(s, { x: -size / 2, y: -size / 2, rotate: rand(-90, 90), scale: 0.2 }, {
        x: rand(-300, 300), y: rand(-240, 240), rotate: rand(-360, 360), scale: 1, opacity: 0,
        duration: rand(0.6, 1.2), ease: 'expo.out', onComplete: () => s.remove(),
      });
    }
  });

  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    tick(dt) {
      if (!active) return;
      const L = heart.level;
      a.style.filter = `saturate(${1 - L * 0.95}) brightness(${1 - L * 0.4})`;
      a.style.boxShadow = `0 0 ${80 - L * 70}px rgba(215,255,58,${0.55 - L * 0.5})`;
      b.style.opacity = Math.min(1, L * 1.5);
      bar.style.transform = `scaleX(${L})`;
      if (L > 0.02) noise(bcv);
      const sh = Math.max(L > 0.4 ? L * 3 : 0, kick * 10);
      kick *= 0.85;
      stage.style.transform = sh > 0.3 ? `translate(${rand(-1, 1) * sh}px, ${rand(-1, 1) * sh}px)` : '';
      // cinemática: el semicírculo llenándose de ruido
      cineT -= dt;
      if (cineT <= 0 && !cineOn) {
        cineOn = true;
        sound.static(1.2, 0.08);
        gsap.timeline({ onComplete: () => { cineOn = false; cineT = rand(5, 8); } })
          .to(cine, { opacity: 0.95, duration: 0.6, ease: 'steps(6)' })
          .to(cine, { opacity: 0, duration: 0.4, ease: 'steps(3)' }, '+=0.4');
      }
      if (cineOn) noise(ccv);
    },
  };
}

// =========================================================
// 07 · LAS COMPUTADORAS — el camino y “¿Faltaba algo?”
// =========================================================
function pcs(stage, { sound, tv }) {
  const list = [...stage.querySelectorAll('.pc[data-pc]')];
  const far = stage.querySelector('.pc--far');
  const you = stage.querySelector('.pc--you');
  const em = far.querySelector('em');
  const path = stage.querySelector('.pcs__path path');
  path.setAttribute('pathLength', '1');
  path.style.strokeDasharray = '1';
  const once = crossing();
  return {
    progress(p) {
      list.forEach((pc, i) => {
        const at = 0.1 + i * 0.12;
        pc.classList.toggle('is-on', p >= at && p < 0.84);
        once('pc' + i, p, at, () => { sound.beep(880 + i * 120, 0.08, 0.04, 'sine'); gsap.fromTo(pc.querySelector('i'), { filter: 'brightness(4)' }, { filter: 'brightness(1)', duration: 0.4 }); });
      });
      const k = map(p, 0.42, 0.62);
      path.style.strokeDashoffset = 1 - k;
      path.style.opacity = p < 0.84 ? 1 : 0;
      const farOn = p >= 0.62 && p < 0.84;
      far.classList.toggle('is-on', farOn);
      em.style.opacity = farOn ? 1 : 0;
      once('far', p, 0.62, () => sound.chime(587, 0.05));
      once('cut', p, 0.84, () => tv.burst(0.4));
      you.classList.toggle('is-focus', p >= 0.84);
      you.classList.toggle('is-on', p >= 0.84);
    },
  };
}

// =========================================================
// 08 · LAS LUCES — un patrón que nunca termina de coincidir
// =========================================================
function luces(stage, { sound }) {
  const row = stage.querySelector('.lights__row');
  const pads = stage.querySelector('.lights__pads');
  const COLS = ['#d7ff3a', '#a47cff', '#1f3cff', '#ff4b2b', '#ecebe5'];
  const N = 9;
  const state = Array.from({ length: N }, (_, i) => ({ on: i % 3 !== 1, c: i % COLS.length }));
  const tubes = state.map(() => { const t = document.createElement('i'); row.appendChild(t); return t; });
  const paint = () => tubes.forEach((t, i) => {
    t.style.setProperty('--c', COLS[state[i].c]);
    t.classList.toggle('is-off', !state[i].on);
  });
  paint();
  for (let p = 0; p < 5; p++) {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Botón ${p + 1}`);
    b.addEventListener('click', () => {
      // cada botón afecta varias luces: apaga, prende o cambia color
      for (let k = 0; k < 3; k++) {
        const i = (p * 2 + k * 3) % N;
        const op = (p + k) % 3;
        if (op === 0) state[i].on = !state[i].on;
        else if (op === 1) state[i].c = (state[i].c + 1) % COLS.length;
        else { state[i].on = true; state[i].c = (state[i].c + 2) % COLS.length; }
      }
      paint();
      sound.beep(330 + p * 110, 0.12, 0.05, 'triangle');
    });
    pads.appendChild(b);
  }
  gsap.set(tubes, { scaleY: 0, transformOrigin: '50% 100%' });
  let active = false, t = 0, shown = false;
  return {
    enter: () => { active = true; if (!shown) { shown = true; gsap.to(tubes, { scaleY: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 }); } },
    leave: () => { active = false; },
    tick(dt, idle) {
      if (!active || idle < 2) return;
      t += dt;
      if (t > 0.9) {
        t = 0;
        // si no tocás nada, las luces siguen su propio patrón
        state.push(state.shift());
        paint();
      }
    },
  };
}

// =========================================================
// 09 / 12 · ENCAPUCHADOS — de espaldas, rotando posiciones
// =========================================================
const HOOD = 'M50 4 C30 4 21 22 21 40 C21 52 25 60 30 66 C14 70 4 82 2 100 L0 140 L100 140 L98 100 C96 82 86 70 70 66 C75 60 79 52 79 40 C79 22 70 4 50 4 Z';
function hoods(stage, { sound }) {
  const wrap = stage.querySelector('.hoods');
  const words = wrap.dataset.words.split('|');
  const els = words.map((w) => {
    const h = document.createElement('div');
    h.className = 'hood';
    h.innerHTML = `<svg viewBox="0 0 100 140" aria-hidden="true"><path d="${HOOD}"/></svg><b>${w}</b>`;
    wrap.appendChild(h);
    return h;
  });
  wrap.setAttribute('aria-label', words.join(' '));
  const n = els.length;
  // permutaciones: legible → mezclado → mezclado → legible
  const perms = [
    [...Array(n).keys()],
    [...Array(n).keys()].reverse(),
    [...Array(n).keys()].map((i) => (i + 1) % n),
    [...Array(n).keys()],
  ];
  let cur = -1;
  const once = crossing();
  return {
    progress(p) {
      const inn = map(p, 0.02, 0.2);
      const out = map(p, 0.82, 0.98);
      const step = els[0].offsetWidth + 10;
      const k = p < 0.3 ? 0 : p < 0.45 ? 1 : p < 0.6 ? 2 : 3;
      if (k !== cur) {
        cur = k;
        els.forEach((el, i) => {
          const slot = perms[k].indexOf(i);
          gsap.to(el, { x: (slot - i) * step, duration: 0.9, ease: 'power3.inOut' });
        });
        if (p > 0.25) sound.whoosh(0.5, 0.05);
      }
      els.forEach((el, i) => {
        const d = clamp(inn * 1.6 - i * 0.15);
        gsap.set(el, { yPercent: (1 - d) * 110 + out * 120, opacity: 1 - out });
      });
      once('in', p, 0.05, () => sound.thud(0.2));
    },
  };
}

// =========================================================
// 10 · LA PARED DE LETRAS — las palabras flotan y molestan
// =========================================================
function letras(stage, { sound, heart }) {
  const grid = stage.querySelector('.wall__grid');
  const typed = stage.querySelector('.wall__typed');
  const go = stage.querySelector('.wall__go');
  const layer = stage.querySelector('.floaters');
  const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  ABC.push('←');
  // Colores de la trama de letras: azul, lima, violeta, rojo, blanco y un azul apagado
  const TRAMA = ['#1f3cff', '#d7ff3a', '#a47cff', '#ff4b2b', '#ecebe5', '#2b3f78'];
  ABC.forEach((ch, i) => {
    const b = document.createElement('button');
    b.textContent = ch;
    // colores mezclados sin repetir el de al lado
    b.style.setProperty('--c', TRAMA[[0, 1, 2, 3, 4, 1, 5, 2, 0, 3, 1, 4, 2, 5, 0, 1, 3, 2, 4, 0, 5, 1, 2, 3, 0, 4, 1, 2][i % 28]]);
    b.style.setProperty('--r', `${rand(-22, 22).toFixed(1)}deg`);
    b.style.setProperty('--mx', `${Math.round(rand(0, 300))}px`);
    b.style.setProperty('--my', `${Math.round(rand(0, 300))}px`);
    if (ch === '←') b.setAttribute('aria-label', 'Borrar');
    b.addEventListener('click', () => press(ch === '←' ? 'Backspace' : ch));
    grid.appendChild(b);
  });
  let text = '';
  const floats = [];
  let mx = innerWidth / 2, my = innerHeight / 2;
  stage.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; });

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
    const s = document.createElement('span');
    s.textContent = text;
    s.style.fontSize = rand(26, 64) + 'px';
    s.style.fontWeight = pick([200, 400, 800, 900]);
    s.style.color = pick(['#d7ff3a', '#a47cff', '#ecebe5', '#ff4b2b']);
    layer.appendChild(s);
    const r = stage.querySelector('.wall__input').getBoundingClientRect();
    floats.push({ el: s, x: r.left, y: r.top - 30, vx: rand(-3, 3), vy: rand(-4, -1.5), r: 0, vr: rand(-1, 1) });
    if (floats.length > 24) floats.shift().el.remove();
    text = '';
    typed.textContent = '';
    heart.level += 0.08;
    sound.whoosh(0.5, 0.08);
  }
  go.addEventListener('click', launch);

  let active = false;
  window.addEventListener('keydown', (e) => {
    if (!active || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-zñ]$/i.test(e.key) || e.key === 'Backspace' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      press(e.key);
    }
  });
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    tick() {
      if (!floats.length) return;
      const W = innerWidth, H = innerHeight;
      floats.forEach((f) => {
        // se acercan al cursor: molestan
        f.vx += (mx - f.x) * 0.00012;
        f.vy += (my - f.y) * 0.00012;
        f.vx *= 0.995; f.vy *= 0.995;
        f.x += f.vx; f.y += f.vy; f.r += f.vr;
        const w = f.el.offsetWidth;
        if (f.x < 0 || f.x + w > W) { f.vx *= -1; f.x = clamp(f.x, 0, W - w); }
        if (f.y < 40 || f.y > H - 40) { f.vy *= -1; f.y = clamp(f.y, 40, H - 40); }
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg)`;
      });
    },
  };
}

// =========================================================
// 11 · EL PASILLO — acomodar desacomoda; esperar acomoda
// =========================================================
function cuadros(stage, { sound, heart }) {
  const frames = [...stage.querySelectorAll('.frame')];
  frames.forEach((f) => torn(f.querySelector('.ph'), { amp: 1.2 }));
  const tilt = frames.map((_, i) => (i % 2 ? rand(6, 16) : -rand(6, 16)) * (i === 2 ? 0 : 1));
  const apply = (i, dur = 0.6) => gsap.to(frames[i], { rotate: tilt[i], duration: dur, ease: 'elastic.out(1,.45)' });
  frames.forEach((_, i) => apply(i, 0));
  let calmed = false;

  frames.forEach((f, i) => f.addEventListener('click', () => {
    tilt[i] = 0;
    apply(i);
    sound.click(0.2);
    heart.level += 0.07;
    calmed = false;
    const others = frames.map((_, j) => j).filter((j) => j !== i);
    for (let n = 0; n < 2; n++) {
      const j = others.splice(Math.floor(Math.random() * others.length), 1)[0];
      if (Math.random() < 0.25) {
        // se cae
        sound.thud(0.25);
        gsap.to(frames[j], {
          y: '120vh', rotate: rand(-50, 50), duration: 0.9, ease: 'power2.in',
          onComplete: () => {
            tilt[j] = rand(-18, 18);
            gsap.fromTo(frames[j], { y: '-80vh' }, { y: 0, rotate: tilt[j], duration: 1, ease: 'bounce.out', delay: 1.2 });
          },
        });
      } else {
        tilt[j] = (Math.random() < 0.5 ? -1 : 1) * rand(8, 20);
        apply(j);
      }
    }
  }));

  let active = false;
  return {
    enter: () => { active = true; gsap.from(frames, { y: -60, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }); },
    leave: () => { active = false; },
    tick(dt, idle) {
      if (!active || calmed || idle < 3.5) return;
      if (tilt.every((t) => t === 0)) { calmed = true; return; }
      calmed = true;
      frames.forEach((f, i) => { tilt[i] = 0; gsap.to(f, { rotate: 0, duration: 1.4, ease: 'power3.inOut', delay: i * 0.12 }); });
      sound.chime(440, 0.05);
    },
  };
}

// =========================================================
// 13 · LA ESCALERA — subir a ningún lado
// =========================================================
function escalera(stage, { sound }) {
  const track = stage.querySelector('.stairs__track');
  const door = stage.querySelector('.stairs__door');
  const cv = stage.querySelector('.stairs__noise');
  const N = 22, SX = 6, SY = 7;
  const steps = [];
  for (let i = 0; i < N; i++) {
    const s = document.createElement('i');
    s.style.left = `${-6 + i * SX}%`;
    s.style.top = `${96 - i * SY}%`;
    track.appendChild(s);
    steps.push(s);
  }
  let nz = 0, active = false, lastStep = -1;
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(p) {
      const climb = map(p, 0, 0.8);
      const loop = (climb * 14) % 1;
      const shift = map(p, 0.55, 0.8);
      const stepShift = Math.round(shift * 6) / 6;
      track.style.transform = `translate(${-loop * SX - stepShift * 40}%, ${loop * SY}%)`;
      const st = Math.floor(climb * 14);
      if (st !== lastStep && p < 0.8) { lastStep = st; sound.tick(0.1 + climb * 0.2, false); if (climb > 0.3) sound.static(0.12, 0.03 + climb * 0.08); }
      nz = p < 0.8 ? map(p, 0.08, 0.6) * 0.22 : map(p, 0.8, 0.95, 0.22, 0);
      cv.style.opacity = nz;
      const d = map(p, 0.8, 0.92);
      door.style.opacity = d;
      door.style.transform = `scale(${0.9 + d * 0.1})`;
    },
    tick() { if (active && nz > 0.01) noise(cv); },
  };
}

// =========================================================
// 14 · LOS DOMINÓS — se acomoda solo si no lo tocás
// =========================================================
function dominos(stage, { sound, tv, heart }) {
  const row = stage.querySelector('.dominos__row');
  const msg = stage.querySelector('.dominos__msg');
  const N = 15;
  const pieces = [];
  for (let i = 0; i < N; i++) {
    const d = document.createElement('div');
    d.className = 'domino' + (i === 0 ? ' domino--first' : '');
    if (i === 0) { d.setAttribute('role', 'button'); d.setAttribute('tabindex', '0'); d.setAttribute('aria-label', 'Primera ficha'); d.dataset.cursor = 'tocar'; }
    row.appendChild(d);
    pieces.push(d);
  }
  const first = pieces[0];
  let state = 'down'; // down → running → done
  let active = false;
  let p = 0;
  const reset = () => {
    state = 'down';
    gsap.killTweensOf(pieces);
    gsap.set(pieces, { rotate: 0 });
    gsap.set(first, { rotate: -90 });
    gsap.set(msg, { opacity: 0, y: 20 });
  };
  reset();
  function run(noisy) {
    if (state !== 'down') return;
    state = 'running';
    if (noisy) { tv.burst(0.8); heart.level += 0.3; }
    const tl = gsap.timeline({ onComplete: () => { state = 'done'; } });
    tl.to(first, { rotate: 0, duration: 0.7, ease: 'back.out(2)', onComplete: () => sound.click(0.2) })
      .add(() => {}, '+=0.4');
    pieces.forEach((d, i) => {
      tl.to(d, { rotate: 68 - i * 0.6, duration: 0.22, ease: 'power2.in', onComplete: () => sound.click(0.1 + i * 0.01) }, `>-0.11`);
    });
    tl.to(msg, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', onStart: () => sound.chime(392, 0.06) }, '+=0.2');
  }
  first.addEventListener('click', () => run(true));
  first.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(true); } });
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(v) {
      p = v;
      if (p < 0.03 && state !== 'down') reset();
      if (p > 0.72) run(false);
    },
    tick(dt, idle) { if (active && p > 0.12 && idle > 2.5) run(false); },
  };
}

// =========================================================
// 15 · EL FINAL — de pausa a inquieta; se abre; el túnel; el pedestal
// =========================================================
function final(stage, { sound }) {
  const a = stage.querySelector('.split__a');
  const b = stage.querySelector('.split__b');
  const cv = b.querySelector('canvas');
  const tunnel = stage.querySelector('.tunnel');
  const ped = stage.querySelector('.pedestal');
  const rings = [];
  for (let i = 0; i < 9; i++) { const r = document.createElement('i'); tunnel.appendChild(r); rings.push(r); }
  let active = false, t = 0, inq = 0, speed = 0;
  const once = crossing();
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(p) {
      inq = map(p, 0.04, 0.28);
      a.style.filter = `saturate(${1 - inq}) brightness(${1 - inq * 0.5})`;
      b.style.opacity = inq;
      const open = map(p, 0.3, 0.5);
      a.style.transform = `translateX(${-open * 140}%)`;
      b.style.transform = `translateX(${open * 140}%)`;
      tunnel.style.opacity = map(p, 0.36, 0.5) * (1 - map(p, 0.78, 0.9) * 0.6);
      speed = map(p, 0.4, 0.75);
      const pd = map(p, 0.72, 0.9);
      ped.style.opacity = pd;
      ped.style.transform = `translateY(${(1 - pd) * 60}px)`;
      stage.style.filter = `contrast(${1 + inq * 0.2})`;
      once('open', p, 0.32, () => sound.whoosh(1.2, 0.12, true));
      once('ped', p, 0.74, () => sound.chime(262, 0.06));
    },
    tick(dt) {
      if (!active) return;
      if (inq > 0.01) noise(cv);
      t += dt * (0.15 + speed * 0.6);
      rings.forEach((r, i) => {
        const k = (i / rings.length + t) % 1;
        r.style.transform = `scale(${0.2 + k * k * 9})`;
        r.style.opacity = (1 - k) * 0.9;
        r.style.borderColor = i % 3 === 0 ? 'rgba(215,255,58,.5)' : 'rgba(164,124,255,.6)';
      });
    },
  };
}

// =========================================================
// 16 · RUIDO — pantalla en ruido puro y el video de Pausa Inquieta
// =========================================================
function ruido(stage, { sound, stats }) {
  const cv = stage.querySelector('.static');
  const plate = stage.querySelector('.plate');
  const quote = stage.querySelector('.plate__quote');
  const { words } = split(quote, { chars: false });
  const nums = stage.querySelectorAll('[data-stat]');
  let active = false, sOp = 0, counted = false;
  const once = crossing();
  return {
    enter: () => { active = true; },
    leave: () => { active = false; },
    progress(p) {
      sOp = map(p, 0, 0.18);
      cv.style.opacity = sOp * (1 - map(p, 0.2, 0.4) * 0.65);
      const pl = map(p, 0.18, 0.3);
      plate.style.opacity = pl;
      plate.style.transform = `translate(-50%, calc(-50% + ${(1 - pl) * 30}px))`;
      const k = map(p, 0.28, 0.72);
      words.forEach((w, i) => { w.style.opacity = i / words.length < k ? 1 : 0.12; });
      once('static', p, 0.02, () => sound.static(1.4, 0.14));
      if (p > 0.7 && !counted) {
        counted = true;
        const s = stats();
        nums.forEach((n) => {
          const obj = { v: 0 };
          gsap.to(obj, { v: s[n.dataset.stat], duration: 1.4, ease: 'power2.out', onUpdate: () => { n.textContent = Math.round(obj.v); } });
        });
      }
      if (p < 0.6) counted = false;
    },
    tick() { if (active && sOp > 0.01) noise(cv); },
  };
}

export const SCENES = {
  puerta, lugar, inicio, proyector, cubos, corazon, pcs, luces,
  hoods1: hoods, hoods2: hoods, letras, cuadros, escalera, dominos, final, ruido,
};
