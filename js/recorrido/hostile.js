// Lo hostil del paso a paso. Nadie lo avisa: a medida que avanzás,
// la interfaz pierde el color, aparecen huecos y partes que faltan,
// PI crece, deja de ser Pausa y se vuelve Inquieta, te molesta a vos y a tu mouse
// (porque estás viendo tu propio ruido). También guarda las palabras que escribiste:
// te siguen hasta el final.
import { heart } from '../core/heart.js';
import { sound } from '../core/sound.js';
import { rand, pick, clamp, reduced, finePointer } from '../core/fx.js';

const gsap = window.gsap;

const state = { P: 0, gray: 0, blur: 0, pressing: false, on: true };
let layer, bw, floatLayer, scenesEl;
const holes = [];
const floats = [];
let mouse = { x: innerWidth / 2, y: innerHeight / 2 };

function noiseFill(cv) {
  const x = cv.getContext('2d');
  const img = x.createImageData(cv.width, cv.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}

function tornClip() {
  const pts = [];
  const j = () => rand(0, 7);
  for (let x = 0; x <= 100; x += rand(4, 9)) pts.push(`${x}% ${j()}%`);
  for (let y = 0; y <= 100; y += rand(5, 12)) pts.push(`${100 - j()}% ${y}%`);
  for (let x = 100; x >= 0; x -= rand(4, 9)) pts.push(`${x}% ${100 - j()}%`);
  for (let y = 100; y >= 0; y -= rand(5, 12)) pts.push(`${j()}% ${y}%`);
  return `polygon(${pts.join(',')})`;
}

// Un hueco: un pedazo que falta (negro, papel o ruido), con borde rasgado
function makeHole() {
  const el = document.createElement('div');
  el.className = 'hole-x';
  const kind = pick(['ink', 'ink', 'noise', 'paper']);
  el.dataset.kind = kind;
  if (kind === 'noise') { const c = document.createElement('canvas'); c.width = 60; c.height = 30; el.appendChild(c); }
  layer.appendChild(el);
  const h = { el, kind, life: 0, ttl: rand(3, 7) };
  place(h);
  holes.push(h);
  return h;
}
function place(h) {
  const w = rand(6, 22), hh = rand(3, 13);
  // más hacia el centro de la pantalla, donde pasan las cosas
  Object.assign(h.el.style, {
    left: `${rand(4, 92 - w)}vw`, top: `${rand(10, 86 - hh)}vh`, width: `${w}vw`, height: `${hh}vh`,
    clipPath: tornClip(), transform: `rotate(${rand(-6, 6)}deg)`,
  });
  h.life = 0; h.ttl = rand(3, 7);
  gsap.fromTo(h.el, { opacity: 0, scaleY: 0.1 }, { opacity: 1, scaleY: 1, duration: 0.25, ease: 'steps(3)' });
}

export const hostile = {
  get P() { return state.P; },
  init({ scenes } = {}) {
    scenesEl = scenes;
    layer = document.querySelector('.hostile');
    bw = document.querySelector('.bw');
    floatLayer = document.querySelector('.floaters');
    window.addEventListener('pointermove', (e) => { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });
    const dot = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor-ring');
    let jx = 0, jy = 0, nextBad = 6, nextGhost = 8, t = 0;

    gsap.ticker.add((time, dms) => {
      const dt = Math.min(0.1, dms / 1000);
      t += dt;
      const P = state.on ? state.P : 0;

      // Blanco y negro, sin que nadie lo diga
      const g = state.gray;
      bw.style.opacity = g > 0.01 ? 1 : 0;
      bw.style.setProperty('--g', g.toFixed(3));

      // PI: crece y deja de ser Pausa. Va y viene entre las dos, cada vez más Inquieta.
      const swing = P > 0.25 ? (Math.sin(t * (1.2 + P * 3)) * 0.5 + 0.5) * 0.35 * P : 0;
      heart.force = clamp(P * 0.75 + swing + (P > 0.88 ? 1 : 0));
      if (heart.el && !document.body.classList.contains('pi-talking')) gsap.set(heart.el, { scale: 1 + P * 0.65 });

      // Huecos: cada vez más
      const want = state.on ? Math.floor(P * 9) : 0;
      while (holes.length < want) makeHole();
      while (holes.length > want) { const h = holes.pop(); gsap.to(h.el, { opacity: 0, duration: 0.2, onComplete: () => h.el.remove() }); }
      holes.forEach((h) => {
        h.life += dt;
        if (h.kind === 'noise') noiseFill(h.el.firstChild);
        if (h.life > h.ttl) place(h);
        else if (Math.random() < 0.01 * P) h.el.style.opacity = Math.random() < 0.5 ? 0.2 : 1;
      });

      // Tu mouse: tiembla y a veces lo empujan
      if (finePointer && dot && !reduced) {
        const amp = P * P * 9;
        jx += (rand(-amp, amp) - jx) * 0.3; jy += (rand(-amp, amp) - jy) * 0.3;
        dot.style.translate = `${jx.toFixed(1)}px ${jy.toFixed(1)}px`;
        if (ring) ring.style.translate = `${(jx * 2).toFixed(1)}px ${(jy * 2).toFixed(1)}px`;
      }

      // PI te tira mala onda: sonidos feos, cada vez más seguido
      nextBad -= dt;
      if (state.on && P > 0.2 && nextBad <= 0) {
        nextBad = rand(5, 10) * (1.2 - P);
        if (Math.random() < 0.6) sound.glitch(0.04 + P * 0.05); else sound.grumble(0.06 + P * 0.06);
        if (heart.body) gsap.fromTo(heart.body, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,.3)' });
      }
      // …y se te tira encima: una mitad Inquieta vuela hasta tu mouse
      nextGhost -= dt;
      if (state.on && P > 0.4 && nextGhost <= 0 && heart.el) {
        nextGhost = rand(6, 11) * (1.3 - P);
        hostile.ghost();
      }

      // Desenfoque (botones de las luces): sube mientras tocás, baja si soltás
      if (!state.pressing) state.blur = Math.max(0, state.blur - dt * 2.2);
      if (scenesEl) scenesEl.style.filter = state.blur > 0.05 ? `blur(${state.blur.toFixed(2)}px)` : '';

      // Las palabras que escribiste te siguen
      const W = innerWidth, H = innerHeight;
      floats.forEach((f) => {
        f.vx += (mouse.x - f.x) * 0.00014; f.vy += (mouse.y - f.y) * 0.00014;
        f.vx *= 0.993; f.vy *= 0.993;
        f.x += f.vx; f.y += f.vy; f.r += f.vr;
        const w = f.el.offsetWidth;
        if (f.x < 0 || f.x + w > W) { f.vx *= -1; f.x = clamp(f.x, 0, W - w); }
        if (f.y < 40 || f.y > H - 40) { f.vy *= -1; f.y = clamp(f.y, 40, H - 40); }
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg)`;
      });
    });
  },
  // progreso general (0..1) y gris (0..1)
  set(P, gray) { state.P = clamp(P); state.gray = clamp(gray); },
  enable(v) { state.on = v; },
  // el desenfoque al tocar
  press(v) { state.pressing = v; if (v) state.blur = Math.min(9, state.blur + 1.6); },
  // una mitad Inquieta que sale de PI y le pega al mouse
  ghost() {
    const r = heart.rect();
    const g = document.createElement('div');
    g.className = 'pi-ghost';
    g.innerHTML = '<canvas width="12" height="24"></canvas>';
    document.body.appendChild(g);
    noiseFill(g.firstChild);
    gsap.set(g, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    sound.glitch(0.06);
    gsap.timeline({ onComplete: () => g.remove() })
      .to(g, { x: mouse.x, y: mouse.y, rotate: rand(-180, 180), duration: 0.55, ease: 'power3.in', onUpdate: () => noiseFill(g.firstChild) })
      .add(() => {
        const dot = document.querySelector('.cursor-ring');
        if (dot) gsap.fromTo(dot, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,.3)' });
        heart.level += 0.04;
      })
      .to(g, { opacity: 0, scale: 2.4, duration: 0.3 });
  },
  // palabras físicas (de la pared de letras): flotan y te persiguen hasta el final
  addWord(text, x, y) {
    const s = document.createElement('span');
    s.textContent = text;
    s.style.fontSize = rand(26, 64) + 'px';
    s.style.fontWeight = pick([200, 400, 800, 900]);
    s.style.color = pick(['#d7ff3a', '#a47cff', '#ecebe5', '#ff4b2b', '#1f3cff']);
    floatLayer.appendChild(s);
    floats.push({ el: s, x, y, vx: rand(-3, 3), vy: rand(-4, -1.5), r: 0, vr: rand(-1, 1) });
    if (floats.length > 30) floats.shift().el.remove();
  },
  clearWords() { floats.splice(0).forEach((f) => gsap.to(f.el, { opacity: 0, scale: 0.4, duration: 0.6, onComplete: () => f.el.remove() })); },
};
