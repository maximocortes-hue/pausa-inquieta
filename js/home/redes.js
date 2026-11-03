// REDES — el final en positivo: un afiche de la marca pegado con cinta,
// una tira de la trama de círculos y el usuario de Instagram.
// El nombre de IG cambia de peso con el cursor (degradé de pesos, no todo en bold).
import { split, torn, finePointer } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;

export default function redes() {
  const sec = document.querySelector('.redes');
  const poster = sec.querySelector('.redes__poster');
  const strip = sec.querySelector('.redes__strip');
  torn(poster, { amp: 1.4, step: 2.2 });
  torn(strip, { amp: 3, step: 3 });

  gsap.from(poster, { yPercent: 8, rotate: 8, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 70%' } });
  gsap.from(strip, { xPercent: -30, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 70%' } });
  gsap.from(sec.querySelectorAll('.tape'), { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(3)', stagger: 0.12, delay: 0.6, scrollTrigger: { trigger: sec, start: 'top 70%' } });

  // Parallax suave con el mouse
  if (finePointer) {
    const qp = { x: gsap.quickTo(poster, 'x', { duration: 1.2, ease: 'power3.out' }), y: gsap.quickTo(poster, 'y', { duration: 1.2, ease: 'power3.out' }) };
    const qs = { x: gsap.quickTo(strip, 'x', { duration: 1.4, ease: 'power3.out' }), y: gsap.quickTo(strip, 'y', { duration: 1.4, ease: 'power3.out' }) };
    sec.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      qp.x(-nx * 18); qp.y(-ny * 14);
      qs.x(nx * 26); qs.y(ny * 10);
    });
  }

  // Nombre de IG
  const ig = sec.querySelector('.ig');
  const name = sec.querySelector('.ig__name');
  const { chars } = split(name);
  gsap.from([sec.querySelector('.ig__at'), ...chars], {
    yPercent: 110, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.035,
    scrollTrigger: { trigger: ig, start: 'top 85%' },
  });
  gsap.from(['.redes__head', '.foot'], { opacity: 0, y: 20, duration: 0.8, stagger: 0.12, scrollTrigger: { trigger: sec, start: 'top 60%' } });
  ig.addEventListener('pointermove', (e) => {
    chars.forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      c.style.fontWeight = Math.round(Math.max(1, 9 - d / 40)) * 100;
    });
  });
  ig.addEventListener('pointerleave', () => chars.forEach((c) => { c.style.fontWeight = ''; }));
  ig.addEventListener('mouseenter', () => sound.beep(520, 0.08, 0.03, 'sine'));
}
