// CONTROLES — las teclas son letras de la trama del brandboard (tinta gastada,
// colores de la marca, giradas). Se dibujan al entrar, responden al teclado real,
// al mouse y al tacto. El semicírculo se mueve en un pedazo de afiche.
import { split, torn, pixels, orbit, rand, pick, WEIGHTS, reduced } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

export default function controles() {
  const sec = document.querySelector('.ctrl');
  const keys = [...sec.querySelectorAll('.key')];
  const glyphs = keys.map((k) => k.querySelector('.key__glyph'));
  const title = sec.querySelector('.ctrl__title');
  const kb = sec.querySelector('.kb');
  const arena = sec.querySelector('.arena');
  const player = sec.querySelector('.arena__player');
  const playerI = player.querySelector('i');
  const shadow = sec.querySelector('.arena__shadow');

  // Papeles rasgados
  torn(kb, { amp: 1.6, step: 2.6 });
  torn(arena, { amp: 1.4, step: 2.4 });

  // Cada letra con su giro y su desgaste propio (como la trama de letras)
  keys.forEach((k) => {
    k.style.setProperty('--r', `${rand(-14, 14).toFixed(1)}deg`);
    k.style.setProperty('--mx', `${Math.round(rand(0, 300))}px`);
    k.style.setProperty('--my', `${Math.round(rand(0, 300))}px`);
  });

  // Tramas dentro del mini escenario
  const apx = pixels(arena, { n: 12, size: [8, 30], colors: ['#1f3cff', '#a47cff', '#d7ff3a', '#ff4b2b'], area: [4, 6, 94, 90] });
  orbit(arena, { rx: 300, ry: 70, rot: -8, color: 'rgba(236,235,229,.55)', style: 'width:120%;left:-10%;top:30%;' });

  // ---- Entrada: las letras se dibujan (contorno) y después se llenan de tinta
  if (!reduced) {
    keys.forEach((k) => k.classList.add('is-drawing'));
    gsap.set(glyphs, { clipPath: 'inset(0 100% 0 0)' });
    gsap.set(sec.querySelectorAll('.kb__cap'), { opacity: 0, x: -10 });
    gsap.set(apx, { scale: 0 });
  }
  const { chars: tChars } = split(title);
  const BASE = 200;
  tChars.forEach((c) => { c.style.fontWeight = BASE; });
  if (!reduced) gsap.set(tChars, { yPercent: 100, opacity: 0 });

  ScrollTrigger.create({
    trigger: sec, start: 'top 65%', once: true,
    onEnter: () => {
      if (reduced) return;
      gsap.to(tChars, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05 });
      // el título busca su peso pasando por todos los intermedios
      tChars.forEach((c, i) => {
        const seq = [900, 700, 500, 300, 100, BASE];
        seq.forEach((w, j) => setTimeout(() => { c.style.fontWeight = w; }, 300 + i * 50 + j * 90));
      });
      glyphs.forEach((g, i) => {
        gsap.to(g, {
          clipPath: 'inset(0 0% 0 0)', duration: 0.7, delay: 0.3 + i * 0.14, ease: 'power2.inOut',
          onStart: () => sound.tick(0.08),
          onComplete: () => setTimeout(() => keys[i].classList.remove('is-drawing'), 120),
        });
      });
      gsap.to(sec.querySelectorAll('.kb__cap'), { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, delay: 1.2 });
      gsap.from(arena, { clipPath: 'inset(50% 50% 50% 50%)', duration: 1.2, ease: 'expo.inOut', delay: 0.4, clearProps: 'clipPath', onComplete: () => torn(arena, { amp: 1.4, step: 2.4 }) });
      gsap.to(apx, { scale: 1, duration: 0.25, ease: 'steps(2)', stagger: { each: 0.04, from: 'random' }, delay: 1 });
    },
  });

  // Título: el mouse arma un degradé de pesos (thin → light → regular → medium → bold → black)
  // alrededor del cursor, no todo en bold.
  const near = (e) => {
    const rects = tChars.map((c) => c.getBoundingClientRect());
    const R = Math.max(80, rects[0].width * 2.6);
    tChars.forEach((c, i) => {
      const r = rects[i];
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const k = Math.max(0, 1 - d / R);
      const w = k > 0 ? Math.round((100 + 800 * Math.pow(k, 1.4)) / 100) * 100 : BASE;
      c.style.fontWeight = Math.max(100, w);
    });
  };
  title.addEventListener('pointermove', near);
  title.addEventListener('pointerleave', () => tChars.forEach((c, i) => setTimeout(() => { c.style.fontWeight = BASE; }, i * 30)));
  title.addEventListener('click', () => tChars.forEach((c) => { c.style.fontWeight = pick(WEIGHTS); }));

  // ---- Teclado
  let inView = false;
  ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: (s) => { inView = s.isActive; } });

  const map = { w: 'w', a: 'a', s: 's', d: 'd', e: 'e', ' ': ' ', arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd' };
  const held = new Set();
  const keyEl = (k) => keys.find((el) => el.dataset.key === k);

  function down(k) {
    const el = keyEl(k);
    if (!el || held.has(k)) return;
    held.add(k);
    el.classList.add('is-down');
    sound.click(0.16);
    if (k === ' ') jump();
    if (k === 'e') interact();
  }
  function up(k) {
    held.delete(k);
    const el = keyEl(k);
    if (el) el.classList.remove('is-down');
  }

  window.addEventListener('keydown', (e) => {
    if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = map[e.key.toLowerCase()];
    if (!k) return;
    e.preventDefault();
    down(k);
  });
  window.addEventListener('keyup', (e) => {
    const k = map[e.key.toLowerCase()];
    if (k) up(k);
  });
  keys.forEach((el) => {
    const k = el.dataset.key;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(k); });
    el.addEventListener('pointerup', () => up(k));
    el.addEventListener('pointerleave', () => up(k));
    el.addEventListener('click', (e) => e.preventDefault());
  });

  // ---- Mini escenario
  const st = { x: 0.5, y: 0.55, vx: 0, vy: 0, z: 0, vz: 0, face: 1, air: false };
  function jump() { if (!st.air) { st.vz = 9; st.air = true; } }
  function interact() {
    const ring = document.createElement('div');
    ring.className = 'arena__ring';
    ring.style.left = `${st.x * 100}%`;
    ring.style.top = `${st.y * 100}%`;
    ring.style.borderColor = pick(['#a47cff', '#1f3cff', '#ff4b2b', '#d7ff3a']);
    arena.appendChild(ring);
    gsap.to(ring, { scale: 9, opacity: 0, duration: 0.9, ease: 'expo.out', onComplete: () => ring.remove() });
    sound.beep(pick([660, 880, 990]), 0.08, 0.04, 'sine');
  }

  gsap.ticker.add((t, dms) => {
    if (!inView && !held.size && !st.air) return;
    const dt = Math.min(0.05, dms / 1000);
    const ax = (held.has('d') ? 1 : 0) - (held.has('a') ? 1 : 0);
    const ay = (held.has('s') ? 1 : 0) - (held.has('w') ? 1 : 0);
    st.vx += ax * dt * 2.4; st.vy += ay * dt * 2.4;
    st.vx *= 0.9; st.vy *= 0.9;
    st.x = Math.max(0.08, Math.min(0.92, st.x + st.vx * dt * 6));
    st.y = Math.max(0.2, Math.min(0.84, st.y + st.vy * dt * 6));
    if (ax) st.face = ax > 0 ? -1 : 1;
    // salto: solo suena al aterrizar (una vez), nunca en loop
    if (st.air) {
      st.vz -= dt * 30;
      st.z += st.vz * dt;
      if (st.z <= 0) { st.z = 0; st.vz = 0; st.air = false; sound.tick(0.12, false); }
    }
    const W = arena.clientWidth, H = arena.clientHeight;
    const px = (st.x - 0.5) * W, py = (st.y - 0.5) * H;
    player.style.transform = `translate(${px}px, ${py - st.z * 14}px) scaleX(${st.face})`;
    shadow.style.transform = `translate(${px}px, ${py}px) scale(${1 - Math.min(0.6, st.z * 0.12)})`;
    const moving = Math.abs(st.vx) + Math.abs(st.vy);
    playerI.style.transform = `scaleY(${1 - Math.min(0.15, moving * 0.4)}) skewX(${-st.vx * 30}deg)`;
  });
}
