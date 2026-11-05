// Lo hostil del paso a paso. Nadie lo avisa: a medida que avanzás,
// la interfaz pierde el color y PI crece y deja de ser Pausa para ser Inquieta.
// Lo hostil es SONORO: un zumbido y un ruido que crecen, un reloj que se acelera,
// el latido que se ensucia, chirridos y gruñidos cada vez más seguidos.
import { heart } from '../core/heart.js';
import { sound } from '../core/sound.js';
import { rand, clamp } from '../core/fx.js';

const gsap = window.gsap;
const state = { P: 0, gray: 0, on: true, cap: 1 };
let bw, amb = null;

export const hostile = {
  get P() { return state.P; },
  init() {
    bw = document.querySelector('.bw');
    let nextBad = 6, nextTick = 1, t = 0;
    gsap.ticker.add((time, dms) => {
      const dt = Math.min(0.1, dms / 1000);
      t += dt;
      const P = state.on ? state.P : 0;

      // Blanco y negro, sin que nadie lo diga
      const g = Math.min(state.gray, state.cap);
      bw.style.opacity = g > 0.01 ? 1 : 0;
      bw.style.setProperty('--g', g.toFixed(3));

      // PI: crece y deja de ser Pausa. Va y viene entre las dos, cada vez más Inquieta.
      const swing = P > 0.25 ? (Math.sin(t * (1.2 + P * 3)) * 0.5 + 0.5) * 0.35 * P : 0;
      heart.force = clamp(P * 0.75 + swing + (P > 0.88 ? 1 : 0));
      if (heart.el && !document.body.classList.contains('pi-talking')) gsap.set(heart.el, { scale: 1 + P * 0.65 });

      // Sonido de fondo que crece
      if (sound.enabled) {
        if (!amb) amb = sound.ambience();
        amb.set(P);
      } else if (amb) amb.stop();

      // Un reloj que se acelera
      nextTick -= dt;
      if (state.on && P > 0.3 && nextTick <= 0) {
        nextTick = 1.1 - P * 0.75;
        sound.tick(0.05 + P * 0.1, Math.random() < 0.5);
      }
      // Chirridos y gruñidos de PI, cada vez más seguido
      nextBad -= dt;
      if (state.on && P > 0.15 && nextBad <= 0) {
        nextBad = rand(4, 9) * (1.15 - P);
        const r = Math.random();
        if (r < 0.45) sound.glitch(0.04 + P * 0.05);
        else if (r < 0.75) sound.grumble(0.06 + P * 0.06);
        else sound.static(0.25 + P * 0.5, 0.05 + P * 0.08);
        if (heart.body) gsap.fromTo(heart.body, { x: -5 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,.3)' });
      }
    });
  },
  // progreso general (0..1) y gris (0..1)
  set(P, gray) { state.P = clamp(P); state.gray = clamp(gray); },
  enable(v) { state.on = v; },
  // tope de gris (la escalera de neón necesita conservar su color)
  grayCap(v) { state.cap = v; },
};
