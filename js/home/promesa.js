// LA PROMESA — la frase solo se arma si dejás de hacer.
// Scrollear o clickear la desarma; quedarte quieto la completa.
import { split, torn, WEIGHTS, pick, rand, reduced } from '../core/fx.js';
import { activity } from '../core/heart.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

export default function promesa(lenis) {
  const sec = document.querySelector('.promesa');
  const text = sec.querySelector('.promesa__text');
  const hint = sec.querySelector('.promesa__hint');
  const halo = sec.querySelector('.promesa__halo');
  const { chars } = split(text);
  const mobile = innerWidth < 760;
  const seeds = chars.map(() => ({
    x: rand(-1, 1) * (mobile ? 40 : 34), // vw
    y: rand(-1, 1) * 34, // vh
    r: rand(-90, 90),
    w: pick(WEIGHTS),
  }));

  let a = reduced ? 1 : 0;
  let active = false;
  let done = false;

  ScrollTrigger.create({
    trigger: sec, start: 'top 20%', end: 'bottom 80%',
    onToggle: (s) => { active = s.isActive; },
  });

  sec.querySelectorAll('.ph').forEach((p) => torn(p, { amp: 2.4 }));
  gsap.to('.promesa__ph', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.promesa__ph2', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });

  gsap.from(sec.querySelector('.promesa__label'), {
    opacity: 0, x: -30, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: sec, start: 'top 60%' },
  });

  // pitido suave de "no hagas nada"
  gsap.to(hint, { opacity: 0.25, duration: 0.6, repeat: -1, yoyo: true, ease: 'steps(2)' });

  // Una vez armada, la frase queda armada si seguís bajando.
  // Solo se vuelve a desarmar si subís (volvés atrás).
  let locked = false;
  gsap.ticker.add((t, dms) => {
    const dt = Math.min(0.1, dms / 1000);
    if (active && !reduced) {
      const vel = lenis.velocity || 0;
      const v = Math.abs(vel);
      if (locked) {
        if (vel < -0.6) { locked = false; a -= dt * 0.9; }
      } else {
        if (v > 0.6) a -= dt * 0.9;
        else if (activity.idle > 0.8) a += dt * 0.5;
        else a += dt * 0.1;
      }
      a = Math.max(0, Math.min(1, a));
      if (a >= 0.999 && !done) { done = true; locked = true; sound.settle(0.09); }
      if (a < 0.6) done = false;
    }
    const e = 1 - Math.pow(1 - a, 3);
    for (let i = 0; i < chars.length; i++) {
      const s = seeds[i];
      const k = 1 - e;
      chars[i].style.transform = k > 0.001
        ? `translate3d(${s.x * k}vw, ${s.y * k}vh, 0) rotate(${s.r * k}deg)`
        : '';
      chars[i].style.opacity = (0.18 + 0.82 * e).toFixed(3);
      if (a < 0.98) { if (Math.random() < (1 - a) * 0.25) chars[i].style.fontWeight = pick(WEIGHTS); }
      else chars[i].style.fontWeight = 300;
    }
    halo.style.opacity = e.toFixed(3);
    hint.style.visibility = a > 0.97 ? 'hidden' : 'visible';
  });
}
