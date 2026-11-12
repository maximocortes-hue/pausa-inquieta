// Etapa 02 — El corazón de la pausa. Lo que muestra la pantalla, en perspectiva:
// un salón antiguo de columnas y barandas ornamentadas, luz violeta y azul con
// destellos de color, y en el medio el semicírculo flúor, gastado, que late.
// Al final el piso se abre (de verdad: las dos mitades se van para abajo) y caés.
// La caída sigue al scroll y continúa en la etapa 03 hasta la planta baja.
import * as THREE from 'three';

const LIME = 0xd7ff3a;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function glowTexture(color = '215,255,58') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${color},.85)`); g.addColorStop(0.35, `rgba(${color},.25)`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function stoneTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 70 + (Math.random() - 0.5) * 50;
    img.data[i] = v * 0.85; img.data[i + 1] = v * 0.8; img.data[i + 2] = v * 1.15; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; x.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 60, Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function createSalon(canvas, { onFloor } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 760 ? 1.4 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const fogC = new THREE.Color(0x140c33);
  scene.background = fogC.clone();
  scene.fog = new THREE.Fog(fogC, 6, 30);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);

  scene.add(new THREE.HemisphereLight(0x7b63d6, 0x05030d, 0.6));
  const violet = new THREE.PointLight(0xa47cff, 40, 22, 1.5); violet.position.set(-2, 3.2, -4); scene.add(violet);
  const blue = new THREE.PointLight(0x1f3cff, 50, 26, 1.5); blue.position.set(2.4, 3.6, -12); scene.add(blue);
  const limeL = new THREE.PointLight(LIME, 12, 9, 1.8); limeL.position.set(0, 1.8, -7); scene.add(limeL);

  const stone = stoneTexture(); stone.repeat.set(1, 3);
  const colMat = new THREE.MeshStandardMaterial({ map: stone, color: 0xb6a9e8, roughness: 0.85 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x24184f, roughness: 0.35, metalness: 0.35 });
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // Piso en dos mitades, con bisagra a los costados (se abre hacia abajo)
  const halfW = 2.6, L = 34;
  const leftP = new THREE.Group(); leftP.position.set(-halfW, 0, -8); scene.add(leftP);
  const rightP = new THREE.Group(); rightP.position.set(halfW, 0, -8); scene.add(rightP);
  add(new THREE.BoxGeometry(halfW, 0.1, L), floorMat, halfW / 2, -0.05, 0, leftP);
  add(new THREE.BoxGeometry(halfW, 0.1, L), floorMat, -halfW / 2, -0.05, 0, rightP);
  // vacío de abajo, con un brillo flúor lejano
  const voidGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, opacity: 0.5 }));
  voidGlow.position.set(0, -14, -8); voidGlow.scale.set(14, 14, 1); scene.add(voidGlow);
  // piso exterior (fuera de las mitades)
  [-1, 1].forEach((s) => add(new THREE.BoxGeometry(6, 0.1, L), floorMat, s * (halfW + 3), -0.05, -8));

  // Columnas y capiteles
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.2, 18);
  const capGeo = new THREE.BoxGeometry(0.75, 0.22, 0.75);
  for (let i = 0; i < 9; i++) {
    const z = 2 - i * 3.6;
    [-3.1, 3.1].forEach((x) => {
      add(colGeo, colMat, x, 2.1, z);
      add(capGeo, colMat, x, 4.25, z);
      add(capGeo, colMat, x, 0.11, z);
    });
  }
  // techo con vigas
  for (let i = 0; i < 10; i++) add(new THREE.BoxGeometry(7, 0.3, 0.4), colMat, 0, 4.5, 2 - i * 3.6);
  // Barandas ornamentadas (balaustres torneados) a los costados
  const baluster = new THREE.LatheGeometry([
    new THREE.Vector2(0.07, 0), new THREE.Vector2(0.1, 0.06), new THREE.Vector2(0.05, 0.16), new THREE.Vector2(0.11, 0.36),
    new THREE.Vector2(0.06, 0.5), new THREE.Vector2(0.09, 0.62), new THREE.Vector2(0.07, 0.7),
  ], 10);
  const balMat = new THREE.MeshStandardMaterial({ color: 0x8f80c9, roughness: 0.8 });
  const balInst = new THREE.InstancedMesh(baluster, balMat, 2 * 60);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let i = 0; i < 60; i++) {
    const z = 2 - i * 0.5;
    [-2.75, 2.75].forEach((x) => { m4.makeTranslation(x, 0, z); balInst.setMatrixAt(n++, m4); });
  }
  scene.add(balInst);
  [-2.75, 2.75].forEach((x) => add(new THREE.BoxGeometry(0.22, 0.08, 30), balMat, x, 0.74, -12.5));

  // El semicírculo: medio disco con bordes gastados, flúor, que late
  const shape = new THREE.Shape();
  const R = 1.25;
  shape.moveTo(0, -R);
  for (let a = -Math.PI / 2; a <= Math.PI / 2 + 0.001; a += Math.PI / 90) {
    const rr = R * (1 - Math.random() * 0.025);
    shape.lineTo(-Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.lineTo(0, R);
  const semiGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, curveSegments: 64 });
  const semiMat = new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.9, roughness: 0.5, toneMapped: false });
  const semi = add(semiGeo, semiMat, 0.3, 1.9, -8);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  glow.position.set(-0.2, 1.9, -8.2); glow.scale.set(6.5, 6.5, 1); scene.add(glow);

  // Destellos de color en el aire
  const N = 260;
  const pts = new Float32Array(N * 3), cols = new Float32Array(N * 3);
  const palette = [[0.84, 1, 0.23], [0.64, 0.49, 1], [0.12, 0.24, 1], [1, 0.29, 0.17], [0.93, 0.92, 0.9]];
  for (let i = 0; i < N; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 6; pts[i * 3 + 1] = Math.random() * 4.2; pts[i * 3 + 2] = 2 - Math.random() * 30;
    const c = palette[Math.floor(Math.random() * palette.length)];
    cols[i * 3] = c[0]; cols[i * 3 + 1] = c[1]; cols[i * 3 + 2] = c[2];
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(sparks);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 72 : 55;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { look.tx = e.clientX / innerWidth - 0.5; look.ty = e.clientY / innerHeight - 0.5; });

  let p = 0, target = 0, opened = false;
  function apply(time, dt) {
    p += (target - p) * 0.08;
    look.x += (look.tx - look.x) * 0.04; look.y += (look.ty - look.y) * 0.04;

    // Latido del semicírculo
    const ph = (time % 1.05) / 1.05;
    const kick = ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) : ph > 0.2 && ph < 0.3 ? 0.6 * Math.sin(((ph - 0.2) / 0.1) * Math.PI) : 0;
    semi.scale.setScalar(1 + kick * 0.05);
    glow.material.opacity = 0.7 + kick * 0.25;
    semiMat.emissiveIntensity = 0.8 + kick * 0.4;

    // destellos que titilan y flotan
    sparks.rotation.y = Math.sin(time * 0.1) * 0.05;
    sparks.material.opacity = 0.6 + Math.sin(time * 3) * 0.2;

    // Cámara: entra desde la pantalla y avanza por el salón
    const walk = ease(seg(p, 0, 0.62));
    let cx = look.x * 0.4, cy = lerp(1.7, 1.75, walk), cz = lerp(6.5, -1.5, walk);
    let pitch = -look.y * 0.12;
    let openK = 0;

    // El piso se abre y caés: todo con el scroll (si dejás de scrollear, quedás
    // suspendido en la caída; seguir bajando es seguir cayendo)
    if (p > 0.64) {
      openK = ease(seg(p, 0.64, 0.74));
      const fall = seg(p, 0.7, 1);
      cy -= fall * fall * 16;
      pitch -= ease(seg(p, 0.7, 0.86)) * 1.25;
      cx += (Math.random() - 0.5) * 0.06 * fall;
      if (!opened) { opened = true; onFloor && onFloor(); }
    } else opened = false;
    voidGlow.scale.setScalar(14 + seg(p, 0.75, 1) * 26);
    leftP.rotation.z = -openK * 1.45;
    rightP.rotation.z = openK * 1.45;

    camera.position.set(cx, cy, cz);
    camera.rotation.set(pitch, -look.x * 0.15, 0);
    renderer.toneMappingExposure = 1.1;
  }

  let raf = 0;
  const clock = new THREE.Clock();
  const loop = () => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, clock.getDelta()); apply(clock.elapsedTime, dt); renderer.render(scene, camera); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { resize(); clock.getDelta(); loop(); }
    if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(canvas);

  return { setProgress(v) { target = v; }, resize };
}
