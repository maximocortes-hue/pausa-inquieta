// RECORRIDO (intro) — el storytelling se calma a medida que lo leés:
// cada palabra entra con otro peso y se asienta. Al final, el botón para iniciar.
import { split, torn, pixels, finePointer } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;

export default function story() {
  const sec = document.querySelector('.story');
  sec.querySelectorAll('.ph').forEach((p) => torn(p, { amp: 2.4 }));

  // Cada palabra entra con un peso distinto (thin, light, medium, bold, black…)
  // y se asienta en el suyo: no todo en bold.
  const FROM = [100, 200, 300, 500, 600, 700, 800, 900];
  sec.querySelectorAll('.st').forEach((line) => {
    const { words } = split(line, { chars: false });
    const base = line.classList.contains('st--key') ? 300 : 400;
    words.forEach((w) => { w.dataset.from = FROM[Math.floor(Math.random() * FROM.length)]; });
    gsap.fromTo(words, { opacity: 0.12, fontWeight: (i, el) => +el.dataset.from }, {
      opacity: 1, fontWeight: base, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: line, start: 'top 88%', end: 'top 48%', scrub: true },
    });
  });

  const px = pixels(sec.querySelector('.story__tramas'), { n: 26, size: [12, 64], colors: ['#1f3cff', '#a47cff', '#d7ff3a', '#ecebe5', '#ff4b2b'], area: innerWidth < 760 ? [55, 4, 96, 40] : [66, 8, 98, 92] });
  gsap.from(px, { scale: 0, duration: 0.25, ease: 'steps(2)', stagger: { each: 0.03, from: 'random' }, scrollTrigger: { trigger: sec, start: 'top 60%' } });
  gsap.to(px, { opacity: () => Math.random(), duration: 0.12, repeat: -1, repeatRefresh: true, repeatDelay: 1.4, ease: 'steps(1)', stagger: { each: 0.4, from: 'random' } });
  gsap.from(sec.querySelector('.story__head'), { opacity: 0, x: -30, duration: 0.8, scrollTrigger: { trigger: sec, start: 'top 60%' } });

  // Botón Iniciar: aparece, late y es magnético
  const start = sec.querySelector('.start');
  gsap.from(start, { scale: 0, rotate: -90, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: start, start: 'top 90%' } });
  gsap.to(start.querySelector('.start__half--a'), { scale: 1.05, duration: 0.14, repeat: -1, yoyo: true, repeatDelay: 0.9, ease: 'power2.out' });
  start.addEventListener('mouseenter', () => sound.beep(440, 0.1, 0.035, 'sine'));
  if (finePointer) {
    const qx = gsap.quickTo(start, 'x', { duration: 0.6, ease: 'power3.out' });
    const qy = gsap.quickTo(start, 'y', { duration: 0.6, ease: 'power3.out' });
    sec.addEventListener('pointermove', (e) => {
      const r = start.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < r.width) { qx(dx * 0.3); qy(dy * 0.3); } else { qx(0); qy(0); }
    });
  }
}
