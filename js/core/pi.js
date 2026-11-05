// PI habla. Diálogos con el semicírculo en el centro (la pantalla se oscurece)
// y mensajes cortos desde la esquina.
// Cada letra aparece con ruido y se aclara; cada letra tiene su "bip" de voz.
// Las frases avanzan SOLO con un clic o una tecla.
import { heart } from './heart.js';
import { sound } from './sound.js';
import { reduced } from './fx.js';

const gsap = window.gsap;
const NOISE = '#%&@?¿!*/\\|PAUSAINQUIET0123456789';
const PAUSES = { ',': 160, '.': 260, '?': 260, '!': 240, ':': 220, '…': 320 };

let stage, dim, bubble, textEl, nextEl, quipEl;

function mount() {
  if (stage) return;
  stage = document.createElement('div');
  stage.className = 'pi-stage';
  stage.innerHTML = `
    <div class="pi-dim"></div>
    <div class="pi-bubble" role="dialog" aria-live="polite">
      <p class="pi-bubble__text"></p>
      <span class="pi-bubble__next" aria-hidden="true"></span>
    </div>`;
  document.body.appendChild(stage);
  dim = stage.querySelector('.pi-dim');
  bubble = stage.querySelector('.pi-bubble');
  textEl = stage.querySelector('.pi-bubble__text');
  nextEl = stage.querySelector('.pi-bubble__next');
  quipEl = document.createElement('div');
  quipEl.className = 'pi-quip';
  quipEl.setAttribute('role', 'status');
  document.body.appendChild(quipEl);
}

// ---------- Escribir una frase (con ruido que se aclara) ----------
// Devuelve { done: Promise, finish(): void }
function typeInto(el, text, { rough = () => 0, onWord, speed = 34 } = {}) {
  el.textContent = '';
  const spans = [];
  // palabras y espacios (las palabras no se cortan al final de línea)
  text.split(/(\s+)/).forEach((tok) => {
    if (!tok) return;
    if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(' ')); return; }
    const w = document.createElement('span');
    w.className = 'pi-w';
    [...tok].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'pi-ch';
      s.dataset.ch = ch;
      s.textContent = ch;
      w.appendChild(s);
      spans.push(s);
    });
    el.appendChild(w);
  });
  let i = 0;
  let timer = 0;
  let finished = false;
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const clearChar = (s) => { s.textContent = s.dataset.ch; s.classList.add('is-clear'); };
  const wordEnd = (k) => {
    const s = spans[k];
    const next = spans[k + 1];
    return !next || next.parentElement !== s.parentElement;
  };
  const step = () => {
    if (finished) return;
    if (i >= spans.length) { finished = true; resolve(); return; }
    const s = spans[i];
    s.classList.add('is-in');
    if (!reduced) {
      s.textContent = NOISE[Math.floor(Math.random() * NOISE.length)];
      setTimeout(() => { if (!s.classList.contains('is-clear')) clearChar(s); }, 110);
    } else clearChar(s);
    if (/[\p{L}\p{N}]/u.test(s.dataset.ch) && i % 2 === 0) sound.voice(rough());
    if (wordEnd(i) && onWord) onWord(s.parentElement.textContent.replace(/[^\p{L}\p{N}]/gu, ''), s.parentElement);
    const p = PAUSES[s.dataset.ch] || 0;
    i++;
    timer = setTimeout(step, speed + p);
  };
  step();
  return {
    done,
    finish() {
      if (finished) return;
      clearTimeout(timer);
      spans.slice(i).forEach((s, k) => {
        s.classList.add('is-in');
        if (wordEnd(i + k) && onWord) onWord(s.parentElement.textContent.replace(/[^\p{L}\p{N}]/gu, ''), s.parentElement);
      });
      spans.forEach(clearChar);
      i = spans.length;
      finished = true;
      resolve();
    },
  };
}

// Espera un clic / tecla para avanzar
function waitAdvance(target = window) {
  return new Promise((res) => {
    const off = () => { target.removeEventListener('pointerdown', go); window.removeEventListener('keydown', key); };
    const go = (e) => { if (e && e.button > 0) return; off(); res(); };
    const key = (e) => {
      if (['Enter', ' ', 'ArrowRight', 'ArrowDown', 'e', 'E'].includes(e.key)) { e.preventDefault(); off(); res(); }
    };
    // pequeña demora para no tomar el mismo clic que terminó de escribir
    setTimeout(() => { target.addEventListener('pointerdown', go); window.addEventListener('keydown', key); }, 120);
  });
}

// ---------- Posiciones de PI ----------
function centerPose() {
  const mobile = innerWidth < 760;
  const r0 = heart.el.getBoundingClientRect();
  // posición "en reposo" (esquina): la tomamos sin transform
  const base = { x: r0.left - (gsap.getProperty(heart.el, 'x') || 0), y: r0.top - (gsap.getProperty(heart.el, 'y') || 0), w: r0.width / (gsap.getProperty(heart.el, 'scale') || 1) };
  const scale = mobile ? 2.4 : 3.4;
  const size = base.w * scale;
  const cx = mobile ? innerWidth / 2 : innerWidth * 0.3;
  const cy = mobile ? innerHeight * 0.3 : innerHeight * 0.48;
  return { x: cx - base.x - base.w / 2, y: cy - base.y - base.w / 2, scale, size, cx, cy, mobile };
}

function placeBubble(pose) {
  if (pose.mobile) {
    Object.assign(bubble.style, { left: '16px', right: '16px', top: `${pose.cy + pose.size / 2 + 22}px`, width: 'auto', transform: '' });
  } else {
    Object.assign(bubble.style, { left: `${pose.cx + pose.size / 2 + 34}px`, right: 'auto', top: `${pose.cy}px`, width: `min(560px, ${innerWidth - (pose.cx + pose.size / 2 + 34) - 40}px)`, transform: 'translateY(-50%)' });
  }
}

export const pi = {
  // Diálogo modal. lines: [{ text, rough?, onStart?, onWord?(word, el), onEnd? }]
  async talk(lines, { lenis, onClose } = {}) {
    mount();
    lenis && lenis.stop();
    document.body.classList.add('pi-talking');
    heart.watch(false);
    heart.show(true, 0.2);
    const pose = centerPose();
    placeBubble(pose);
    stage.classList.add('is-on');
    gsap.to(dim, { opacity: 1, duration: 0.9, ease: 'power2.out' });
    // Entrada fluida: un salto en arco desde la esquina, estirándose y aplastándose
    sound.whoosh(0.7, 0.08, true);
    await new Promise((res) => {
      gsap.timeline({ onComplete: res })
        .to(heart.el, { x: pose.x * 0.45, y: pose.y - innerHeight * 0.22, scale: pose.scale * 0.7, rotate: -25, duration: 0.45, ease: 'power2.out' })
        .to(heart.body, { scaleX: 0.8, scaleY: 1.2, duration: 0.25 }, 0)
        .to(heart.el, { x: pose.x, y: pose.y, scale: pose.scale, rotate: 0, duration: 0.55, ease: 'power3.in' })
        .to(heart.body, { scaleX: 1.25, scaleY: 0.78, duration: 0.12, ease: 'power2.out' })
        .add(() => sound.thud(0.25))
        .to(heart.body, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, .35)' });
    });
    gsap.fromTo(bubble, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });

    for (const line of lines) {
      line.onStart && line.onStart();
      nextEl.classList.remove('is-on');
      gsap.fromTo(heart.body, { scaleY: 0.92 }, { scaleY: 1, duration: 0.4, ease: 'elastic.out(1,.4)' });
      const t = typeInto(textEl, line.text, { rough: () => (line.rough !== undefined ? line.rough : heart.mix), onWord: line.onWord });
      const skip = waitAdvance(stage).then(() => t.finish());
      await t.done;
      nextEl.classList.add('is-on');
      line.onEnd && line.onEnd();
      // si el clic de "adelantar" ya se usó, esperamos otro para pasar de frase
      await Promise.race([skip.then(() => waitAdvance(stage)), waitAdvance(stage)]);
      sound.click(0.06);
    }

    // Salida: vuelve a su esquina
    gsap.to(bubble, { opacity: 0, duration: 0.25 });
    gsap.to(dim, { opacity: 0, duration: 0.8, delay: 0.3 });
    sound.whoosh(0.6, 0.06, false);
    await new Promise((res) => {
      gsap.timeline({ onComplete: res })
        .to(heart.el, { x: pose.x * 0.5, y: pose.y * 0.4 - innerHeight * 0.18, scale: pose.scale * 0.5, rotate: 20, duration: 0.45, ease: 'power2.out' })
        .to(heart.el, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.5, ease: 'power3.in' })
        .to(heart.body, { scaleX: 1.2, scaleY: 0.8, duration: 0.1 })
        .to(heart.body, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, .4)' });
    });
    stage.classList.remove('is-on');
    textEl.textContent = '';
    document.body.classList.remove('pi-talking');
    heart.watch(true);
    lenis && lenis.start();
    onClose && onClose();
  },

  // Mensaje corto desde donde está PI, sin oscurecer. Se va solo.
  quip(text, { ms = 2800, rough } = {}) {
    mount();
    const r = heart.rect();
    const mobile = innerWidth < 760;
    quipEl.classList.toggle('is-right', mobile);
    if (mobile) Object.assign(quipEl.style, { left: 'auto', right: `${innerWidth - r.left + 10}px`, top: 'auto', bottom: `${innerHeight - r.bottom}px` });
    else Object.assign(quipEl.style, { left: `${r.right + 14}px`, right: 'auto', top: 'auto', bottom: `${innerHeight - r.bottom - 4}px` });
    gsap.killTweensOf(quipEl);
    gsap.set(quipEl, { autoAlpha: 1, y: 6 });
    gsap.to(quipEl, { y: 0, duration: 0.3 });
    gsap.fromTo(heart.body, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,.35)' });
    const t = typeInto(quipEl, text, { rough: () => (rough !== undefined ? rough : heart.mix) });
    clearTimeout(quipEl._t);
    t.done.then(() => { quipEl._t = setTimeout(() => gsap.to(quipEl, { autoAlpha: 0, duration: 0.4 }), ms); });
    return t;
  },

  // Escribe en cualquier elemento (lo usa el paso a paso para que PI narre)
  write(el, text, opts) { return typeInto(el, text, opts); },
};
