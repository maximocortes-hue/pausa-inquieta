// QUIÉNES SOMOS — el scroll se hace largo (algo insiste).
// Mientras scrolleás, algunas letras cambian levemente de peso.
// Al final, el texto vuelve a su peso normal y el scroll se libera.
import { split, torn, pick, clamp, reduced } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

export default function somos(lenis) {
  const sec = document.querySelector('.somos');
  const lines = [...sec.querySelectorAll('.s-line')];
  const meter = sec.querySelector('.somos__meter i');
  const dot = sec.querySelector('.somos__dot');
  sec.querySelectorAll('.ph').forEach((p) => torn(p, { amp: 1.6, step: 2.6 }));

  const data = lines.map((l) => {
    const big = l.classList.contains('s-line--big') || l.classList.contains('s-line--close');
    const base = big ? 300 : 400;
    const { chars } = split(l);
    chars.forEach((c) => { c.style.fontWeight = base; });
    return { el: l, chars, base };
  });

  const N = data.length;
  const CALM = 0.9; // a partir de acá todo se calma
  let cur = 0;
  let progress = 0;
  let active = false;
  gsap.set(data[0].el, { visibility: 'visible' });

  function show(i, dir) {
    const out = data[cur];
    const inn = data[i];
    gsap.killTweensOf([out.chars, inn.chars]);
    gsap.to(out.chars, {
      opacity: 0, yPercent: dir > 0 ? -50 : 50, duration: 0.35, ease: 'power2.in',
      stagger: { each: 0.004, from: 'random' },
      onComplete: () => gsap.set(out.el, { visibility: 'hidden' }),
    });
    gsap.set(inn.el, { visibility: 'visible' });
    gsap.fromTo(inn.chars, { opacity: 0, yPercent: dir > 0 ? 60 : -60 }, {
      opacity: 1, yPercent: 0, duration: 0.55, ease: 'expo.out', delay: 0.12,
      stagger: { each: 0.006, from: 'random' },
    });
    inn.chars.forEach((c) => { c.style.fontWeight = inn.base; });
    sound.tick(0.14);
    cur = i;
  }
  // Un peso cercano al base (leve): ±100 / ±200, nunca extremos
  const near = (base) => base + pick([-200, -100, 100, 200]);

  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onToggle: (self) => { active = self.isActive; },
    onUpdate: (self) => {
      progress = self.progress;
      meter.style.transform = `scaleX(${progress})`;
      const idx = Math.min(N - 1, Math.floor((progress / CALM) * N));
      if (idx !== cur) show(idx, idx > cur ? 1 : -1);
    },
  });

  // Collage: se mueve con el progreso
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1 } })
    .to('.somos__ph1', { yPercent: -12, ease: 'none' }, 0)
    .to('.somos__ph2', { yPercent: 40, rotate: -4, ease: 'none' }, 0)
    .to('.somos__c1', { xPercent: -20, yPercent: 30, ease: 'none' }, 0)
    .to('.somos__semi', { rotate: 180, xPercent: -60, ease: 'none' }, 0);

  // Entrada del collage
  gsap.from(sec.querySelectorAll('.somos__collage > *'), {
    scale: 0.6, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: sec, start: 'top 70%' },
  });

  // Algo insiste: mientras scrolleás, unas pocas letras cambian de peso, apenas.
  // Se mueven lento (transición en CSS) y vuelven solas a su peso.
  let acc = 0;
  gsap.ticker.add((t, dms) => {
    if (!active || reduced) return;
    const v = Math.abs(lenis.velocity || 0);
    const calm = progress >= CALM;
    const { chars, base } = data[cur];
    acc += dms / 1000;
    if (acc < 0.12) return; // pocas veces por segundo
    acc = 0;
    const I = calm ? 0 : clamp(v / 30);
    const n = I > 0.05 ? 1 + Math.round(I * 2) : 0; // 1 a 3 letras por vez
    for (let k = 0; k < n; k++) {
      const c = chars[Math.floor(Math.random() * chars.length)];
      if (c.textContent.trim()) c.style.fontWeight = near(base);
    }
    // las que estaban movidas vuelven a su peso
    for (let i = 0; i < chars.length; i++) {
      if (+chars[i].style.fontWeight !== base && Math.random() < (calm ? 0.6 : 0.18)) chars[i].style.fontWeight = base;
    }
    dot.style.transform = I > 0.3 ? `translate(${(Math.random() - .5) * I * 8}px, ${(Math.random() - .5) * I * 8}px)` : '';
  });
}
