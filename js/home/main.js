// HOME — arma todas las secciones.
import { initScroll, initCursor, initNav, gate, tv, bindPageLinks } from '../core/ui.js';
import { heart } from '../core/heart.js';
import { photos } from '../core/fx.js';
import hero from './hero.js';
import somos from './somos.js';
import promesa from './promesa.js';
import caja from './caja.js';
import controles from './controles.js';
import story from './story.js';
import llevas from './llevas.js';
import redes from './redes.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const lenis = initScroll();
lenis.stop();

photos();
initCursor();
initNav(lenis);
bindPageLinks();
heart.init({ lenis, tip: 'tu ruido' });

const h = hero();
somos(lenis);
promesa(lenis);
caja();
controles();
story();
llevas();
redes();

// El corazón aparece cuando dejás la puerta
ScrollTrigger.create({
  trigger: '.hero', start: 'bottom 60%',
  onEnter: () => heart.show(true),
  onLeaveBack: () => heart.show(false),
});
// …y se va en el footer, para no tapar el logo
ScrollTrigger.create({
  trigger: '.foot', start: 'top bottom',
  onEnter: () => heart.show(false),
  onLeaveBack: () => heart.show(true),
});

const fromRecorrido = location.hash && location.hash.length > 1;

(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => ScrollTrigger.refresh());

gate().then(() => {
  lenis.start();
  if (fromRecorrido) {
    tv.in();
    const target = document.querySelector(location.hash);
    h.intro();
    if (target) requestAnimationFrame(() => { ScrollTrigger.refresh(); lenis.scrollTo(target, { immediate: true, force: true }); });
  } else {
    window.scrollTo(0, 0);
    h.intro();
  }
});
