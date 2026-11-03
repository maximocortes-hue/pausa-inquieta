// Piezas de interfaz compartidas entre páginas:
// scroll suave (Lenis), cursor, transición de ruido de tele, gate de entrada, nav.

import { sound, savedPref } from './sound.js';
import { finePointer, reduced } from './fx.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

// ---------- Scroll ----------
export function initScroll() {
  const lenis = new window.Lenis({
    lerp: reduced ? 1 : 0.085,
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.8, force: true, easing: (t) => 1 - Math.pow(1 - t, 4) });
  });
  return lenis;
}

// ---------- Cursor ----------
export function initCursor() {
  if (!finePointer) { document.documentElement.classList.add('no-cursor'); return; }
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor';
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span></span>';
  const label = ring.querySelector('span');
  document.body.append(dot, ring);
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const rp = { ...pos };
  window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
  gsap.ticker.add(() => {
    rp.x += (pos.x - rp.x) * 0.18;
    rp.y += (pos.y - rp.y) * 0.18;
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    ring.style.transform = `translate(${rp.x}px, ${rp.y}px)`;
  });
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('a, button, [data-hover], [data-cursor]');
    ring.classList.toggle('is-hover', !!t);
    const txt = t && t.dataset.cursor;
    ring.classList.toggle('is-label', !!txt);
    label.textContent = txt || '';
  });
  window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 }));
  document.addEventListener('mouseenter', () => gsap.to([dot, ring], { autoAlpha: 1, duration: 0.2 }));
}

// ---------- Ruido de tele ----------
export const tv = (() => {
  let el, cv, ctx, running = false;
  const PAL = ['#d7ff3a', '#1f3cff', '#a47cff', '#ff4b2b'];
  function mount() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'tv';
    el.innerHTML = '<canvas width="160" height="100"></canvas>';
    document.body.appendChild(el);
    cv = el.querySelector('canvas');
    ctx = cv.getContext('2d');
  }
  function frame(colorBands = true) {
    const img = ctx.createImageData(cv.width, cv.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (colorBands) {
      const n = Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = PAL[Math.floor(Math.random() * PAL.length)];
        ctx.globalAlpha = 0.85;
        ctx.fillRect(0, Math.random() * cv.height, cv.width, 1 + Math.random() * 5);
      }
      ctx.globalAlpha = 1;
    }
  }
  function loop() { if (!running) return; frame(); requestAnimationFrame(loop); }
  return {
    // Ráfaga de ruido: dur en segundos
    burst(dur = 0.5, { opacity = 1, snd = true } = {}) {
      mount();
      running = true; loop();
      if (snd) sound.static(dur, 0.16);
      return gsap.timeline({ onComplete: () => { running = false; } })
        .set(el, { opacity, scaleY: 0.02 })
        .to(el, { scaleY: 1, duration: 0.08, ease: 'power2.out' })
        .to(el, { opacity: 0, duration: 0.12, ease: 'steps(3)' }, dur);
    },
    // Salir de la página con ruido
    out(href) {
      mount();
      el.classList.add('is-on');
      running = true; loop();
      sound.static(0.7, 0.2);
      gsap.timeline({ onComplete: () => { location.href = href; } })
        .set(el, { opacity: 1, scaleY: 0.01 })
        .to(el, { scaleY: 1, duration: 0.25, ease: 'power3.in' })
        .to({}, { duration: 0.35 });
    },
    // Entrar a la página desde el ruido
    in() {
      mount();
      running = true; loop();
      gsap.timeline({ onComplete: () => { running = false; el.classList.remove('is-on'); } })
        .set(el, { opacity: 1, scaleY: 1 })
        .to(el, { scaleY: 0.005, duration: 0.5, ease: 'power3.inOut', delay: 0.2 })
        .to(el, { opacity: 0, duration: 0.15 });
    },
    setStatic(on, opacity = 1) {
      mount();
      if (on) { running = true; loop(); gsap.to(el, { opacity, scaleY: 1, duration: 0.3 }); }
      else gsap.to(el, { opacity: 0, duration: 0.4, onComplete: () => { running = false; } });
    },
  };
})();

// Links que llevan a otra página: transición con ruido
export function bindPageLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-page]');
    if (!a) return;
    e.preventDefault();
    tv.out(a.getAttribute('href'));
  });
}

// ---------- Gate de entrada ----------
// Una sola invitación: conocer tu ruido. Entrar es entrar con sonido
// (el ruido es la tesis); después se puede apagar desde la nav.
export function gate({ force = false } = {}) {
  const el = document.querySelector('.gate');
  let entered = false;
  try { entered = sessionStorage.getItem('pi-entered') === '1'; } catch (e) { /* ignore */ }
  if (!el) return Promise.resolve();
  if (entered && !force) {
    el.remove();
    // Reactivar sonido con el primer gesto (salvo que lo hayan apagado desde la nav)
    if (savedPref() !== 'off') {
      const once = () => { sound.enable(); window.removeEventListener('pointerdown', once); window.removeEventListener('keydown', once); };
      window.addEventListener('pointerdown', once);
      window.addEventListener('keydown', once);
    }
    return Promise.resolve();
  }
  document.body.classList.add('is-locked');
  return new Promise((resolve) => {
    const btn = el.querySelector('[data-enter]');
    btn.addEventListener('click', async () => {
      await sound.enable();
      sound.settle(0.08);
      try { sessionStorage.setItem('pi-entered', '1'); } catch (e) { /* ignore */ }
      gsap.to(el, {
        clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut',
        onComplete: () => { el.remove(); document.body.classList.remove('is-locked'); resolve(); },
      });
    }, { once: true });
  });
}

// ---------- Nav ----------
export function initNav(lenis) {
  const btn = document.querySelector('[data-sound-toggle]');
  if (btn) {
    const paint = () => {
      btn.classList.toggle('is-on', sound.enabled);
      btn.querySelector('.state').textContent = sound.enabled ? 'On' : 'Off';
    };
    btn.addEventListener('click', () => { sound.toggle(); setTimeout(paint, 30); });
    sound.onChange(paint);
    paint();
  }

  // Menú móvil
  const menuBtn = document.querySelector('.nav__menu');
  const menu = document.querySelector('.menu');
  if (menuBtn && menu) {
    let open = false;
    const set = (v) => {
      open = v;
      menuBtn.querySelector('.state').textContent = v ? 'Cerrar' : 'Menú';
      if (v) { lenis && lenis.stop(); gsap.set(menu, { visibility: 'visible' }); }
      gsap.to(menu, {
        clipPath: v ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut',
        onComplete: () => { if (!v) { gsap.set(menu, { visibility: 'hidden' }); lenis && lenis.start(); } },
      });
      if (v) gsap.from(menu.children, { yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.6, delay: 0.25, ease: 'power3.out' });
    };
    menuBtn.addEventListener('click', () => set(!open));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  }

  // Link activo según sección
  document.querySelectorAll('.nav__links a[href^="#"]').forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => a.classList.toggle('is-active', self.isActive),
    });
  });
}
