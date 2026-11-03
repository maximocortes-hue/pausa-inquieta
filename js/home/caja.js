// LA CAJA — escena 3D que se carga recién cuando te acercás.
import { WEIGHTS, pixels, torn } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

// Captions que aparecen según el progreso (data-at="desde,hasta")
export function captions(root) {
  const caps = [...root.querySelectorAll('.cap')].map((el) => {
    const [a, b] = el.dataset.at.split(',').map(Number);
    return { el, a, b, on: false };
  });
  return (p) => caps.forEach((c) => {
    const on = p >= c.a && p < c.b;
    if (on === c.on) return;
    c.on = on;
    gsap.to(c.el, on
      ? { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', overwrite: true }
      : { opacity: 0, y: -14, duration: 0.3, ease: 'power2.in', overwrite: true });
  });
}

export default function caja() {
  const sec = document.querySelector('.caja');
  const stick = sec.querySelector('.caja__stick');
  const canvas = sec.querySelector('.caja__canvas');
  const bar = sec.querySelector('.bar-progress i');
  const word = sec.querySelector('.caja__word');
  const setCaps = captions(sec);
  sec.querySelectorAll('.ph').forEach((ph) => torn(ph, { amp: 2.2 }));
  const px =pixels(sec.querySelector('.caja__tramas'), { n: 12, colors: ['#1f3cff', '#a47cff', '#d7ff3a'], area: [4, 10, 96, 90] });
  gsap.set(px, { scale: 0 });

  let scene = null;
  let p = 0;

  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    import('../three/box.js')
      .then((m) => m.createBoxScene(canvas, {
        mode: 'intro',
        onLand: () => {
          sound.thud(0.5);
          gsap.fromTo(stick, { y: 0 }, { y: 6, duration: 0.05, repeat: 5, yoyo: true, ease: 'none', clearProps: 'y' });
          gsap.fromTo(px, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'steps(3)', stagger: { each: 0.02, from: 'random' } });
        },
      }))
      .then((s) => { scene = s; s.setProgress(p); })
      .catch((err) => console.warn('3D no disponible', err));
  }, { rootMargin: '120% 0px' });
  io.observe(sec);

  let lastW = -1;
  let opened = false;
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => {
      p = self.progress;
      if (scene) scene.setProgress(p);
      setCaps(p);
      bar.style.transform = `scaleY(${p})`;
      const w = WEIGHTS[Math.min(8, Math.floor(p * 9))];
      if (w !== lastW) { word.style.fontWeight = w; lastW = w; }
      if (p > 0.4 && !opened) { opened = true; sound.whoosh(0.6, 0.08); }
      if (p < 0.3) opened = false;
    },
  });

  gsap.from(sec.querySelector('.caja__head'), { opacity: 0, x: -30, duration: 0.8, scrollTrigger: { trigger: sec, start: 'top 60%' } });
}
