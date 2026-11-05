// Etapa 01 — Antes de entrar. El aula en 3D, recorrida con el scroll:
// la puerta con el mapping (semicírculo, logo, promesa) y los lentes UV,
// la puerta se abre, la cámara entra, las tres líneas del piso, el escritorio
// intervenido por las tramas de Pausa Inquieta: teclado tapado con una tela,
// la caja negra encima ("Te sobran 25 minutos"), la tarjeta, la hoja y el lápiz,
// el monitor apagado que se prende. Al final la cámara entra en la pantalla.
import * as THREE from 'three';
import { buildBox, buildCard, paperCanvas, toTex } from './box.js';

const LIME = 0xd7ff3a, VIOLET = 0xa47cff, BLUE = 0x1f3cff, RED = 0xff4b2b, PAPER = 0xecebe5, INK = 0x0b0b0b;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const outBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const loadImg = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

// ---------- Texturas ----------
function noiseCanvas(w, h, base, spread, tint = [1, 1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const img = x.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + (Math.random() - 0.5) * spread;
    img.data[i] = v * tint[0]; img.data[i + 1] = v * tint[1]; img.data[i + 2] = v * tint[2]; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // manchas suaves (desgaste)
  for (let k = 0; k < 18; k++) {
    const g = x.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 40 + Math.random() * 120);
    g.addColorStop(0, `rgba(0,0,0,${0.03 + Math.random() * 0.05})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  return c;
}
function repTex(c, rx, ry) { const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }

// La puerta con el mapping (normal o con lentes UV: misma imagen, otros colores)
function doorCanvas(logo, uv = false) {
  const w = 512, h = 1024;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = uv ? '#1b0f3b' : '#1a1a19'; x.fillRect(0, 0, w, h);
  // semicírculo con glow
  x.save();
  x.shadowColor = uv ? '#a47cff' : '#d7ff3a'; x.shadowBlur = 70;
  x.fillStyle = uv ? '#c7a8ff' : '#d7ff3a';
  x.beginPath(); x.arc(w / 2 + 70, 330, 150, Math.PI / 2, Math.PI * 1.5); x.closePath(); x.fill();
  x.restore();
  // logo original
  if (logo) {
    const lw = 360, lh = lw * (logo.height / logo.width);
    if (uv) {
      const t = document.createElement('canvas'); t.width = lw; t.height = lh;
      const tx = t.getContext('2d'); tx.drawImage(logo, 0, 0, lw, lh); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#d9c7ff'; tx.fillRect(0, 0, lw, lh);
      x.drawImage(t, (w - lw) / 2, 560);
    } else x.drawImage(logo, (w - lw) / 2, 560, lw, lh);
  }
  // promesa
  x.fillStyle = uv ? '#d9c7ff' : '#ecebe5';
  x.font = '400 30px "Inter Tight", sans-serif';
  x.textAlign = 'center';
  x.fillText('Entrá, por una vez,', w / 2, 800);
  x.fillText('no hay nada que cumplir.', w / 2, 840);
  return c;
}

// Pantalla del monitor: apagada o encendida (el salón con el semicírculo)
function screenCanvas(on) {
  const w = 512, h = 300;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (!on) {
    x.fillStyle = '#060606'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    return c;
  }
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#120a2e'); g.addColorStop(1, '#2a1e66');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // columnas en perspectiva
  for (let i = 0; i < 6; i++) {
    const s = 1 - i * 0.13;
    const cw = 26 * s, chh = 230 * s;
    x.fillStyle = `rgba(80,60,160,${0.9 - i * 0.12})`;
    x.fillRect(40 + i * 30, h / 2 - chh / 2, cw, chh);
    x.fillRect(w - 40 - i * 30 - cw, h / 2 - chh / 2, cw, chh);
  }
  x.fillStyle = 'rgba(164,124,255,.35)'; x.fillRect(0, h * 0.7, w, h * 0.3);
  x.save(); x.shadowColor = '#d7ff3a'; x.shadowBlur = 40; x.fillStyle = '#d7ff3a';
  x.beginPath(); x.arc(w / 2 + 20, h / 2, 62, Math.PI / 2, Math.PI * 1.5); x.closePath(); x.fill(); x.restore();
  return c;
}

function clothCanvas() {
  const w = 256, h = 128;
  const c = noiseCanvas(w, h, 150, 22);
  const x = c.getContext('2d');
  for (let i = 0; i < w; i += 9) { x.fillStyle = `rgba(0,0,0,${0.06 + (i % 18 ? 0.02 : 0.05)})`; x.fillRect(i, 0, 4, h); }
  return c;
}

function sheetCanvas() {
  const c = noiseCanvas(256, 360, 246, 8);
  return c;
}

// ---------- Escena ----------
export async function createAula(canvas) {
  if (document.fonts) { try { await document.fonts.load('400 30px "Inter Tight"'); await document.fonts.load('300 92px "Poppins"'); } catch (e) { /* ok */ } }
  const logo = await loadImg('assets/img/logo-white.png');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 760 ? 1.4 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(0x0b0b0b, 9, 26);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 60);

  // Luces: afuera oscuro (solo el proyector); adentro, luz de aula
  const hemi = new THREE.HemisphereLight(0xf4f2ea, 0x3a3830, 0.15);
  scene.add(hemi);
  const room = new THREE.PointLight(0xfff6e8, 0, 18, 1.4);
  room.position.set(0.5, 3, -5);
  room.castShadow = true;
  room.shadow.mapSize.set(1024, 1024);
  scene.add(room);
  const deskLight = new THREE.SpotLight(0xffffff, 0, 6, 0.6, 0.6, 1.2);
  deskLight.position.set(2.4, 2.9, -5.2);
  deskLight.castShadow = true;
  scene.add(deskLight);
  const violet = new THREE.PointLight(VIOLET, 3, 9, 1.6); violet.position.set(-5, 2, -6); scene.add(violet);
  const blue = new THREE.PointLight(BLUE, 3, 9, 1.6); blue.position.set(5, 2, -11); scene.add(blue);
  // proyector del mapping (afuera)
  const proj = new THREE.SpotLight(0xffffff, 18, 12, 0.35, 0.5, 1);
  proj.position.set(0, 2.6, 9);
  proj.target.position.set(0, 1.3, 4);
  scene.add(proj, proj.target);

  // Materiales
  const wallIn = new THREE.MeshStandardMaterial({ map: repTex(noiseCanvas(256, 256, 228, 14), 4, 2), roughness: 0.95 });
  const wallOut = new THREE.MeshStandardMaterial({ color: 0x141413, roughness: 1 });
  const floorMat = new THREE.MeshStandardMaterial({ map: repTex(noiseCanvas(256, 256, 120, 26), 8, 8), roughness: 0.9 });
  const inkMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });
  const deskMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.8 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });

  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // Piso (adentro y afuera)
  const floor = add(new THREE.PlaneGeometry(40, 40), floorMat, 0, 0, -4);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  // Techo del aula
  const ceil = add(new THREE.PlaneGeometry(16, 18), new THREE.MeshStandardMaterial({ color: 0xbdbab0, roughness: 1 }), 0, 3.3, -5);
  ceil.rotation.x = Math.PI / 2;
  // Paredes del aula
  const W = 7, D0 = 4, D1 = -14, H = 3.3;
  const back = add(new THREE.PlaneGeometry(W * 2, H), wallIn, 0, H / 2, D1);
  const left = add(new THREE.PlaneGeometry(D0 - D1, H), wallIn, -W, H / 2, (D0 + D1) / 2); left.rotation.y = Math.PI / 2;
  const right = add(new THREE.PlaneGeometry(D0 - D1, H), wallIn, W, H / 2, (D0 + D1) / 2); right.rotation.y = -Math.PI / 2;
  [back, left, right].forEach((m) => { m.receiveShadow = true; });
  // Pared de la puerta (con hueco): cara de afuera oscura, cara de adentro papel
  const DW = 1.2, DH = 2.3;
  const frontParts = [
    [(W - DW / 2) , H, -(W + DW / 2) / 2 - DW / 4 + 0.0, H / 2],
  ];
  const mkWall = (w, h, x, y) => {
    const g = new THREE.BoxGeometry(w, h, 0.18);
    const m = new THREE.Mesh(g, [wallIn, wallIn, wallIn, wallIn, wallOut, wallIn]);
    m.position.set(x, y, D0); scene.add(m); return m;
  };
  const sideW = W - DW / 2;
  mkWall(sideW, H, -(DW / 2 + sideW / 2), H / 2);
  mkWall(sideW, H, DW / 2 + sideW / 2, H / 2);
  mkWall(DW, H - DH, 0, DH + (H - DH) / 2);
  void frontParts;
  // pasillo de afuera (oscuro)
  const hallL = add(new THREE.PlaneGeometry(10, H), wallOut, -3, H / 2, 9); hallL.rotation.y = Math.PI / 2;
  const hallR = add(new THREE.PlaneGeometry(10, H), wallOut, 3, H / 2, 9); hallR.rotation.y = -Math.PI / 2;

  // Marco y puerta (con bisagra a la izquierda)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.7 });
  add(new THREE.BoxGeometry(0.08, DH, 0.24), frameMat, -DW / 2, DH / 2, D0);
  add(new THREE.BoxGeometry(0.08, DH, 0.24), frameMat, DW / 2, DH / 2, D0);
  add(new THREE.BoxGeometry(DW + 0.08, 0.08, 0.24), frameMat, 0, DH, D0);
  const doorPivot = new THREE.Group(); doorPivot.position.set(-DW / 2 + 0.04, 0, D0 + 0.02); scene.add(doorPivot);
  const mapTex = toTex(doorCanvas(logo, false));
  const uvTex = toTex(doorCanvas(logo, true));
  const doorFront = new THREE.MeshBasicMaterial({ map: mapTex });
  const doorUV = new THREE.MeshBasicMaterial({ map: uvTex, transparent: true, opacity: 0 });
  const doorBack = new THREE.MeshStandardMaterial({ color: 0x1e1e1c, roughness: 0.6 });
  const door = add(new THREE.BoxGeometry(DW - 0.08, DH - 0.04, 0.05), [doorBack, doorBack, doorBack, doorBack, doorFront, doorBack], (DW - 0.08) / 2, (DH - 0.04) / 2, 0, doorPivot);
  const doorUVPlane = add(new THREE.PlaneGeometry(DW - 0.08, DH - 0.04), doorUV, (DW - 0.08) / 2, (DH - 0.04) / 2, 0.03, doorPivot);
  // semicírculo del mapping proyectado sobre la pared, arriba de la puerta
  const semiMat = new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.95 });
  const wallSemi = add(new THREE.CircleGeometry(0.42, 48, Math.PI / 2, Math.PI), semiMat, 0.12, DH + 0.5, D0 + 0.1);
  const glowC = document.createElement("canvas"); glowC.width = glowC.height = 128; { const gx = glowC.getContext("2d"); const gg = gx.createRadialGradient(64, 64, 0, 64, 64, 64); gg.addColorStop(0, "rgba(255,255,255,.55)"); gg.addColorStop(1, "rgba(255,255,255,0)"); gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128); }
  const semiGlow = add(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ color: LIME, map: new THREE.CanvasTexture(glowC), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }), 0, DH + 0.5, D0 + 0.095);

  // ---------- Las tres líneas del piso ----------
  const lines = [];
  const lineMk = (color, from, to) => {
    const dx = to[0] - from[0], dz = to[1] - from[1];
    const len = Math.hypot(dx, dz);
    const g = new THREE.PlaneGeometry(0.07, len); g.translate(0, len / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(dx, -dz) * -1;
    m.position.set(from[0], 0.006, from[1]);
    m.scale.y = 0.0001;
    scene.add(m);
    lines.push(m);
  };
  const DESK = { x: 2.6, z: -6.4 };
  lineMk(LIME, [0.15, 3.6], [DESK.x, DESK.z + 0.9]);
  lineMk(PAPER, [0, 3.6], [-3.4, -7.6]);
  lineMk(PAPER, [-0.15, 3.6], [-0.4, -12]);

  // ---------- Escritorios ----------
  function desk(x, z, mine = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const top = add(new THREE.BoxGeometry(1.5, 0.05, 0.8), deskMat, 0, 0.74, 0, g); top.castShadow = top.receiveShadow = true;
    [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(([lx, lz]) => add(new THREE.BoxGeometry(0.04, 0.74, 0.04), legMat, lx, 0.37, lz, g));
    // monitor
    const mon = new THREE.Group(); mon.position.set(0, 0.77, -0.24); g.add(mon);
    add(new THREE.BoxGeometry(0.08, 0.18, 0.06), legMat, 0, 0.09, 0, mon);
    const bezel = add(new THREE.BoxGeometry(0.86, 0.52, 0.04), inkMat, 0, 0.44, 0, mon); bezel.castShadow = true;
    const screen = add(new THREE.PlaneGeometry(0.8, 0.46), new THREE.MeshBasicMaterial({ map: toTex(screenCanvas(false)) }), 0, 0.44, 0.021, mon);
    return { g, top, mon, screen };
  }
  const mine = desk(DESK.x, DESK.z, true);
  desk(-3.4, -8.4);
  desk(-0.4, -12.8);
  const screenOff = mine.screen.material.map;
  const screenOn = toTex(screenCanvas(true));

  // Teclado tapado con una tela
  const clothMat = new THREE.MeshStandardMaterial({ map: toTex(clothCanvas()), roughness: 1 });
  const clothGeo = new THREE.BoxGeometry(0.62, 0.05, 0.26, 12, 1, 6);
  { // arrugas
    const pos = clothGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) { if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + Math.sin(pos.getX(i) * 22) * 0.008 + Math.random() * 0.006); }
    clothGeo.computeVertexNormals();
  }
  const cloth = add(clothGeo, clothMat, 0, 0.79, 0.14, mine.g); cloth.castShadow = true;

  // La caja negra encima (la misma de la web, a escala real)
  const box = buildBox();
  const BS = 0.19;
  box.group.scale.setScalar(BS);
  box.group.position.set(0, 0.815, 0.14);
  mine.g.add(box.group);
  box.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // La tarjeta (blanca): "¿Y qué vas a hacer?"
  const card = buildCard(['¿Y qué vas', 'a hacer?'], true);
  card.scale.setScalar(BS);
  mine.g.add(card);
  card.visible = false;
  // Hoja y lápiz
  const sheet = add(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: toTex(sheetCanvas()), roughness: 0.9 }), 0.52, 0.768, 0.12, mine.g);
  sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = -0.12; sheet.receiveShadow = true;
  const pencil = new THREE.Group(); pencil.position.set(0.6, 0.776, 0.1); pencil.rotation.y = 0.6; mine.g.add(pencil);
  const pb = add(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }), 0, 0, 0, pencil); pb.rotation.z = Math.PI / 2; pb.castShadow = true;
  const pt = add(new THREE.ConeGeometry(0.006, 0.02, 6), new THREE.MeshStandardMaterial({ color: 0xd9c9a8 }), 0.095, 0, 0, pencil); pt.rotation.z = -Math.PI / 2;

  // Tramas de Pausa Inquieta sobre tu lugar (en el piso, alrededor del escritorio)
  const tramas = new THREE.Group(); tramas.position.set(DESK.x, 0.008, DESK.z); scene.add(tramas);
  const flat = (geo, color, x, z, rz = 0, op = 1) => { const m = add(geo, new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op }), x, 0, z, tramas); m.rotation.x = -Math.PI / 2; m.rotation.z = rz; m.scale.setScalar(0.0001); return m; };
  const tr = [
    flat(new THREE.CircleGeometry(0.55, 40, Math.PI / 2, Math.PI), LIME, -1.25, 0.2, 0.3),
    flat(new THREE.CircleGeometry(0.42, 40), VIOLET, 1.3, -0.4),
    flat(new THREE.PlaneGeometry(0.12, 1.1), BLUE, -1.0, -0.9, 0.4),
    flat(new THREE.CircleGeometry(0.16, 30), RED, 1.0, 0.75),
    flat(new THREE.RingGeometry(0.68, 0.71, 64), PAPER, 0, 0.1, 0, 0.9),
    flat(new THREE.PlaneGeometry(0.7, 0.08), LIME, 0.8, 1.05, -0.2),
  ];

  // ---------- Interacción: el mouse mueve apenas la mirada ----------
  let portrait = false;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { look.tx = (e.clientX / innerWidth - 0.5); look.ty = (e.clientY / innerHeight - 0.5); });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    portrait = w / h < 0.9;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 66 : 50;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Recorrido de cámara (keyframes por progreso) ----------
  const KF = [
    { p: 0.00, pos: [0, 1.55, 10.5], at: [0, 1.6, 4] },
    { p: 0.10, pos: [0, 1.6, 7.6], at: [0, 1.75, 4] },
    { p: 0.22, pos: [0, 1.6, 6.0], at: [0, 1.5, 0] },
    { p: 0.32, pos: [0, 1.65, 3.2], at: [0, 0.4, -3] },
    { p: 0.42, pos: [0.4, 2.4, 1.2], at: [1.2, 0, -5] },
    { p: 0.52, pos: [1.6, 1.75, -3.2], at: [2.6, 0.85, -6.3] },
    { p: 0.62, pos: [2.25, 1.45, -4.75], at: [2.6, 0.85, -6.3] },
    { p: 0.72, pos: [2.55, 1.35, -5.0], at: [2.6, 0.95, -6.35] },
    { p: 0.80, pos: [2.6, 1.3, -5.25], at: [2.6, 1.18, -6.64] },
    { p: 0.93, pos: [2.6, 1.21, -6.42], at: [2.6, 1.21, -6.7] },
    { p: 1.00, pos: [2.6, 1.21, -6.52], at: [2.6, 1.21, -6.8] },
  ];
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const camPos = new THREE.Vector3(), camAt = new THREE.Vector3();
  function cameraAt(p) {
    let i = 0; while (i < KF.length - 2 && p > KF[i + 1].p) i++;
    const a = KF[i], b = KF[i + 1];
    const t = ease(seg(p, a.p, b.p));
    camPos.copy(v3(a.pos)).lerp(v3(b.pos), t);
    camAt.copy(v3(a.at)).lerp(v3(b.at), t);
    // en pantallas verticales, la cámara se aleja un poco (salvo al entrar en la pantalla)
    if (portrait) { const k = 1 + 0.65 * (1 - seg(p, 0.8, 0.9)); camPos.sub(camAt).multiplyScalar(k).add(camAt); }
  }

  let p = 0, target = 0;
  const bounds = {};
  function apply(time) {
    p += (target - p) * 0.1;
    cameraAt(p);
    look.x += (look.tx - look.x) * 0.05; look.y += (look.ty - look.y) * 0.05;
    camera.position.copy(camPos);
    camera.lookAt(camAt.x + look.x * 0.35 * (1 - seg(p, 0.8, 0.95)), camAt.y - look.y * 0.2 * (1 - seg(p, 0.8, 0.95)), camAt.z);

    // Lentes UV: el mismo mapping, en violeta (no revela nada nuevo)
    const uv = seg(p, 0.08, 0.12) * (1 - seg(p, 0.18, 0.22));
    doorUV.opacity = uv;
    semiMat.color.set(uv > 0.5 ? 0xc7a8ff : LIME);
    semiGlow.material.color.set(uv > 0.5 ? VIOLET : LIME);
    // el semicírculo late, leve
    const beat = 1 + Math.max(0, Math.sin(time * 5.2)) * 0.04;
    wallSemi.scale.setScalar(beat); semiGlow.scale.setScalar(beat * (1 + uv * 0.2));

    // La puerta se abre y se prende la luz del aula
    const open = ease(seg(p, 0.2, 0.3));
    doorPivot.rotation.y = open * 1.75;
    const inside = seg(p, 0.24, 0.34);
    room.intensity = inside * 26;
    hemi.intensity = 0.15 + inside * 0.75;
    scene.fog.color.setRGB(lerp(0.043, 0.85, inside), lerp(0.043, 0.84, inside), lerp(0.043, 0.8, inside));
    scene.background.copy(scene.fog.color);
    proj.intensity = 18 * (1 - inside);

    // Las líneas se dibujan en el piso
    lines.forEach((l, i) => { l.scale.y = Math.max(0.0001, outCubic(seg(p, 0.3 + i * 0.03, 0.44 + i * 0.03))); });
    // Tramas sobre tu lugar
    tr.forEach((m, i) => { m.scale.setScalar(Math.max(0.0001, outBack(seg(p, 0.42 + i * 0.015, 0.5 + i * 0.015)))); });
    deskLight.intensity = seg(p, 0.44, 0.52) * 9;

    // La caja aparece encima del teclado tapado, se abre, sale la tarjeta
    const bx = outBack(seg(p, 0.5, 0.56));
    box.group.scale.setScalar(BS * Math.max(0.0001, bx));
    cloth.scale.setScalar(Math.max(0.0001, outBack(seg(p, 0.48, 0.53))));
    const o = ease(seg(p, 0.58, 0.64));
    box.lid.rotation.x = -o * 1.95;
    const r = outCubic(seg(p, 0.62, 0.68));
    const s = ease(seg(p, 0.66, 0.72));
    card.visible = o > 0.3 && p < 0.78;
    card.position.set(0, 0.82 + lerp(0.01, 0.34, r) + s * 0.05, 0.14 + s * 0.12);
    card.rotation.order = 'YXZ';
    card.rotation.x = lerp(Math.PI / 2 + 0.55 * r, -0.25, s);
    card.rotation.y = s * Math.PI * 2;
    // hoja y lápiz
    const sh = outBack(seg(p, 0.68, 0.73));
    sheet.scale.setScalar(Math.max(0.0001, sh)); pencil.scale.setScalar(Math.max(0.0001, sh));
    // el monitor se prende (titila)
    const on = p > 0.75 && (p > 0.78 || Math.sin(time * 60) > 0);
    mine.screen.material.map = on ? screenOn : screenOff;
    bounds.screenOn = on;
  }

  let raf = 0;
  const clock = new THREE.Clock();
  const loop = () => { raf = requestAnimationFrame(loop); apply(clock.getElapsedTime()); renderer.render(scene, camera); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { resize(); loop(); }
    if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(canvas);

  return {
    setProgress(v) { target = v; },
    get progress() { return p; },
    resize,
  };
}
