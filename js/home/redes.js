// REDES — el final en positivo. La trama de círculos del brandboard
// (círculos con y sin relleno) dibujada en vivo sobre una franja negra rasgada,
// con el chico sentado arriba de la ciudad. Y el usuario de Instagram.
import { split, torn, rand, pick, finePointer, reduced } from '../core/fx.js';
import { sound } from '../core/sound.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
// Colores de la trama: rellenos y líneas
const FILL = ['#d7ff3a', '#a47cff', '#1f3cff', '#ff4b2b'];
const LINE = ['#ecebe5', '#b9a3ff', '#d7ff3a', '#ff4b2b', '#1f3cff', '#e14bd6'];

function circles(svg) {
  const W = 1600, H = 400;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const items = [];
  // rellenos grandes y chicos, sin pisarse demasiado
  const placed = [];
  const free = (x, y, r) => placed.every((p) => Math.hypot(p.x - x, p.y - y) > (p.r + r) * 0.72);
  let tries = 0;
  while (placed.length < 18 && tries < 600) {
    tries++;
    const r = pick([28, 36, 48, 64, 80, 96]);
    const x = rand(-20, W + 20), y = rand(-20, H + 20);
    if (!free(x, y, r)) continue;
    placed.push({ x, y, r });
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', r);
    c.setAttribute('fill', pick(FILL));
    svg.appendChild(c);
    items.push({ el: c, depth: rand(0.2, 1) });
  }
  // anillos (solo línea), por encima
  for (let i = 0; i < 22; i++) {
    const c = document.createElementNS(NS, 'circle');
    const r = rand(40, 150);
    c.setAttribute('cx', rand(-40, W + 40).toFixed(1));
    c.setAttribute('cy', rand(-40, H + 40).toFixed(1));
    c.setAttribute('r', r.toFixed(1));
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', pick(LINE));
    c.setAttribute('stroke-width', pick([2.5, 3, 4]));
    svg.appendChild(c);
    items.push({ el: c, depth: rand(0.6, 1.6) });
  }
  return items;
}

export default function redes() {
  const sec = document.querySelector('.redes');
  const band = sec.querySelector('.redes__band');
  const svg = sec.querySelector('.redes__circles');
  const boy = sec.querySelector('.redes__boy');
  const city = sec.querySelector('.redes__city');
  torn(band, { amp: 4, step: 2.4, sides: 'tb' });
  const items = circles(svg);

  // Entrada: los círculos aparecen de a uno, los anillos se dibujan
  gsap.from(items.map((i) => i.el), {
    scale: 0, duration: 0.7, ease: 'back.out(2)', stagger: { each: 0.025, from: 'random' },
    scrollTrigger: { trigger: band, start: 'top 80%' },
  });
  gsap.from(band, { clipPath: 'inset(0 100% 0 0)', duration: 1.1, ease: 'expo.inOut', scrollTrigger: { trigger: band, start: 'top 85%' }, onComplete: () => torn(band, { amp: 4, step: 2.4, sides: 'tb' }) });
  gsap.from(city, { yPercent: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 70%' } });
  gsap.from(boy, { yPercent: 40, opacity: 0, duration: 1.1, ease: 'expo.out', delay: 0.2, scrollTrigger: { trigger: sec, start: 'top 70%' } });

  // Siempre se mueven un poco (respiran); con el mouse, se desplazan en capas
  if (!reduced) {
    items.forEach(({ el, depth }) => {
      gsap.to(el, { x: rand(-14, 14) * depth, y: rand(-10, 10) * depth, duration: rand(3, 6), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: rand(0, 2) });
    });
  }
  if (finePointer) {
    const q = items.map(({ el, depth }) => ({ x: gsap.quickTo(el, 'xPercent', { duration: 1.4, ease: 'power3.out' }), depth }));
    const qb = gsap.quickTo(boy, 'x', { duration: 1.2, ease: 'power3.out' });
    sec.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      q.forEach((o) => o.x(-nx * 30 * o.depth));
      qb(nx * 14);
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
