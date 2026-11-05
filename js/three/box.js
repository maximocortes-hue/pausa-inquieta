// La caja de Pausa Inquieta en 3D (Three.js), modelada por código.
// mode 'intro'  → cae, se abre, sale la tarjeta “¿Y qué vas a hacer?”
// mode 'reveal' → la caja abierta muestra el doble fondo y la tarjeta “¿Y ahora?”
import * as THREE from 'three';

const LIME = '#d7ff3a';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const bounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

// ---------- Texturas dibujadas en canvas ----------
export function paperCanvas(w, h, base = 18) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const img = x.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + (Math.random() - 0.5) * 14;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return [c, x];
}

export function toTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function lidTexture(ratio) {
  const w = 1024, h = Math.round(1024 * ratio);
  const [c, x] = paperCanvas(w, h, 20);
  x.fillStyle = '#d9d8d0';
  x.font = '500 76px "Inter Tight", sans-serif';
  x.textBaseline = 'top';
  x.fillText('Te sobran', 90, h * 0.2);
  x.fillText('25 minutos.', 90, h * 0.2 + 88);
  return toTex(c);
}

export function cardTextTexture(lines, white = false) {
  const w = 1024, h = 646;
  const [c, x] = paperCanvas(w, h, white ? 238 : 12);
  x.fillStyle = white ? '#0b0b0b' : '#ecebe5';
  x.font = '300 92px "Poppins", sans-serif';
  x.textBaseline = 'middle';
  const lh = 104;
  const y0 = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => x.fillText(l, 84, y0 + i * lh));
  return toTex(c);
}

export function cardSemiTexture(white = false) {
  const w = 1024, h = 646;
  const [c, x] = paperCanvas(w, h, white ? 238 : 12);
  x.save();
  x.shadowColor = white ? 'rgba(11,11,11,.25)' : LIME;
  x.shadowBlur = white ? 18 : 50;
  x.fillStyle = LIME;
  x.beginPath();
  x.arc(w, h / 2, h * 0.34, Math.PI / 2, Math.PI * 1.5);
  x.closePath();
  x.fill();
  x.restore();
  // bordes gastados
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    const a = Math.PI / 2 + Math.random() * Math.PI;
    const r = h * 0.34 + (Math.random() - 0.6) * 10;
    x.fillRect(w + Math.cos(a) * r, h / 2 + Math.sin(a) * r, Math.random() * 5, Math.random() * 5);
  }
  return toTex(c);
}

export function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,.75)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// ---------- Geometría ----------
export function buildBox() {
  const W = 3, D = 2.1, H = 0.78, t = 0.035;
  const mat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.86 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });
  const group = new THREE.Group();
  const base = new THREE.Group();
  group.add(base);
  const add = (geo, m, x, y, z, parent = base) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };
  add(new THREE.BoxGeometry(W, t, D), dark, 0, t / 2, 0);
  add(new THREE.BoxGeometry(W, H, t), mat, 0, H / 2, D / 2 - t / 2);
  add(new THREE.BoxGeometry(W, H, t), mat, 0, H / 2, -D / 2 + t / 2);
  add(new THREE.BoxGeometry(t, H, D), mat, -W / 2 + t / 2, H / 2, 0);
  add(new THREE.BoxGeometry(t, H, D), mat, W / 2 - t / 2, H / 2, 0);

  // Doble fondo
  const fb = add(new THREE.BoxGeometry(W - 2 * t - 0.02, 0.025, D - 2 * t - 0.02), new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.9 }), 0, 0.13, 0);
  const tab = add(new THREE.BoxGeometry(0.34, 0.01, 0.1), new THREE.MeshBasicMaterial({ color: LIME }), 0, 0.015, (D - 2 * t) / 2 - 0.12, fb);
  tab.position.y = 0.014;

  // Tapa con bisagra atrás
  const lid = new THREE.Group();
  lid.position.set(0, H, -D / 2);
  group.add(lid);
  const lidTop = new THREE.MeshStandardMaterial({ map: lidTexture((D + 0.03) / (W + 0.03)), roughness: 0.8 });
  add(new THREE.BoxGeometry(W + 0.03, t, D + 0.03), [mat, mat, lidTop, dark, mat, mat], 0, t / 2, D / 2, lid);
  add(new THREE.BoxGeometry(W + 0.03, 0.24, t), mat, 0, t - 0.12, D + 0.03, lid);

  // Semicírculo flúor sobre el borde derecho de la tapa
  const semi = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 48, Math.PI / 2, Math.PI),
    new THREE.MeshBasicMaterial({ color: LIME }),
  );
  semi.rotation.x = -Math.PI / 2;
  semi.position.set(W / 2 + 0.015, t + 0.003, D / 2 + 0.25);
  lid.add(semi);

  return { group, base, lid, fb, W, D, H, t };
}

export function buildCard(lines, white = false) {
  const CW = 1.9, CH = 1.2;
  const g = new THREE.Group();
  // La tarjeta blanca se ilumina un poco sola para no quedar gris bajo las luces violetas
  const paperMat = (map) => (white
    ? new THREE.MeshStandardMaterial({ map, roughness: 0.75, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.35 })
    : new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), paperMat(cardTextTexture(lines, white)));
  front.position.z = 0.007;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), paperMat(cardSemiTexture(white)));
  back.rotation.y = Math.PI;
  back.position.z = -0.007;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, 0.012), new THREE.MeshStandardMaterial({ color: white ? 0xdedcd4 : 0x0c0c0c, roughness: 0.9 }));
  g.add(edge, front, back);
  g.rotation.order = 'YXZ';
  return g;
}

export function buildOrbit() {
  // Bien abierta: rodea la caja sin atravesarla
  const curve = new THREE.EllipseCurve(0, 0, 4.4, 2.55, 0, Math.PI * 2);
  const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.85 }));
  line.rotation.z = 0.16;
  line.rotation.x = 0.1;
  return line;
}

// ---------- Escena ----------
export async function createBoxScene(canvas, { mode = 'intro', onLand } = {}) {
  if (document.fonts) { try { await document.fonts.load('300 92px "Poppins"'); await document.fonts.load('500 76px "Inter Tight"'); } catch (e) { /* ok */ } }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 760 ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xbfb8ff, 0x0b0b0b, mode === 'reveal' ? 0.8 : 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 7, 5);
  scene.add(key);
  const violet = new THREE.PointLight(0xa47cff, 16, 0, 1.6);
  violet.position.set(-4.5, 2, 2);
  scene.add(violet);
  const blue = new THREE.PointLight(0x1f3cff, 14, 0, 1.6);
  blue.position.set(4.5, 3, -3);
  scene.add(blue);
  const limeL = new THREE.PointLight(0xd7ff3a, 0, 0, 1.8);
  limeL.position.set(0, 1.4, 1.6);
  scene.add(limeL);

  const box = buildBox();
  const root = new THREE.Group();
  root.add(box.group);
  scene.add(root);

  const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 4.2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.002;
  root.add(blob);

  const orbit = buildOrbit();
  orbit.position.y = 0.5;
  root.add(orbit);

  // Caja del inicio: tarjeta blanca. Doble fondo: tarjeta negra.
  const card = mode === 'intro' ? buildCard(['¿Y qué vas', 'a hacer?'], true) : buildCard(['¿Y ahora?']);
  scene.add(card);

  if (mode === 'reveal') box.lid.rotation.x = -1.95;
  else box.fb.visible = true;

  // --- interacción: inclinación con el mouse + arrastre de la tarjeta
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const drag = { on: false, x: 0, rot: 0, vel: 0 };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
    tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.16;
    if (drag.on) { const dx = e.clientX - drag.x; drag.x = e.clientX; drag.vel = dx * 0.012; drag.rot += drag.vel; }
  });
  canvas.addEventListener('pointerdown', (e) => { drag.on = true; drag.x = e.clientX; });
  window.addEventListener('pointerup', () => { drag.on = false; });

  let W = 1, H = 1, portrait = false;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    portrait = W / H < 0.9;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let p = 0;
  let target = 0;
  let landed = false;
  const D = box.D, Hh = box.H, t = box.t;

  function apply() {
    p += (target - p) * 0.14;
    const zoom = portrait ? 1.65 : 1;
    if (mode === 'intro') {
      const f = seg(p, 0, 0.13);
      const look = seg(p, 0.13, 0.36);
      const o = seg(p, 0.36, 0.56);
      const r = seg(p, 0.54, 0.72);
      const s = seg(p, 0.7, 0.9);

      box.group.position.y = lerp(7.5, 0, bounce(f));
      box.group.rotation.set((1 - f) * 0.35, -0.5 + (1 - f) * 1.4 + look * 0.3, (1 - f) * -0.25);
      if (f >= 1 && !landed) { landed = true; onLand && onLand(); }
      if (f < 0.9) landed = false;
      blob.material.opacity = lerp(0.1, 1, f);
      blob.scale.setScalar(lerp(0.4, 1, f));

      box.lid.rotation.x = -ease(o) * 1.95;

      // tarjeta: acostada adentro (cara del semicírculo hacia arriba) → sube → gira → de frente
      const rise = outCubic(r);
      const spin = ease(s);
      card.position.set(0, lerp(t + 0.03, 2.1, rise) + spin * 0.15, lerp(0, 0.6, spin));
      card.rotation.x = lerp(Math.PI / 2 + 0.55 * rise, -0.16, spin);
      card.rotation.y = spin * Math.PI * 2 + (s >= 1 ? drag.rot : 0);
      card.scale.setScalar(lerp(1, 1.25, spin));
      card.visible = o > 0.2;
      limeL.intensity = 4 * rise;

      orbit.rotation.y += 0.002;
      orbit.material.opacity = 0.85 * f;

      const camZ = lerp(10.5, 8.6, look) - spin * 0.9;
      const camY = lerp(4.4, 3.6, look) - spin * 0.6;
      camera.position.set(0, camY * (portrait ? 1.1 : 1), camZ * zoom);
      camera.lookAt(0, lerp(0.4, 1.1, rise) + spin * 0.6, 0);
    } else {
      const inn = seg(p, 0, 0.12);
      const fb = seg(p, 0.12, 0.4);
      const r = seg(p, 0.4, 0.6);
      const s = seg(p, 0.58, 0.82);
      const out = seg(p, 0.86, 1);

      box.group.position.y = lerp(-1.2, 0, outCubic(inn)) - out * 0.8;
      box.group.rotation.set(0, -0.35 + inn * 0.2, 0);
      blob.material.opacity = inn;

      const lift = ease(fb);
      box.fb.position.set(lift * 3.6, 0.13 + Math.sin(lift * Math.PI) * 2 + lift * 0.4, lift * 0.6);
      box.fb.rotation.set(lift * 0.9, 0, -lift * 0.8);
      box.fb.visible = fb < 0.999;

      const rise = outCubic(r);
      const spin = ease(s);
      card.position.set(0, lerp(t + 0.03, 2.0, rise) + spin * 0.2 + out * 0.4, lerp(0, 0.8, spin));
      card.rotation.x = lerp(Math.PI / 2 + 0.55 * rise, -0.12, spin);
      card.rotation.y = spin * Math.PI * 2 + (s >= 1 ? drag.rot : 0);
      card.scale.setScalar(lerp(1, 1.3, spin));
      card.visible = fb > 0.3;
      limeL.intensity = 4 * rise;
      orbit.rotation.y += 0.002;
      orbit.material.opacity = 0.85 * inn * (1 - out);

      // cámara: arriba mirando adentro → de frente
      const front = ease(seg(p, 0.35, 0.7));
      camera.position.set(0, lerp(8.5, 3.2, front), lerp(3.2, 7.4, front) * zoom);
      camera.lookAt(0, lerp(0, 1.4, front), 0);
    }

    // inclinación suave con el mouse
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    root.rotation.y = tilt.x;
    root.rotation.x = tilt.y * 0.5;
    if (!drag.on) { drag.rot *= 0.94; }
  }

  let visible = false;
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    apply();
    renderer.render(scene, camera);
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { resize(); loop(); }
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(canvas);

  return {
    setProgress(v) { target = v; },
    resize,
  };
}
