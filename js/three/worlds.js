// Escenas 3D del paso a paso que solo se MUESTRAN (nadie tiene que hacer nada):
// la planta baja con los cubos, las luces y sus botones, los encapuchados,
// la pared de letras que escribe sola, la escalera neón y el final.
import * as THREE from 'three';
import { buildBox } from './box.js';

const LIME = 0xd7ff3a, NEON = 0xd5fc49, VIOLET = 0xa47cff, BLUE = 0x1f3cff, RED = 0xff4b2b, PAPER = 0xecebe5;
const BRAND = [LIME, VIOLET, BLUE, RED, PAPER];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- Base común ----------
function makeWorld(canvas, { fov = 50, bg = 0x0b0b0b, fog = [8, 30], portraitFov } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 760 ? 1.4 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(bg, fog[0], fog[1]);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 120);
  const W = { renderer, scene, camera, p: 0, target: 0, portrait: false, frames: [] };
  W.resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    W.portrait = w / h < 0.9;
    camera.fov = W.portrait ? (portraitFov || fov * 1.3) : fov;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', W.resize);
  W.resize();
  W.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { W.mouse.tx = e.clientX / innerWidth - 0.5; W.mouse.ty = e.clientY / innerHeight - 0.5; });
  W.add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  W.onFrame = (fn) => W.frames.push(fn);
  let raf = 0;
  const clock = new THREE.Clock();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    W.p += (W.target - W.p) * 0.08;
    W.mouse.x += (W.mouse.tx - W.mouse.x) * 0.05; W.mouse.y += (W.mouse.ty - W.mouse.y) * 0.05;
    W.frames.forEach((fn) => fn(clock.elapsedTime, dt, W.p));
    renderer.render(scene, camera);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { W.resize(); clock.getDelta(); loop(); }
    if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(canvas);
  W.api = { setProgress(v) { W.target = v; }, resize: W.resize };
  return W;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function glowSprite(color = '215,255,58', size = 4, opacity = 0.7) {
  const map = canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${color},.9)`); g.addColorStop(0.4, `rgba(${color},.25)`); g.addColorStop(1, `rgba(${color},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
  s.scale.set(size, size, 1);
  return s;
}
function noiseCanvasTex(w = 64, h = 64) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.update = () => {
    const img = x.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); t.needsUpdate = true;
  };
  t.update();
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// =========================================================
// 03 · PLANTA BAJA — paredes blancas llenas de cubos con glow, un hueco en el
// medio de cada una y un cubo en el centro. El cubo va solo a un hueco:
// los demás desaparecen y suena el tic tac.
// =========================================================
export function createCubos(canvas, { onPlace, onLand } = {}) {
  const W = makeWorld(canvas, { fov: 55, bg: 0x0d0a1c, fog: [10, 26] });
  const { scene, camera, add } = W;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221a44, 0.55));
  const top = new THREE.PointLight(VIOLET, 30, 14, 1.4); top.position.set(0, 3.6, 0); scene.add(top);
  const bottom = new THREE.PointLight(VIOLET, 18, 10, 1.6); bottom.position.set(0, 0.2, 0); scene.add(bottom);
  const R = 4.5, H = 4;
  const grid = canvasTex(256, 256, (x, w) => { x.fillStyle = '#f1f0ec'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, w); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } });
  grid.wrapS = grid.wrapT = THREE.RepeatWrapping; grid.repeat.set(4, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: grid, roughness: 0.9 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x15102a, roughness: 0.5, metalness: 0.2, emissive: VIOLET, emissiveIntensity: 0.08 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x15102a, emissive: VIOLET, emissiveIntensity: 0.25 });
  const fl = add(new THREE.PlaneGeometry(R * 2, R * 2), floorMat); fl.rotation.x = -Math.PI / 2;
  const ce = add(new THREE.PlaneGeometry(R * 2, R * 2), ceilMat, 0, H, 0); ce.rotation.x = Math.PI / 2;
  const walls = [];
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(); g.rotation.y = (k * Math.PI) / 2; scene.add(g);
    const w = add(new THREE.PlaneGeometry(R * 2, H), wallMat, 0, H / 2, -R, g);
    void w;
    // hueco en el medio
    const hole = add(new THREE.BoxGeometry(0.9, 0.9, 0.3), holeMat, 0, H / 2, -R + 0.1, g);
    const rim = add(new THREE.RingGeometry(0.62, 0.7, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.8 }), 0, H / 2, -R + 0.02, g);
    // cubos con glow en la pared
    const cubes = [];
    for (let i = 0; i < 26; i++) {
      const x = rand(-R + 0.4, R - 0.4), y = rand(0.4, H - 0.4);
      if (Math.abs(x) < 0.9 && Math.abs(y - H / 2) < 0.9) continue;
      const c = BRAND[Math.floor(Math.random() * 4)];
      const s = rand(0.12, 0.26);
      const m = add(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, toneMapped: false }), x, y, -R + s / 2, g);
      cubes.push(m);
    }
    walls.push({ g, hole, rim, cubes });
  }
  // el cubo del centro
  const cube = add(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.9, toneMapped: false }), 0, 1.3, 0);
  const cubeGlow = glowSprite('215,255,58', 3, 0.6); cube.add(cubeGlow);
  let placed = false, landed = false;
  const lightCols = [VIOLET, BLUE, LIME, RED];
  W.onFrame((t, dt, p) => {
    // luces del techo y piso que cambian
    const ci = Math.floor(t / 1.6) % lightCols.length;
    top.color.lerp(new THREE.Color(lightCols[ci]), 0.03);
    bottom.color.copy(top.color);
    ceilMat.emissive.copy(top.color); floorMat.emissive.copy(top.color);
    // venís cayendo desde el salón: atravesás el techo y aterrizás en la planta baja
    const land = seg(p, 0, 0.16);
    const fallY = lerp(14, 2.1, 1 - Math.pow(1 - land, 2.2));
    if (land >= 1 && !landed) { landed = true; onLand && onLand(); }
    if (p < 0.1) landed = false;
    const bump = landed ? Math.max(0, 1 - (p - 0.16) * 30) : 0;
    // cámara que gira alrededor
    const a = lerp(1.25, 0.12, ease(seg(p, 0.16, 0.6))) + W.mouse.x * 0.3;
    const rad = W.portrait ? 3.9 : 3.4;
    camera.position.set(Math.sin(a) * rad, fallY - bump * 0.35 + W.mouse.y * -0.3 * land, Math.cos(a) * rad);
    camera.lookAt(0, lerp(-3, 1.6, ease(land)), 0);
    // el cubo va al hueco de la pared 0 (z = -R)
    const go = ease(seg(p, 0.5, 0.68));
    cube.position.set(0, lerp(1.3 + Math.sin(t * 1.5) * 0.08, H / 2, go), lerp(0, -R + 0.35, go));
    cube.rotation.set(t * 0.4 * (1 - go), t * 0.6 * (1 - go), 0);
    const gone = seg(p, 0.68, 0.78);
    walls.forEach((w, k) => {
      if (k === 0) { w.rim.material.color.set(go > 0.9 ? LIME : VIOLET); return; }
      const s = Math.max(0.0001, 1 - gone);
      w.hole.scale.setScalar(s); w.rim.scale.setScalar(s);
    });
    if (gone > 0.05 && !placed) { placed = true; onPlace && onPlace(); }
    if (p < 0.6) placed = false;
  });
  return W.api;
}

// =========================================================
// 04 · LAS LUCES — una hilera de luces flúor en vertical que parecen seguir un
// patrón. Alrededor, botones en el piso. Se ve cómo los botones se aprietan
// uno por uno y las luces se apagan, se prenden o cambian de color.
// =========================================================
export function createLuces(canvas, { onPress } = {}) {
  const W = makeWorld(canvas, { fov: 50, bg: 0x0a0716, fog: [8, 24] });
  const { scene, camera, add } = W;
  scene.add(new THREE.HemisphereLight(0x8070d0, 0x050308, 0.4));
  const floor = add(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x120c26, roughness: 0.25, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  const COLS = [LIME, VIOLET, BLUE, RED, PAPER];
  const N = 9;
  const tubes = [];
  for (let i = 0; i < N; i++) {
    const x = (i - (N - 1) / 2) * 0.62;
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, emissiveIntensity: 2, toneMapped: false });
    const m = add(new THREE.CapsuleGeometry(0.09, 2.6, 6, 12), mat, x, 1.6, -2);
    const light = new THREE.PointLight(0xffffff, 0, 3.5, 1.6); light.position.set(x, 1.6, -1.7); scene.add(light);
    tubes.push({ m, light, on: i % 3 !== 1, c: i % COLS.length });
  }
  const pads = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 1.05;
    const g = new THREE.Group(); g.position.set(x, 0, 0.6 + Math.abs(i - 2) * 0.25); scene.add(g);
    const base = add(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x2a2150, roughness: 0.4 }), 0, 0.03, 0, g);
    void base;
    const btn = add(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0xb9a3ff, emissive: VIOLET, emissiveIntensity: 0.4 }), 0, 0.1, 0, g);
    const ring = add(new THREE.RingGeometry(0.4, 0.43, 48), new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.5 }), 0, 0.005, 0, g);
    ring.rotation.x = -Math.PI / 2;
    pads.push({ btn, ring, t: 0 });
  }
  const paint = () => tubes.forEach((tb) => {
    const col = new THREE.Color(COLS[tb.c]);
    tb.m.material.emissive.copy(tb.on ? col : new THREE.Color(0x000000));
    tb.m.material.color.copy(tb.on ? col : new THREE.Color(0x1b1b22));
    tb.light.color.copy(col); tb.light.intensity = tb.on ? 5 : 0;
  });
  paint();
  function press(pi) {
    // cada botón cambia varias luces: apaga, prende o cambia de color
    for (let k = 0; k < 3; k++) {
      const i = (pi * 2 + k * 3) % N;
      const op = (pi + k) % 3;
      if (op === 0) tubes[i].on = !tubes[i].on;
      else if (op === 1) tubes[i].c = (tubes[i].c + 1) % COLS.length;
      else { tubes[i].on = true; tubes[i].c = (tubes[i].c + 2) % COLS.length; }
    }
    pads[pi].t = 1;
    paint();
    onPress && onPress(pi);
  }
  let nextPress = 1.4, cur = 0, idleShift = 0;
  W.onFrame((t, dt, p) => {
    // los botones se aprietan solos, uno por uno (cuando ya se presentaron los botones)
    if (p > 0.35) {
      nextPress -= dt;
      if (nextPress <= 0) { nextPress = 1.1; press(cur); cur = (cur + 1) % pads.length; }
    } else {
      // antes: las luces siguen su propio patrón
      idleShift += dt;
      if (idleShift > 0.9) { idleShift = 0; tubes.push(tubes.shift()); tubes.forEach((tb, i) => { tb.m.position.x = (i - (N - 1) / 2) * 0.62; tb.light.position.x = tb.m.position.x; }); }
    }
    pads.forEach((pd) => {
      pd.t = Math.max(0, pd.t - dt * 2.5);
      pd.btn.position.y = 0.1 - pd.t * 0.06;
      pd.btn.material.emissive.set(pd.t > 0.1 ? LIME : VIOLET);
      pd.ring.material.opacity = 0.5 + pd.t * 0.5;
      pd.ring.scale.setScalar(1 + pd.t * 0.6);
    });
    // cámara: de las luces baja hacia los botones
    const k = ease(seg(p, 0.15, 0.5));
    camera.position.set(W.mouse.x * 0.6, lerp(1.8, 2.6, k), lerp(4.6, 4.2, k) + (W.portrait ? 2 : 0));
    camera.lookAt(0, lerp(1.6, 0.5, k), lerp(-2, 0, k));
  });
  return W.api;
}

// =========================================================
// 04 / 05 · ENCAPUCHADOS — entran por la puerta del aula, se paran de espaldas
// frente al monitor y en la espalda de cada uno se lee la frase entera.
// Van rotando sus posiciones y se van.
// =========================================================
export function createHoods(canvas, { phrase, onStep } = {}) {
  const W = makeWorld(canvas, { fov: 48, bg: 0xdedbd2, fog: [10, 28] });
  const { scene, camera, add } = W;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a675f, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 6, 6); scene.add(key);
  const floor = add(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6e4dc, roughness: 1 });
  add(new THREE.PlaneGeometry(30, 8), wallMat, 0, 4, -4);
  const lw = add(new THREE.PlaneGeometry(20, 8), wallMat, -5, 4, 4); lw.rotation.y = Math.PI / 2;
  // monitor grande en la pared
  const screen = add(new THREE.BoxGeometry(3.2, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, 2.2, -3.9);
  const scrTex = canvasTex(512, 300, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a1663'); g.addColorStop(1, '#1f3cff');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.save(); x.shadowColor = '#d7ff3a'; x.shadowBlur = 30; x.fillStyle = '#d7ff3a';
    x.beginPath(); x.arc(w / 2 + 20, h / 2, 60, Math.PI / 2, Math.PI * 1.5); x.closePath(); x.fill(); x.restore();
  });
  add(new THREE.PlaneGeometry(3.0, 1.72), new THREE.MeshBasicMaterial({ map: scrTex }), 0, 2.2, -3.85);
  void screen;
  // puerta en la pared izquierda (se abre)
  const doorPivot = new THREE.Group(); doorPivot.position.set(-4.95, 0, 1.6); scene.add(doorPivot);
  add(new THREE.BoxGeometry(0.06, 2.3, 1.1), new THREE.MeshStandardMaterial({ color: 0x2a2a28 }), 0, 1.15, 0.55, doorPivot);
  add(new THREE.PlaneGeometry(1.2, 2.4), new THREE.MeshBasicMaterial({ color: 0x0b0b0b }), -4.98, 1.2, 2.15).rotation.y = Math.PI / 2;
  // la frase entera, para cada espalda
  const backTex = canvasTex(512, 512, (x, w) => {
    x.fillStyle = '#111111'; x.fillRect(0, 0, w, w);
    x.fillStyle = '#ecebe5'; x.font = '700 78px "Poppins", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const words = phrase.split(' ');
    const lines = []; let cur = '';
    words.forEach((wd) => { const tt = cur ? cur + ' ' + wd : wd; if (x.measureText(tt).width > w * 0.82 && cur) { lines.push(cur); cur = wd; } else cur = tt; });
    lines.push(cur);
    lines.forEach((l, i) => x.fillText(l, w / 2, w / 2 + (i - (lines.length - 1) / 2) * 90));
  });
  const ink = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  function hooded() {
    const g = new THREE.Group();
    add(new THREE.CylinderGeometry(0.34, 0.46, 1.25, 20), ink, 0, 0.82, 0, g); // cuerpo
    add(new THREE.SphereGeometry(0.33, 20, 16), ink, 0, 1.68, 0.02, g).scale.set(1, 1.15, 1.1); // capucha
    add(new THREE.SphereGeometry(0.48, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), ink, 0, 1.38, 0, g).scale.set(1, 0.35, 0.8); // hombros
    // la espalda mira a la cámara (+z): la frase va ahí
    const back = add(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshBasicMaterial({ map: backTex }), 0, 1.02, 0.47, g);
    back.rotation.x = -0.12;
    scene.add(g);
    return g;
  }
  const people = [hooded(), hooded(), hooded()];
  const slots = [-1.5, 0, 1.5];
  const door = new THREE.Vector3(-4.6, 0, 2.15);
  const orders = [[0, 1, 2], [2, 0, 1], [1, 2, 0], [0, 2, 1]];
  let lastStep = -1;
  W.onFrame((t, dt, p) => {
    doorPivot.rotation.y = (seg(p, 0.02, 0.1) - seg(p, 0.9, 0.97)) * 1.4 + seg(p, 0.78, 0.84) * 1.4 * (p < 0.9 ? 1 : 0);
    const step = p < 0.32 ? 0 : p < 0.46 ? 1 : p < 0.6 ? 2 : 3;
    if (step !== lastStep) { if (lastStep >= 0) onStep && onStep(step); lastStep = step; }
    people.forEach((g, i) => {
      // entrar por la puerta (escalonados), rotar posiciones, irse por la puerta
      const inK = ease(seg(p, 0.06 + i * 0.05, 0.24 + i * 0.05));
      const outK = ease(seg(p, 0.8 + i * 0.03, 0.95 + i * 0.02));
      const slot = slots[orders[step].indexOf(i)];
      const targetX = slot;
      g.userData.x = g.userData.x === undefined ? targetX : g.userData.x + (targetX - g.userData.x) * 0.05;
      const sx = g.userData.x, sz = -1.9;
      const x = lerp(lerp(door.x, sx, inK), door.x, outK);
      const z = lerp(lerp(door.z, sz, inK), door.z, outK);
      const prev = g.userData.prev || new THREE.Vector3(x, 0, z);
      const dx = x - prev.x, dz = z - prev.z;
      const walking = Math.hypot(dx, dz) > 0.002;
      g.userData.prev = new THREE.Vector3(x, 0, z);
      g.position.set(x, walking ? Math.abs(Math.sin(t * 8 + i)) * 0.05 : 0, z);
      // caminando miran hacia donde van; quietos, de espaldas a la cámara (mirando al monitor)
      const facing = walking ? Math.atan2(-dx, -dz) : 0;
      let d = facing - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * 0.12;
      g.visible = inK > 0.001 && outK < 0.999;
    });
    camera.position.set(lerp(2.2, 0.4, ease(seg(p, 0, 0.3))) + W.mouse.x * 0.5, 2.0, W.portrait ? 6.6 : 4.6);
    camera.lookAt(0, 1.4, -2);
  });
  return W.api;
}

// =========================================================
// 05 · LA PARED DE LETRAS — un teclado-pared con la trama de letras de la marca.
// Se escribe solo: las teclas se hunden, se forma una palabra y la palabra se
// vuelve física y sale flotando por el espacio.
// =========================================================
export function createLetras(canvas, { words, onKey, onWord } = {}) {
  const W = makeWorld(canvas, { fov: 50, bg: 0x0b0b0b, fog: [9, 24] });
  const { scene, camera, add } = W;
  scene.add(new THREE.HemisphereLight(0xb9a3ff, 0x050308, 0.7));
  const pl = new THREE.PointLight(VIOLET, 20, 14); pl.position.set(-3, 3, 4); scene.add(pl);
  const pl2 = new THREE.PointLight(BLUE, 20, 14); pl2.position.set(4, -1, 3); scene.add(pl2);
  const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  const TR = ['#1f3cff', '#d7ff3a', '#a47cff', '#ff4b2b', '#ecebe5', '#2b3f78'];
  const wall = new THREE.Group(); scene.add(wall);
  wall.rotation.set(-0.12, 0.28, 0);
  const keys = {};
  const COLS = 7;
  ABC.forEach((ch, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const tex = canvasTex(128, 128, (x) => {
      x.fillStyle = '#141414'; x.fillRect(0, 0, 128, 128);
      x.save(); x.translate(64, 66); x.rotate(rand(-0.35, 0.35));
      x.fillStyle = TR[(i * 5 + (i % 3)) % TR.length]; x.font = '900 92px "Poppins", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(ch, 0, 0); x.restore();
      // tinta gastada
      x.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 160; k++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.8})`; x.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 4, Math.random() * 2); }
    });
    const m = add(new THREE.BoxGeometry(0.62, 0.62, 0.22), [
      new THREE.MeshStandardMaterial({ color: 0x1c1c1c }), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }),
      new THREE.MeshStandardMaterial({ color: 0x1c1c1c }), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }),
      new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshStandardMaterial({ color: 0x1c1c1c }),
    ], (col - (COLS - 1) / 2) * 0.7, (1.5 - row) * 0.7, 0, wall);
    keys[ch] = { m, t: 0 };
  });
  // la palabra que se está escribiendo y las que ya flotan
  function wordSprite(text) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 192;
    const x = c.getContext('2d');
    x.fillStyle = TR[Math.floor(Math.random() * 5)]; x.font = '900 140px "Poppins", sans-serif'; x.textBaseline = 'middle';
    x.fillText(text, 20, 100);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(4, 0.75, 1);
    s.userData.ctx = x; s.userData.tex = tex; s.userData.canvas = c;
    return s;
  }
  const floating = [];
  let wi = 0, ci = 0, nextKey = 0.8, typing = wordSprite(''), shown = '';
  typing.position.set(0, 2.2, 0.6); wall.add(typing);
  function redrawTyping() {
    const { ctx, tex, canvas: c } = typing.userData;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ecebe5'; ctx.font = '900 140px "Poppins", sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillText(shown, 20, 100);
    tex.needsUpdate = true;
  }
  W.onFrame((t, dt, p) => {
    nextKey -= dt;
    if (p > 0.08 && nextKey <= 0) {
      const w = words[wi % words.length];
      if (ci < w.length) {
        const ch = w[ci];
        if (keys[ch]) { keys[ch].t = 1; onKey && onKey(); }
        shown += ch; ci++; redrawTyping();
        nextKey = 0.16 + Math.random() * 0.12;
      } else {
        // la palabra se suelta y sale flotando
        const s = wordSprite(w);
        s.position.set(rand(-1, 1), 2.3, 1);
        s.userData.v = new THREE.Vector3(rand(-0.6, 0.6), rand(0.2, 0.6), rand(0.4, 1.1));
        s.userData.spin = rand(-0.3, 0.3);
        scene.add(s); floating.push(s);
        if (floating.length > 10) scene.remove(floating.shift());
        onWord && onWord(w);
        shown = ''; redrawTyping();
        wi++; ci = 0; nextKey = 0.9;
      }
    }
    Object.values(keys).forEach((k) => { k.t = Math.max(0, k.t - dt * 4); k.m.position.z = -k.t * 0.15; });
    floating.forEach((s) => {
      s.position.addScaledVector(s.userData.v, dt);
      s.userData.v.multiplyScalar(0.995);
      s.position.x += Math.sin(t + s.id) * 0.004;
      s.material.rotation += s.userData.spin * dt;
    });
    camera.position.set(lerp(-1.2, 1.4, p) + W.mouse.x * 0.5, 0.6 - W.mouse.y * 0.3, W.portrait ? 9.5 : 6.4);
    camera.lookAt(0, 0.6, 0);
  });
  return W.api;
}

// =========================================================
// 06 · LA ESCALERA — escalones de neón que no terminan. Cuanto más subís, más
// ruido. Después la escalera cambia de lugar y se detiene frente a una puerta.
// =========================================================
export function createEscalera(canvas) {
  const W = makeWorld(canvas, { fov: 58, bg: 0x050505, fog: [6, 22] });
  const { scene, camera, add } = W;
  const N = 34, RISE = 0.32, RUN = 0.62, WIDTH = 2.2;
  const stairs = new THREE.Group(); scene.add(stairs);
  const edgeMat = new THREE.LineBasicMaterial({ color: NEON });
  const topMat = new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.08 });
  const boxGeo = new THREE.BoxGeometry(WIDTH, RISE, RUN);
  const edges = new THREE.EdgesGeometry(boxGeo);
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group(); g.position.set(0, i * RISE, -i * RUN); stairs.add(g);
    g.add(new THREE.LineSegments(edges, edgeMat));
    const m = new THREE.Mesh(boxGeo, topMat); g.add(m);
  }
  const glow = glowSprite('213,252,73', 9, 0.18); glow.position.set(0, 4, -6); scene.add(glow);
  // la puerta del final
  const doorG = new THREE.Group(); scene.add(doorG);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.1, 2.1)), new THREE.LineBasicMaterial({ color: NEON }));
  doorG.add(frame);
  const doorLight = add(new THREE.PlaneGeometry(1.05, 2.05), new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0 }), 0, 0, -0.01, doorG);
  const dGlow = glowSprite('213,252,73', 5, 0); doorG.add(dGlow);
  W.onFrame((t, dt, p) => {
    // subir sin fin: el escalón se repite
    const climb = seg(p, 0, 0.8) * 14;
    const loop = climb % 1;
    const z = loop * RUN, y = loop * RISE;
    // la escalera cambia de lugar a los saltos
    const jumps = Math.round(seg(p, 0.5, 0.8) * 5) / 5;
    stairs.rotation.y = jumps * 1.3;
    stairs.position.set(-jumps * 0.8, -y, z);
    edgeMat.color.setHex(Math.random() < seg(p, 0.2, 0.75) * 0.08 ? 0xffffff : NEON);
    const d = seg(p, 0.8, 0.92);
    doorG.position.set(0, 1.6 + 1.05, -4.5);
    doorG.rotation.y = 0;
    doorLight.material.opacity = d * 0.85;
    dGlow.material.opacity = d * 0.6;
    frame.visible = d > 0.01;
    camera.position.set(W.mouse.x * 0.4, 1.2, W.portrait ? 3.4 : 2.2);
    camera.lookAt(0, 1.9, -4);
  });
  return W.api;
}

// =========================================================
// 07 · EL CORAZÓN INQUIETO — el salón del inicio, ahora deteriorado y sin luz.
// El semicírculo pasa de pausa a inquieta (su otra mitad en ruido), se abre,
// un túnel oscuro lleva a una sala: un pedestal blanco con la caja del inicio.
// =========================================================
export function createFinal(canvas) {
  const W = makeWorld(canvas, { fov: 55, bg: 0x070510, fog: [5, 24] });
  const { scene, camera, add } = W;
  scene.add(new THREE.HemisphereLight(0x6655aa, 0x020104, 0.35));
  const flick = new THREE.PointLight(VIOLET, 10, 16, 1.5); flick.position.set(0, 3.5, -4); scene.add(flick);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x4a4466, roughness: 1 });
  const floor = add(new THREE.PlaneGeometry(8, 60), new THREE.MeshStandardMaterial({ color: 0x0f0b1d, roughness: 0.5, metalness: 0.3 }), 0, 0, -18);
  floor.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    [-2.8, 2.8].forEach((x) => {
      const c = add(new THREE.CylinderGeometry(0.22, 0.26, 4, 12), colMat, x, 2, 2 - i * 3.2);
      c.rotation.z = rand(-0.06, 0.06); // deteriorado: torcidas
    });
  }
  // el semicírculo: mitad pausa (flúor) y mitad inquieta (ruido)
  const R = 1.2;
  const pausa = add(new THREE.CircleGeometry(R, 64, Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color: LIME, transparent: true }), 0, 1.8, -6);
  const noiseTex = noiseCanvasTex(64, 64);
  const inq = add(new THREE.CircleGeometry(R, 64, -Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ map: noiseTex, transparent: true, opacity: 0 }), 0, 1.8, -6);
  const glow = glowSprite('215,255,58', 6, 0.5); glow.position.set(0, 1.8, -6.1); scene.add(glow);
  // túnel: anillos
  const rings = [];
  for (let i = 0; i < 16; i++) {
    const r = add(new THREE.TorusGeometry(1.6, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: i % 3 ? VIOLET : LIME, transparent: true, opacity: 0.6 }), 0, 1.8, -8 - i * 1.4);
    rings.push(r);
  }
  // la sala del final: pedestal blanco con la caja
  const roomZ = -32;
  add(new THREE.CylinderGeometry(0.55, 0.6, 1.1, 32), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6 }), 0, 0.55, roomZ);
  const box = buildBox();
  box.group.scale.setScalar(0.28);
  box.group.position.set(0, 1.11, roomZ);
  scene.add(box.group);
  const spot = new THREE.SpotLight(0xffffff, 0, 8, 0.45, 0.6, 1.2); spot.position.set(0, 4.5, roomZ + 1.5); spot.target.position.set(0, 1, roomZ); scene.add(spot, spot.target);
  const pedGlow = glowSprite('164,124,255', 5, 0); pedGlow.position.set(0, 1.4, roomZ - 0.6); scene.add(pedGlow);
  W.onFrame((t, dt, p) => {
    // de pausa a inquieta
    const inqK = seg(p, 0.04, 0.28);
    inq.material.opacity = inqK;
    pausa.material.color.setRGB(lerp(0.84, 0.35, inqK), lerp(1, 0.35, inqK), lerp(0.23, 0.35, inqK));
    glow.material.opacity = 0.5 * (1 - inqK) + 0.1;
    if (inqK > 0.01) noiseTex.update();
    flick.intensity = (Math.random() < 0.08 ? 2 : 10) * (1 - inqK * 0.6);
    // se abre
    const open = ease(seg(p, 0.3, 0.48));
    pausa.position.x = -open * 2.2; inq.position.x = open * 2.2;
    // túnel y sala
    const travel = ease(seg(p, 0.36, 0.86));
    rings.forEach((r, i) => { r.material.opacity = 0.6 * seg(p, 0.34, 0.42); r.rotation.z = t * 0.2 + i; });
    spot.intensity = seg(p, 0.7, 0.85) * 60;
    pedGlow.material.opacity = seg(p, 0.72, 0.9) * 0.5;
    const cz = lerp(2.5, roomZ + 3.2, travel);
    camera.position.set(W.mouse.x * 0.4 + Math.sin(t * 0.7) * 0.05, lerp(1.8, 1.6, travel), cz + (W.portrait ? 1.5 : 0));
    camera.lookAt(0, lerp(1.8, 1.1, seg(p, 0.75, 0.9)), cz - 4);
    box.group.rotation.y = t * 0.15;
  });
  return W.api;
}

// =========================================================
// 03 · EL CORAZÓN — cinemática (como en Unreal): planos con cortes y cámara
// en movimiento. El semicírculo late en flúor, pierde el color, aparece
// Inquieta en blanco y negro con ruido, saltan formas bruscas y al final
// el semicírculo se llena de ruido.
// =========================================================
export function createCorazon(canvas, { onCut } = {}) {
  const W = makeWorld(canvas, { fov: 38, bg: 0x140c33, fog: [7, 26], portraitFov: 60 });
  const { scene, camera, add } = W;
  const hemi = new THREE.HemisphereLight(0x7b63d6, 0x05030d, 0.7); scene.add(hemi);
  const violet = new THREE.PointLight(VIOLET, 40, 22, 1.5); violet.position.set(-3, 3.5, 1); scene.add(violet);
  const blue = new THREE.PointLight(BLUE, 40, 26, 1.5); blue.position.set(3, 3.5, -5); scene.add(blue);
  // el salón: piso, columnas a los lados
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x24184f, roughness: 0.35, metalness: 0.35 });
  const fl = add(new THREE.PlaneGeometry(40, 40), floorMat); fl.rotation.x = -Math.PI / 2;
  const colMat = new THREE.MeshStandardMaterial({ color: 0xb6a9e8, roughness: 0.85 });
  for (let i = 0; i < 7; i++) [-3.4, 3.4].forEach((x) => add(new THREE.CylinderGeometry(0.24, 0.28, 4.4, 16), colMat, x, 2.2, 4 - i * 3.4));
  // el semicírculo: mitad Pausa (flúor) y mitad Inquieta (ruido)
  const R = 1.3, CY = 1.9;
  const pc = document.createElement('canvas'); pc.width = 96; pc.height = 192;
  const px = pc.getContext('2d');
  const pTex = new THREE.CanvasTexture(pc); pTex.magFilter = THREE.NearestFilter; pTex.colorSpace = THREE.SRGBColorSpace;
  const pausa = add(new THREE.CircleGeometry(R, 64, Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ map: pTex, toneMapped: false }), -0.03, CY, 0);
  const nTex = noiseCanvasTex(64, 128);
  const inqMat = new THREE.MeshBasicMaterial({ map: nTex, transparent: true, opacity: 0, toneMapped: false });
  const inq = add(new THREE.CircleGeometry(R, 64, -Math.PI / 2, Math.PI), inqMat, 0.03, CY, 0);
  const glow = glowSprite('215,255,58', 7, 0.8); glow.position.set(-0.4, CY, -0.2); scene.add(glow);
  // formas bruscas en blanco y negro
  const shards = [];
  for (let i = 0; i < 46; i++) {
    const g = i % 3 ? new THREE.TetrahedronGeometry(rand(0.08, 0.28)) : new THREE.BoxGeometry(rand(0.05, 0.4), rand(0.02, 0.08), rand(0.05, 0.3));
    const m = add(g, new THREE.MeshBasicMaterial({ color: [0xffffff, 0x111111, 0x8a8a8a][i % 3] }), 0, CY, 0);
    const d = new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-0.3, 1)).normalize();
    m.userData = { d, dist: rand(1.6, 4.5), spin: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)), at: rand(0, 0.1) };
    m.visible = false;
    shards.push(m);
  }
  // planos de la cinemática (cortes secos entre uno y otro)
  const SHOTS = [0, 0.2, 0.4, 0.6, 0.82, 1.0001];
  let shot = -1;
  const lime = new THREE.Color(LIME), gray = new THREE.Color(0x9a9a9a), tmp = new THREE.Color();
  const bgA = new THREE.Color(0x140c33), bgB = new THREE.Color(0x0e0e0e);
  const img = px.createImageData(96, 192);
  W.onFrame((t, dt, p) => {
    const s = Math.max(0, SHOTS.findIndex((v, i) => p >= v && p < SHOTS[i + 1]));
    if (s !== shot) { if (shot !== -1) onCut && onCut(s); shot = s; }
    const lt = seg(p, SHOTS[s], SHOTS[s + 1]); // tiempo dentro del plano
    const drain = seg(p, 0.2, 0.55);          // pierde el color
    const appear = seg(p, 0.3, 0.55);         // aparece Inquieta
    const fill = seg(p, 0.62, 0.95);          // la mitad Pausa se llena de ruido
    const burst = seg(p, 0.42, 0.62);
    // latido, cada vez más brusco
    const rate = 1.05 - drain * 0.45;
    const ph = (t % rate) / rate;
    const kick = ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) : ph > 0.2 && ph < 0.3 ? 0.6 * Math.sin(((ph - 0.2) / 0.1) * Math.PI) : 0;
    const sc = 1 + kick * (0.05 + drain * 0.08);
    pausa.scale.setScalar(sc); inq.scale.setScalar(sc);
    // la mitad Pausa: flúor que se apaga y se llena de ruido
    tmp.copy(lime).lerp(gray, drain);
    const r = tmp.r * 255, g = tmp.g * 255, b = tmp.b * 255;
    const dd = img.data;
    for (let i = 0; i < dd.length; i += 4) {
      if (Math.random() < fill) { const v = Math.random() * 255; dd[i] = dd[i + 1] = dd[i + 2] = v; }
      else { const k = 1 - Math.random() * 0.12 * drain; dd[i] = r * k; dd[i + 1] = g * k; dd[i + 2] = b * k; }
      dd[i + 3] = 255;
    }
    px.putImageData(img, 0, 0); pTex.needsUpdate = true;
    nTex.update();
    inqMat.opacity = appear * (Math.random() < 0.08 * appear ? 0.3 : 1);
    glow.material.opacity = (0.75 + kick * 0.25) * (1 - drain * 0.9);
    // el lugar también pierde el color
    scene.background.copy(bgA).lerp(bgB, drain); scene.fog.color.copy(scene.background);
    violet.intensity = 40 * (1 - drain) + (Math.random() < drain * 0.15 ? 60 : 0);
    blue.intensity = 40 * (1 - drain * 0.8);
    hemi.intensity = 0.7 - drain * 0.35;
    // formas bruscas
    shards.forEach((m) => {
      const u = m.userData;
      const k = seg(burst, u.at, u.at + 0.4);
      m.visible = k > 0;
      if (!m.visible) return;
      const out = 1 - Math.pow(1 - k, 3);
      m.position.set(u.d.x * u.dist * out, CY + u.d.y * u.dist * out * 0.7, u.d.z * u.dist * out);
      m.rotation.set(u.spin.x * t * 0.2, u.spin.y * t * 0.2, u.spin.z * t * 0.2);
    });
    // cámara: cada plano tiene su movimiento
    const shake = (a) => (Math.random() - 0.5) * a;
    const at = new THREE.Vector3(0, CY, 0);
    let pos, roll = 0;
    if (s === 0) { // plano general: travelling lento hacia el corazón
      pos = new THREE.Vector3(lerp(0.6, 0, lt), lerp(1.2, 1.6, lt), lerp(13, 8, ease(lt)));
    } else if (s === 1) { // primer plano: gira alrededor del borde del semicírculo
      const a = lerp(-0.9, 0.5, lt);
      pos = new THREE.Vector3(Math.sin(a) * 3.2, CY + 0.3, Math.cos(a) * 3.2);
      at.set(lerp(-0.6, 0.4, lt), CY, 0);
    } else if (s === 2) { // cámara en mano, inclinada: las formas salen hacia vos
      pos = new THREE.Vector3(1.4 + shake(0.12), CY - 0.6 + shake(0.12), 4.2 - lt * 0.8);
      roll = 0.22 + shake(0.05);
    } else if (s === 3) { // contrapicado que se acerca lento: la mitad flúor se llena de ruido
      pos = new THREE.Vector3(-0.4 + shake(0.03), lerp(0.6, 0.9, lt), lerp(5.5, 3.2, ease(lt)));
      at.set(-0.3, CY + 0.2, 0);
    } else { // plano final: se aleja, todo ya es ruido
      pos = new THREE.Vector3(shake(0.04), lerp(1.7, 2.4, lt), lerp(3.5, 11, ease(lt)));
    }
    if (W.portrait) pos.sub(at).multiplyScalar(1.35).add(at);
    camera.position.copy(pos);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(at);
  });
  return W.api;
}

// =========================================================
// 05 · EL PASILLO — cuadros colgados en la pared, varios torcidos, y en el piso
// solo el marco. La cámara camina el pasillo. Nada se acomoda: los cuadros se
// tuercen más y alguno se cae. No se toca nada, solo se ve.
// =========================================================
export function createCuadros(canvas, { onTilt, onFall } = {}) {
  const W = makeWorld(canvas, { fov: 55, bg: 0x0d0b1a, fog: [6, 24] });
  const { scene, camera, add } = W;
  scene.add(new THREE.HemisphereLight(0xcfc6ff, 0x08060f, 0.8));
  const L = 28, HW = 1.7, H = 3.4, Z0 = 3;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2440, roughness: 0.6, metalness: 0.1 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1530 });
  const fl = add(new THREE.PlaneGeometry(HW * 2, L), floorMat, 0, 0, Z0 - L / 2); fl.rotation.x = -Math.PI / 2;
  const ce = add(new THREE.PlaneGeometry(HW * 2, L), ceilMat, 0, H, Z0 - L / 2); ce.rotation.x = Math.PI / 2;
  [-1, 1].forEach((sd) => { const w = add(new THREE.PlaneGeometry(L, H), wallMat, sd * HW, H / 2, Z0 - L / 2); w.rotation.y = -sd * Math.PI / 2; });
  // luces del techo, en fila
  const lamps = [];
  for (let i = 0; i < 6; i++) {
    const z = 1 - i * 4.2;
    const l = new THREE.PointLight(0xfff3e0, 9, 7, 1.6); l.position.set(0, H - 0.3, z); scene.add(l); lamps.push(l);
    add(new THREE.BoxGeometry(0.6, 0.04, 0.18), new THREE.MeshBasicMaterial({ color: 0xfff6e6 }), 0, H - 0.02, z);
  }
  // las imágenes de la marca, recortadas como en los cuadros de antes
  const loader = new THREE.TextureLoader();
  const imgs = {
    a: { tex: loader.load('assets/img/brand-a.webp'), w: 2000, h: 1074 },
    b: { tex: loader.load('assets/img/brand-b.webp'), w: 2000, h: 1417 },
  };
  Object.values(imgs).forEach((im) => { im.tex.colorSpace = THREE.SRGBColorSpace; });
  const CROPS = [['a', 300, 690, 400, 384], ['b', 150, 280, 520, 820], ['a', 1210, 672, 210, 330], ['a', 1417, 731, 289, 343], ['a', 1716, 819, 191, 189], ['a', 1680, 680, 190, 170]];
  function cropTex([k, x, y, w, h]) {
    const im = imgs[k];
    const t = im.tex.clone();
    t.repeat.set(w / im.w, h / im.h);
    t.offset.set(x / im.w, 1 - (y + h) / im.h);
    t.needsUpdate = true;
    return t;
  }
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb9a36a, roughness: 0.4, metalness: 0.6 });
  function frame(w, h, crop) {
    const g = new THREE.Group();
    const b = 0.07, mat = Math.random() < 0.5 ? frameMat : gold;
    [[0, h / 2, w + b * 2, b], [0, -h / 2, w + b * 2, b], [-w / 2, 0, b, h], [w / 2, 0, b, h]].forEach(([x, y, ww, hh]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.06), mat); m.position.set(x, y, 0); g.add(m);
    });
    if (crop) {
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: cropTex(crop), roughness: 0.8 }));
      pic.position.z = -0.005; g.add(pic);
    }
    return g;
  }
  // cuadros colgados (de un clavo arriba: giran desde ahí)
  const hung = [];
  for (let i = 0; i < 12; i++) {
    const sd = i % 2 ? 1 : -1;
    const crop = CROPS[i % CROPS.length];
    const ar = crop[3] / crop[4];
    const h = rand(0.7, 1.05), w = Math.min(1.5, h * ar);
    const pivot = new THREE.Group();
    const z = 0.2 - Math.floor(i / 2) * 2.1 - (sd > 0 ? 1 : 0);
    pivot.position.set(sd * (HW - 0.04), 2.45, z);
    pivot.rotation.y = -sd * Math.PI / 2;
    scene.add(pivot);
    const f = frame(w, h, crop); f.position.y = -h / 2 - 0.05; pivot.add(f);
    const base = i % 3 === 0 ? 0 : rand(-0.35, 0.35); // varios ya están torcidos
    pivot.rotation.z = base;
    hung.push({ pivot, f, base, h, z, tw: rand(0.18, 0.45) * (Math.random() < 0.5 ? -1 : 1), fall: i === 5 || i === 8, done: false, tilted: false, vy: 0 });
  }
  // en el piso, solo el marco
  for (let i = 0; i < 5; i++) {
    const sd = i % 2 ? 1 : -1;
    const f = frame(rand(0.6, 1.2), rand(0.5, 0.9), null);
    f.rotation.set(-Math.PI / 2, 0, rand(-0.6, 0.6));
    f.position.set(sd * rand(0.6, 1.1), 0.04, -1 - i * 4.4);
    scene.add(f);
  }
  W.onFrame((t, dt, p) => {
    const camZ = lerp(3, -18, ease(p));
    // la cámara camina y mira a un lado y al otro
    const lookSide = Math.sin(p * Math.PI * 3) * 0.55 + W.mouse.x * 0.3;
    camera.position.set(Math.sin(p * 9) * 0.06, 1.62 + Math.abs(Math.sin(p * 40)) * 0.03, camZ);
    camera.lookAt(camera.position.x + Math.sin(lookSide) * 2, 1.7 - W.mouse.y * 0.3, camZ - Math.cos(lookSide) * 2);
    lamps.forEach((l, i) => { l.intensity = Math.random() < 0.015 * (i % 3) ? 2 : 9; });
    hung.forEach((c) => {
      // cuando te acercás, se tuercen más (nada se acomoda)
      const near = c.z > camZ - 3.2 && c.z < camZ + 2;
      if (near && !c.tilted) { c.tilted = true; onTilt && onTilt(); }
      if (c.z < camZ - 6) c.tilted = false;
      const target = c.base + (c.tilted ? c.tw : 0) + Math.sin(t * 2 + c.z) * 0.01;
      c.pivot.rotation.z += (target - c.pivot.rotation.z) * 0.06;
      if (c.fall) {
        if (c.z > camZ - 2.4) {
          // se descuelga y cae al piso
          if (!c.done) { c.done = true; c.vy = 0; setTimeout(() => onFall && onFall(), 450); }
          c.vy -= dt * 9;
          c.f.position.y = Math.max(-2.45 + c.h / 2 + 0.02, c.f.position.y + c.vy * dt);
          c.f.rotation.x = Math.min(0.28, c.f.rotation.x + dt * 0.5);
        } else if (c.done) { c.done = false; c.vy = 0; c.f.position.y = -c.h / 2 - 0.05; c.f.rotation.x = 0; }
      }
    });
  });
  return W.api;
}

// =========================================================
// 06 · LOS DOMINÓS — la primera pieza está de cara al piso, se posiciona sola
// y empieza la cadena. La cámara va arrasando con cada dominó y al final la
// vemos desde arriba: lo que cayó forma la frase.
// =========================================================
const PIX = {
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['#####', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
};
export function createDominos(canvas, { phrase = 'Te dije que no hagas nada', onFall } = {}) {
  const W = makeWorld(canvas, { fov: 50, bg: 0x0c0a16, fog: [16, 90] });
  const { scene, camera } = W;
  scene.add(new THREE.HemisphereLight(0xe8e4ff, 0x120e22, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-6, 12, 8); scene.add(key);
  const C = 0.3, TH = 0.07, HH = 0.36, WD = 0.24;
  // líneas de la frase (en pantallas verticales, más cortas)
  const words = phrase.toUpperCase().split(' ');
  const lines = W.portrait
    ? [words.slice(0, 2).join(' '), words.slice(2, 4).join(' '), words[4], words[5]].filter(Boolean)
    : [words.slice(0, 3).join(' '), words.slice(3).join(' ')];
  const colsOf = (s) => [...s].reduce((n, ch) => n + (ch === ' ' ? 3 : 6), 0) - 1;
  const maxCols = Math.max(...lines.map(colsOf));
  const XL = -C * 2, XR = (maxCols + 1) * C;
  const LINE_GAP = 10; // filas entre una línea y la otra
  const doms = []; // { x, z, dir, d, letter }
  let d0 = 0;
  lines.forEach((line, li) => {
    const z0 = li * LINE_GAP * C;           // fila 0 de esta línea
    const zm = z0 + 3 * C;                  // fila del medio (por donde va la cadena)
    const fwd = li % 2 === 0;               // ida y vuelta, como una serpiente
    const xs = fwd ? XL : XR, xe = fwd ? XR : XL;
    const dir = fwd ? 'px' : 'nx';
    const along = (x) => d0 + Math.abs(x - xs);
    let col = 0, minX = Infinity, maxX = -Infinity;
    [...line].forEach((ch) => {
      if (ch === ' ') { col += 3; return; }
      const g = PIX[ch];
      if (!g) { col += 6; return; }
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
        if (g[r][c] !== '#') continue;
        const x = (col + c) * C, z = z0 + r * C;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        doms.push({ x, z, dir, d: along(x) + Math.abs(r - 3) * 0.05, letter: true });
      }
      col += 6;
    });
    // camino de entrada y de salida (fuera de las letras)
    for (let x = XL; x <= XR + 0.001; x += C) {
      if (x > minX - C * 0.5 && x < maxX + C * 0.5) continue;
      doms.push({ x, z: zm, dir, d: along(x), letter: false });
    }
    d0 += XR - XL;
    // de una línea a la otra
    if (li < lines.length - 1) {
      const zn = (li + 1) * LINE_GAP * C + 3 * C;
      for (let z = zm + C; z < zn - 0.001; z += C) doms.push({ x: xe, z, dir: 'pz', d: d0 + (z - zm), letter: false });
      d0 += zn - zm;
    }
  });
  const D = d0;
  // la primera pieza, de cara al piso
  const first = { x: XL - C, z: 3 * C, dir: 'px', d: -1, letter: false, first: true };
  doms.push(first);
  // el camino según la distancia (para que la cámara lo siga)
  function pathAt(d) {
    let acc = 0;
    for (let li = 0; li < lines.length; li++) {
      const zm = li * LINE_GAP * C + 3 * C, fwd = li % 2 === 0;
      const len = XR - XL;
      if (d <= acc + len || li === lines.length - 1) {
        const k = clamp(d - acc, 0, len);
        return { x: fwd ? XL + k : XR - k, z: zm, dx: fwd ? 1 : -1, dz: 0 };
      }
      acc += len;
      const zn = (li + 1) * LINE_GAP * C + 3 * C;
      if (d <= acc + (zn - zm)) return { x: fwd ? XR : XL, z: zm + (d - acc), dx: 0, dz: 1 };
      acc += zn - zm;
    }
    return { x: XL, z: 0, dx: 1, dz: 0 };
  }
  const cx = (XL + XR) / 2, depth = (lines.length - 1) * LINE_GAP * C + 7 * C, cz = depth / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x17132a, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); scene.add(floor);
  // los dominós: una sola malla con muchas copias
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(TH, HH, WD), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }), doms.length);
  scene.add(inst);
  const PAPER_C = new THREE.Color(PAPER), LIME_C = new THREE.Color(LIME), PATH_C = new THREE.Color(0x4b4568), col = new THREE.Color();
  const M = new THREE.Matrix4(), T1 = new THREE.Matrix4(), RF = new THREE.Matrix4(), RY = new THREE.Matrix4(), T2 = new THREE.Matrix4();
  T2.makeTranslation(-TH / 2, HH / 2, 0);
  const YAW = { px: 0, nx: Math.PI, pz: -Math.PI / 2 };
  const DV = { px: [1, 0], nx: [-1, 0], pz: [0, 1] };
  doms.forEach((dm, i) => { dm.a = -1; dm.down = false; inst.setColorAt(i, PAPER_C); });
  const front = { x: first.x, z: first.z };
  const camP = new THREE.Vector3(first.x - 1.5, 0.75, first.z + 2), camL = new THREE.Vector3(first.x, 0.12, first.z);
  const v = new THREE.Vector3(), w2 = new THREE.Vector3(), upV = new THREE.Vector3(), down = new THREE.Vector3(0, 0, -1);
  W.onFrame((t, dt, p) => {
    const f = D * seg(p, 0.13, 0.8); // por dónde va la cadena
    let changed = false;
    doms.forEach((dm, i) => {
      let a;
      if (dm.first) {
        // de cara al piso → se para sola → cae y arranca la cadena
        a = lerp(Math.PI / 2 - 0.04, 0, ease(seg(p, 0.02, 0.08))) + ease(seg(p, 0.1, 0.13)) * (Math.PI / 2 - 0.04);
      } else a = ease(clamp((f - dm.d) / 0.5)) * (Math.PI / 2 - 0.04);
      if (Math.abs(a - dm.a) < 1e-4) return;
      dm.a = a; changed = true;
      const [dx, dz] = DV[dm.dir];
      T1.makeTranslation(dm.x + dx * TH / 2, 0, dm.z + dz * TH / 2);
      if (dm.dir === 'px') RF.makeRotationZ(-a); else if (dm.dir === 'nx') RF.makeRotationZ(a); else RF.makeRotationX(a);
      RY.makeRotationY(YAW[dm.dir]);
      M.copy(T1).multiply(RF).multiply(RY).multiply(T2);
      inst.setMatrixAt(i, M);
      const k = a / (Math.PI / 2);
      col.copy(PAPER_C).lerp(dm.letter ? LIME_C : PATH_C, dm.first ? 0 : (k > 0.85 ? 1 : k * 0.4));
      inst.setColorAt(i, col);
      const isDown = k > 0.6 && !dm.first;
      if (isDown && !dm.down) onFall && onFall();
      dm.down = isDown;
    });
    if (changed) { inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true; }
    // cámara: bajita, pegada al frente de la cadena
    const pt = p < 0.13 ? { x: first.x + 0.3, z: first.z, dx: 1, dz: 0 } : pathAt(f);
    front.x += (pt.x - front.x) * 0.12; front.z += (pt.z - front.z) * 0.12;
    const sideX = pt.dz ? -1.7 : -pt.dx * 1.4, sideZ = pt.dz ? -0.4 : 1.9;
    v.set(front.x + sideX, 0.7, front.z + sideZ);
    camP.lerp(v, 0.06);
    w2.set(front.x + pt.dx * 0.9, 0.12, front.z + pt.dz * 0.9);
    camL.lerp(w2, 0.1);
    // al final sube hasta verla desde arriba
    const top = ease(seg(p, 0.8, 0.97));
    const vfov = (camera.fov * Math.PI) / 180;
    const spanX = (XR - XL) / 2 + 1.4, spanZ = depth / 2 + 1.4;
    const hTop = Math.max(spanX / (Math.tan(vfov / 2) * camera.aspect), spanZ / Math.tan(vfov / 2));
    camera.position.set(lerp(camP.x, cx, top), lerp(camP.y, hTop, top), lerp(camP.z, cz + 0.001, top));
    upV.set(0, 1, 0).lerp(down, top).normalize();
    camera.up.copy(upV);
    camera.lookAt(lerp(camL.x, cx, top), lerp(camL.y, 0, top), lerp(camL.z, cz, top));
  });
  return W.api;
}
