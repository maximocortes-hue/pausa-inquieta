// Utilidades visuales compartidas: partir texto, pesos tipográficos,
// recortes de fotos, bordes rotos, bloques pixelados.

export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const map = (v, a, b, c = 0, d = 1) => c + (d - c) * clamp((v - a) / (b - a));

// Parte un elemento en palabras (.w) y letras (.ch). Conserva <em>/<strong> como clases.
export function split(el, { chars = true } = {}) {
  if (el.dataset.splitDone) return { words: [...el.querySelectorAll('.w')], chars: [...el.querySelectorAll('.ch')] };
  const words = [];
  const out = [];
  const walk = (node, cls) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { out.push(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w' + (cls ? ' ' + cls : '');
          if (chars) {
            [...tok].forEach((c) => {
              const s = document.createElement('span');
              s.className = 'ch';
              s.textContent = c;
              w.appendChild(s);
            });
          } else w.textContent = tok;
          words.push(w);
          out.push(w);
        });
      } else if (n.nodeType === 1 && n.tagName === 'BR') {
        out.push(document.createElement('br'));
      } else if (n.nodeType === 1) {
        walk(n, [cls, n.className || n.tagName.toLowerCase()].filter(Boolean).join(' '));
      }
    });
  };
  walk(el, '');
  el.textContent = '';
  out.forEach((n) => el.appendChild(n));
  el.dataset.splitDone = '1';
  return { words, chars: [...el.querySelectorAll('.ch')] };
}

// Recorte de una foto dentro de una imagen grande (las fotos del brandboard).
// data-crop="x,y,w,h" en píxeles de la imagen original + data-src + data-size="W,H"
export function photos(root = document) {
  root.querySelectorAll('[data-crop]').forEach((el) => {
    const [x, y, w, h] = el.dataset.crop.split(',').map(Number);
    const [W, H] = (el.dataset.size || '1358,272').split(',').map(Number);
    el.style.backgroundImage = `url(${el.dataset.src})`;
    el.style.backgroundSize = `${(W / w) * 100}% ${(H / h) * 100}%`;
    el.style.backgroundPosition = `${W === w ? 0 : (x / (W - w)) * 100}% ${H === h ? 0 : (y / (H - h)) * 100}%`;
    if (!el.style.aspectRatio && !el.dataset.noRatio) el.style.aspectRatio = `${w} / ${h}`;
  });
}

// Borde de papel rasgado: genera un polígono irregular.
export function torn(el, { amp = 2.2, step = 3.5, sides = 'trbl' } = {}) {
  const pts = [];
  const j = () => rand(0, amp);
  const has = (s) => sides.includes(s);
  for (let x = 0; x <= 100; x += rand(step * .5, step)) pts.push(`${x}% ${has('t') ? j() : 0}%`);
  for (let y = 0; y <= 100; y += rand(step * .5, step)) pts.push(`${has('r') ? 100 - j() : 100}% ${y}%`);
  for (let x = 100; x >= 0; x -= rand(step * .5, step)) pts.push(`${x}% ${has('b') ? 100 - j() : 100}%`);
  for (let y = 100; y >= 0; y -= rand(step * .5, step)) pts.push(`${has('l') ? j() : 0}% ${y}%`);
  el.style.clipPath = `polygon(${pts.join(',')})`;
}

// Bloques pixelados (trama "glitch" del brandboard)
export function pixels(container, { n = 18, size = [10, 46], colors = ['#0b0b0b', '#1f3cff', '#a47cff'], area = [0, 0, 100, 100] } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'pixels';
  const items = [];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const s = Math.round(rand(size[0], size[1]) / 4) * 4;
    p.style.width = s + 'px';
    p.style.height = s + 'px';
    p.style.left = rand(area[0], area[2]) + '%';
    p.style.top = rand(area[1], area[3]) + '%';
    p.style.background = pick(colors);
    p.style.opacity = rand(.5, 1).toFixed(2);
    wrap.appendChild(p);
    items.push(p);
  }
  container.appendChild(wrap);
  return items;
}

// Órbita punteada (SVG)
export function orbit(container, { cls = '', rx = 300, ry = 120, rot = -12, color = 'currentColor', style = '' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 't-orbit ' + cls);
  svg.setAttribute('viewBox', `${-rx - 10} ${-ry - 10} ${rx * 2 + 20} ${ry * 2 + 20}`);
  svg.setAttribute('style', style);
  svg.innerHTML = `<ellipse rx="${rx}" ry="${ry}" transform="rotate(${rot})" style="stroke:${color}"/>`;
  container.appendChild(svg);
  return svg;
}

// Peso aleatorio distinto al actual
export function flickerWeight(ch, pool = WEIGHTS) {
  ch.style.fontWeight = pick(pool);
}
