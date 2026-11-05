// QUÉ TE LLEVÁS — el doble fondo, el mensaje y el llavero.
// Acá la página pasa de negativo a positivo, como el mapping del final.
import { split, torn, WEIGHTS, pick } from '../core/fx.js';
import { sound } from '../core/sound.js';
import { heart, activity } from '../core/heart.js';
import { captions } from './caja.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

function lazy(el, fn) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: '120% 0px' });
  io.observe(el);
}

export default function llevas() {
  // ---------- Doble fondo (3D)
  const sec = document.querySelector('.llevas');
  const canvas = sec.querySelector('.llevas__canvas');
  const bar = sec.querySelector('.bar-progress i');
  const setCaps = captions(sec);
  let scene = null;
  let p = 0;
  lazy(sec, () => {
    import('../three/box.js')
      .then((m) => m.createBoxScene(canvas, { mode: 'reveal' }))
      .then((s) => { scene = s; s.setProgress(p); })
      .catch((err) => console.warn('3D no disponible', err));
  });
  let revealed = false;
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => {
      p = self.progress;
      if (scene) scene.setProgress(p);
      setCaps(p);
      bar.style.transform = `scaleY(${p})`;
      if (p > 0.16 && !revealed) { revealed = true; sound.reveal(0.09); }
      if (p < 0.08) revealed = false;
    },
  });
  // Tramas del fondo: rasgadas y con un poco de parallax
  sec.querySelectorAll('.ph').forEach((ph) => torn(ph, { amp: 2 }));
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1 } })
    .to('.llevas__city', { yPercent: -10, ease: 'none' }, 0)
    .to('.llevas__semi', { rotate: 270, ease: 'none' }, 0)
    .to('.llevas__tramas', { opacity: 0.25, ease: 'none' }, 0.75);
  // Negativo → positivo
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'bottom 150%', end: 'bottom bottom', scrub: true } })
    .to(sec, { backgroundColor: '#ecebe5', color: '#0b0b0b', ease: 'none' }, 0)
    .to(sec.querySelector('.bar-progress'), { backgroundColor: 'rgba(11,11,11,.14)', ease: 'none' }, 0);

  // ---------- Mensaje
  const msg = document.querySelector('.msg');
  const a = split(msg.querySelector('.msg__a'));
  const b = split(msg.querySelector('.msg__b'));
  const restless = a.words.filter((w) => w.classList.contains('em')).flatMap((w) => [...w.querySelectorAll('.ch')]);
  [a, b].forEach(({ words }, i) => {
    gsap.fromTo(words, { opacity: 0.1, yPercent: 30 }, {
      opacity: 1, yPercent: 0, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: msg.children[i + 1], start: 'top 85%', end: 'top 40%', scrub: true },
    });
  });
  const quieto = b.words.find((w) => w.classList.contains('strong'));
  gsap.from(quieto, { backgroundSize: '0% 100%', scrollTrigger: { trigger: quieto, start: 'top 70%' } });

  let msgIn = false;
  ScrollTrigger.create({ trigger: msg, start: 'top bottom', end: 'bottom top', onToggle: (s) => { msgIn = s.isActive; } });
  // "haciendo / produciendo / ocupando" no se quedan quietas — salvo que vos sí
  gsap.ticker.add(() => {
    if (!msgIn) return;
    const calm = activity.idle > 2;
    const prob = calm ? 0 : 0.12 + heart.level * 0.5;
    restless.forEach((c) => {
      if (Math.random() < prob) c.style.fontWeight = pick(WEIGHTS);
      else if (calm && Math.random() < 0.1) c.style.fontWeight = 300;
    });
  });
  gsap.from(msg.querySelectorAll('.msg__tramas > *'), { scale: 0, duration: 1, ease: 'back.out(2)', stagger: 0.15, scrollTrigger: { trigger: msg, start: 'top 70%' } });
  gsap.to('.msg__semi', { rotate: 180, ease: 'none', scrollTrigger: { trigger: msg, start: 'top bottom', end: 'bottom top', scrub: true } });

  // ---------- Llavero (3D)
  const ll = document.querySelector('.llavero');
  const lcanvas = ll.querySelector('.llavero__canvas');
  lazy(ll, () => {
    import('../three/keychain.js')
      .then((m) => m.createKeychain(lcanvas, {
        onJingle: () => { sound.beep(2600, 0.05, 0.03, 'sine'); setTimeout(() => sound.beep(3400, 0.06, 0.025, 'sine'), 60); setTimeout(() => sound.beep(2900, 0.08, 0.02, 'sine'), 130); },
      }))
      .catch((err) => console.warn('3D no disponible', err));
  });
  gsap.from(ll.querySelector('.llavero__canvas'), { yPercent: -40, opacity: 0, duration: 1.4, ease: 'bounce.out', scrollTrigger: { trigger: ll, start: 'top 70%' } });
  gsap.from(ll.querySelectorAll('.llavero__back > *'), { scale: 0, duration: 1, ease: 'back.out(1.6)', stagger: 0.15, scrollTrigger: { trigger: ll, start: 'top 70%' } });
  gsap.to('.llavero__semi', { rotate: 360, ease: 'none', scrollTrigger: { trigger: ll, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from(ll.querySelectorAll('.llavero__copy > *'), { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: ll, start: 'top 60%' } });
}
