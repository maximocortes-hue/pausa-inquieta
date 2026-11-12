// HOME — arma todas las secciones.
// Orden: hero, quiénes somos, promesa (acá se presenta PI), controles,
// recorrido (con su candado). Lo que sigue se desbloquea al volver del recorrido.
import { initScroll, initCursor, initNav, gate, tv, bindPageLinks } from '../core/ui.js';
import { heart } from '../core/heart.js';
import { pi } from '../core/pi.js';
import { sound } from '../core/sound.js';
import { photos } from '../core/fx.js';
import hero from './hero.js';
import somos from './somos.js';
import promesa from './promesa.js';
import controles from './controles.js';
import story from './story.js';
import llevas from './llevas.js';
import redes from './redes.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin storage */ } },
};
let met = store.get('pi-met') === '1';
const done = store.get('pi-recorrido-done') === '1';
const fromRecorrido = location.hash === '#recorrido' || location.hash === '#iniciar';
// "Qué te llevás" al terminar el paso a paso: directo a la caja, con todo abierto
const toLlevas = location.hash === '#llevas';
if (fromRecorrido || toLlevas) met = true; // si volvés del paso a paso, PI ya se presentó
const root = document.documentElement;
// Si ya hiciste el recorrido, lo de abajo está abierto (al volver, se abre con animación)
if (done && !fromRecorrido) root.classList.add('unlocked');
if (done && fromRecorrido) root.classList.add('unlocking');

const lenis = initScroll();
lenis.stop();

photos();
initCursor();
initNav(lenis);
bindPageLinks();
heart.init({ tip: 'Tu ruido' });

const h = hero();
somos(lenis);
promesa(lenis);
controles();
story();
llevas();
redes();

// ---------- PI: no está (ni suena) hasta que se presenta en la promesa ----------
function piInCorner() {
  heart.audible = 'auto';
  heart.show(true);
  heart.watch(true);
}
if (met) {
  // ya se conocen: aparece en su esquina cuando dejás el hero
  ScrollTrigger.create({
    trigger: '.hero', start: 'bottom 60%',
    onEnter: () => piInCorner(),
    onLeaveBack: () => heart.show(false),
  });
}

// La presentación. Las frases avanzan solo con clic o tecla.
function tense(on) {
  root.classList.toggle('tense', on);
}
let stopTension = null;
async function introduce() {
  if (met) return;
  met = true;
  store.set('pi-met', '1');
  // centramos la promesa y frenamos todo
  lenis.scrollTo('#promesa', { duration: 0.9, force: true, offset: 2 });
  await new Promise((r) => setTimeout(r, 700));
  heart.audible = 'off';
  let noiseDone = false;
  await pi.talk([
    { text: '¡Ey! ¿Qué hacés?' },
    { text: '¡Ah, Roro! ¡Hola!', onStart: () => gsap.fromTo(heart.body, { y: 0 }, { y: -18, duration: 0.18, yoyo: true, repeat: 3, ease: 'power2.out' }) },
    { text: 'Soy PI, Pausa Inquieta.' },
    {
      text: 'Pero no estoy solo... ',
      // apenas lo dice, todo se pone tenso
      onEnd: () => { tense(true); stopTension = sound.tension(0.1); heart.force = 0.25; },
    },
    {
      text: 'Tengo un lado opuesto: tu Ruido.',
      rough: 0.6,
      onWord: (w) => {
        if (noiseDone || w !== 'Ruido') return;
        noiseDone = true;
        // cuando dice "Ruido": unos segundos de ruido por todas partes
        heart.force = 1;
        tv.setStatic(true, 0.82);
        sound.static(2.4, 0.24);
        sound.glitch(0.09);
        gsap.to('main', { x: () => (Math.random() - 0.5) * 18, duration: 0.05, repeat: 30, yoyo: true, ease: 'none', clearProps: 'x' });
        setTimeout(() => {
          tv.setStatic(false);
          tense(false);
          if (stopTension) { stopTension(0.8); stopTension = null; }
          gsap.to(heart, { force: 0, duration: 1.2 });
        }, 2400);
      },
    },
    { text: 'Él aparece cada vez que intervenís, y cuanto más lo hacés, más fuerza gana. Digamos que no es precisamente el más simpático... y puede que no le caigas muy bien.' },
    { text: 'Pero bueno, no quiero adelantarte demasiado.' },
    { text: 'Continuemos, me quedaré en esta esquina observándote.' },
  ], { lenis });
  if (stopTension) { stopTension(0.4); stopTension = null; }
  tense(false);
  heart.force = 0;
  piInCorner();
  // a partir de ahora sigue en su esquina mientras no estés en el hero
  ScrollTrigger.create({
    trigger: '.hero', start: 'bottom 60%',
    onEnterBack: () => {}, onLeaveBack: () => heart.show(false), onEnter: () => heart.show(true),
  });
}
ScrollTrigger.create({
  trigger: '.promesa', start: 'top 45%',
  onEnter: () => { introduce(); },
});

// ---------- El candado ----------
const lockwall = document.getElementById('lock');
const lock = lockwall.querySelector('.lock');
let unlocked = done && !fromRecorrido;
function shakeLock() {
  if (unlocked) return;
  gsap.fromTo(lock, { x: 0 }, { x: 12, duration: 0.06, repeat: 5, yoyo: true, ease: 'none', clearProps: 'x' });
  sound.locked();
}
// insistir con el scroll al final de la página
let lastShake = 0;
const atBottom = () => window.scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
const insist = () => {
  if (unlocked || !atBottom()) return;
  const now = performance.now();
  if (now - lastShake < 420) return;
  lastShake = now;
  shakeLock();
};
window.addEventListener('wheel', (e) => { if (e.deltaY > 0) insist(); }, { passive: true });
let ty = 0;
window.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', (e) => { if (ty - e.touches[0].clientY > 20) insist(); }, { passive: true });
window.addEventListener('keydown', (e) => { if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) insist(); });
// clic al candado: PI, desde su esquina, te pide que lo dejes
lock.addEventListener('click', () => {
  if (unlocked) return;
  shakeLock();
  if (!heart.visible) piInCorner();
  sound.grumble(0.08);
  pi.quip('Dejalo en paz.', { rough: 0.3 });
});

// Al volver del recorrido: el candado se abre y se puede seguir
function unlock() {
  unlocked = true;
  const tl = gsap.timeline({
    onComplete: () => {
      root.classList.remove('unlocking');
      ScrollTrigger.refresh();
    },
  });
  tl.to({}, { duration: 0.6 })
    .add(() => { lock.classList.add('is-open'); sound.unlock(); root.classList.add('unlocked'); ScrollTrigger.refresh(); })
    .to(lock, { y: -10, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }, '+=0.05')
    .to(lockwall, { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.8, ease: 'power3.inOut' }, '+=0.5');
}

(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => ScrollTrigger.refresh());

gate().then(() => {
  lenis.start();
  if (toLlevas && done) {
    tv.in();
    h.intro();
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      lenis.scrollTo('#llevas', { immediate: true, force: true, offset: 2 });
      if (met) piInCorner();
      setTimeout(() => ScrollTrigger.refresh(), 300);
    });
  } else if (fromRecorrido) {
    // venís del paso a paso: volvés al mismo lugar, con todo en color
    tv.in();
    h.intro();
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      lenis.scrollTo('#iniciar', { immediate: true, force: true, offset: -innerHeight * 0.12 });
      if (met) piInCorner();
      if (done) setTimeout(unlock, 700);
    });
  } else {
    window.scrollTo(0, 0);
    h.intro();
  }
});
