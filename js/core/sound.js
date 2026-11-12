// Sonido sintetizado con Web Audio: latido, tic-tac, pitidos, ruido de tele.
// No usa archivos: todo se genera en el navegador (liviano y sin licencias).
// Arranca apagado; se habilita con un gesto del usuario (regla de los navegadores).

const KEY = 'pi-sound';
let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = false;
let voiceBus = null;
// Volumen de la voz de PI (se puede bajar o mutear mientras habla)
const VKEY = "pi-voice";
const voiceState = (() => { try { const v = JSON.parse(sessionStorage.getItem(VKEY)); if (v && typeof v.vol === "number") return v; } catch (e) { /* ignore */ } return { vol: 0.8, muted: false }; })();
const voiceListeners = new Set();
function applyVoice() { if (voiceBus) voiceBus.gain.value = voiceState.muted ? 0 : voiceState.vol * 1.25; }
const listeners = new Set();

function store(v) { try { sessionStorage.setItem(KEY, v); } catch (e) { /* sin storage */ } }
export function savedPref() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  voiceBus = ctx.createGain();
  voiceBus.connect(master);
  applyVoice();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function env(g, t, a, peak, r) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + r);
}

function noiseSrc() {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.loopStart = Math.random();
  return s;
}

function ok() { return enabled && ctx && ctx.state === 'running'; }

export const sound = {
  get enabled() { return enabled; },

  async enable() {
    if (!ensure()) return;
    try { await ctx.resume(); } catch (e) { /* ignore */ }
    enabled = true; store('on');
    listeners.forEach((fn) => fn(enabled));
  },
  disable() {
    enabled = false; store('off');
    listeners.forEach((fn) => fn(enabled));
  },
  toggle() { return enabled ? this.disable() : this.enable(); },
  onChange(fn) { listeners.add(fn); },

  // Voz de PI: volumen 0..1 y mute
  get voiceVol() { return voiceState.vol; },
  get voiceMuted() { return voiceState.muted || voiceState.vol < 0.01; },
  setVoice({ vol, muted } = {}) {
    if (typeof vol === "number") voiceState.vol = Math.max(0, Math.min(1, vol));
    if (typeof muted === "boolean") voiceState.muted = muted;
    if (voiceState.vol > 0.01 && vol !== undefined) voiceState.muted = false;
    try { sessionStorage.setItem(VKEY, JSON.stringify(voiceState)); } catch (e) { /* ignore */ }
    applyVoice();
    voiceListeners.forEach((fn) => fn(voiceState));
  },
  onVoice(fn) { voiceListeners.add(fn); },

  // Latido: dos golpes graves (lub-dub)
  beat(intensity = 0.5) {
    if (!ok()) return;
    const t = ctx.currentTime;
    [0, 0.2].forEach((off, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(i ? 52 : 62, t + off);
      o.frequency.exponentialRampToValueAtTime(34, t + off + 0.16);
      env(g, t + off, 0.012, (i ? 0.35 : 0.55) * intensity + 0.02, 0.2);
      o.connect(g).connect(master);
      o.start(t + off); o.stop(t + off + 0.3);
    });
  },

  // Tic de reloj
  tick(vol = 0.25, hi = true) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const s = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = hi ? 4200 : 2600; f.Q.value = 6;
    const g = ctx.createGain();
    env(g, t, 0.002, vol, 0.04);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + 0.06);
  },

  // Reloj de verdad: el mecanismo (clic seco) + la caja que resuena; tic y tac distintos
  clock(vol = 0.4, tock = false) {
    if (!ok()) return;
    const t = ctx.currentTime;
    // el golpe del escape: ruido muy corto y agudo
    const s = noiseSrc();
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
    const g = ctx.createGain(); env(g, t, 0.0008, vol, 0.018);
    s.connect(hp).connect(g).connect(master); s.start(t); s.stop(t + 0.04);
    // la resonancia metálica (dos parciales) y el cuerpo de madera
    [[tock ? 1850 : 2450, 0.5, 0.05], [tock ? 3900 : 5100, 0.25, 0.03], [tock ? 620 : 760, 0.6, 0.035]].forEach(([fq, k, d]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = fq;
      const og = ctx.createGain(); env(og, t, 0.001, vol * k, d);
      o.connect(og).connect(master); o.start(t); o.stop(t + d + 0.03);
    });
    // un segundo golpecito apenas después (el ancla del reloj)
    const s2 = noiseSrc();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = tock ? 3000 : 3600; bp.Q.value = 4;
    const g2 = ctx.createGain(); env(g2, t + 0.012, 0.0008, vol * 0.45, 0.012);
    s2.connect(bp).connect(g2).connect(master); s2.start(t + 0.01); s2.stop(t + 0.04);
  },

  // Pitido
  beep(freq = 980, dur = 0.12, vol = 0.07, type = 'square') {
    if (!ok()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    env(g, t, 0.005, vol, dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  },

  // Click de tecla
  click(vol = 0.18) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const s = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1800;
    const g = ctx.createGain();
    env(g, t, 0.001, vol, 0.03);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + 0.05);
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    o.frequency.value = 180;
    env(g2, t, 0.001, vol * 0.6, 0.05);
    o.connect(g2).connect(master);
    o.start(t); o.stop(t + 0.08);
  },

  // Ráfaga de ruido de tele
  static(dur = 0.6, vol = 0.18) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const s = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  },

  // Golpe grave (caída)
  thud(vol = 0.6) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.45);
    env(g, t, 0.005, vol, 0.5);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.6);
    this.static(0.18, 0.06);
  },

  // Barrido de aire
  whoosh(dur = 0.7, vol = 0.12, up = true) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const s = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(up ? 300 : 3000, t);
    f.frequency.exponentialRampToValueAtTime(up ? 3200 : 260, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  },

  // De inquieta a pausa: un ruido de tele que se apaga y deja un colchón grave
  // y un último latido. Para cuando algo se arma porque no hiciste nada.
  settle(vol = 0.1) {
    if (!ok()) return;
    const t = ctx.currentTime;
    // 1. ruido que se cierra (filtro que baja)
    const s = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(6000, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.9, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + 1.7);
    // 2. colchón grave que entra lento (quinta suave, levemente desafinada)
    [[98, 0], [147, 0.12], [196.5, 0.25]].forEach(([fr, d], i) => {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      o.type = i ? 'triangle' : 'sine';
      o.frequency.value = fr;
      lp.type = 'lowpass'; lp.frequency.value = 900;
      og.gain.setValueAtTime(0.0001, t + 0.5 + d);
      og.gain.exponentialRampToValueAtTime(vol * (i ? 0.35 : 0.6), t + 1.3 + d);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      o.connect(lp).connect(og).connect(master);
      o.start(t + 0.5 + d); o.stop(t + 4.3);
    });
    // 3. un latido, leve, cuando ya está calmo
    setTimeout(() => this.beat(0.35), 1500);
  },

  // Algo escondido que aparece: crujido de papel/estática corto + tono cálido que respira
  reveal(vol = 0.09) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const s = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.9;
    const g = ctx.createGain();
    // crujido en ráfagas
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 6; i++) {
      const at = t + i * 0.045 + Math.random() * 0.02;
      g.gain.setValueAtTime(vol * (0.4 + Math.random() * 0.6), at);
      g.gain.setValueAtTime(0.0001, at + 0.02);
    }
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + 0.4);
    // tono cálido con trémolo lento (respira)
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 220;
    o.frequency.setValueAtTime(207, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(220, t + 1.2);
    const trem = ctx.createGain();
    trem.gain.value = 1;
    lfo.frequency.value = 3.2; lg.gain.value = 0.3;
    lfo.connect(lg).connect(trem.gain);
    og.gain.setValueAtTime(0.0001, t + 0.3);
    og.gain.exponentialRampToValueAtTime(vol * 0.8, t + 0.9);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    o.connect(trem).connect(og).connect(master);
    o.start(t + 0.3); lfo.start(t + 0.3);
    o.stop(t + 3.5); lfo.stop(t + 3.5);
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.value = 330;
    env(g2, t + 0.6, 0.4, vol * 0.3, 2.2);
    o2.connect(g2).connect(master);
    o2.start(t + 0.6); o2.stop(t + 3.4);
  },

  // Voz de PI: un "bip" corto por letra, con un poco de ruido y altura que varía
  // (al estilo de los diálogos de los videojuegos, sin palabras).
  // rough: 0 = PI (Pausa), 1 = su lado Ruido (más grave, áspero).
  voice(rough = 0, vol = 0.05) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = rough > 0.5 ? 'sawtooth' : 'square';
    const base = rough > 0.5 ? 120 : 290;
    o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.25), t);
    o.frequency.exponentialRampToValueAtTime(base * (0.8 + Math.random() * 0.15), t + 0.05);
    f.type = 'lowpass'; f.frequency.value = rough > 0.5 ? 900 : 2200;
    env(g, t, 0.003, vol, 0.045);
    o.connect(f).connect(g).connect(voiceBus);
    o.start(t); o.stop(t + 0.07);
    // un poco de soplido de ruido encima
    const s = noiseSrc();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = rough > 0.5 ? 700 : 2600; nf.Q.value = 2;
    const ng = ctx.createGain();
    env(ng, t, 0.002, vol * (0.25 + rough * 0.8), 0.04);
    s.connect(nf).connect(ng).connect(voiceBus);
    s.start(t); s.stop(t + 0.06);
  },

  // Tensión: un zumbido grave que crece y late. Devuelve una función para cortarlo.
  tension(vol = 0.09) {
    if (!ok()) return () => {};
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 1.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(700, t + 3);
    const oscs = [55, 55.7, 82.4].map((fr, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = fr;
      o.connect(lp);
      o.start(t);
      return o;
    });
    // trémolo que se acelera
    const trem = ctx.createGain(); trem.gain.value = 0.7;
    const lfo = ctx.createOscillator(); const lg = ctx.createGain();
    lfo.frequency.setValueAtTime(2, t); lfo.frequency.linearRampToValueAtTime(7, t + 4);
    lg.gain.value = 0.3; lfo.connect(lg).connect(trem.gain); lfo.start(t);
    lp.connect(trem).connect(g).connect(master);
    return (fade = 0.4) => {
      const n = ctx.currentTime;
      g.gain.cancelScheduledValues(n);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), n);
      g.gain.exponentialRampToValueAtTime(0.0001, n + fade);
      [...oscs, lfo].forEach((o) => o.stop(n + fade + 0.05));
    };
  },

  // Bloqueado: dos golpes secos y graves, como un "no"
  locked(vol = 0.16) {
    if (!ok()) return;
    const t = ctx.currentTime;
    [0, 0.11].forEach((off) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(140, t + off);
      o.frequency.exponentialRampToValueAtTime(90, t + off + 0.08);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
      env(g, t + off, 0.004, vol, 0.08);
      o.connect(f).connect(g).connect(master);
      o.start(t + off); o.stop(t + off + 0.12);
    });
    this.click(0.12);
  },

  // Desbloqueo: clack metálico + campanita
  unlock(vol = 0.12) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const s = noiseSrc();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3400; f.Q.value = 3;
    const g = ctx.createGain(); env(g, t, 0.001, vol * 1.4, 0.06);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.08);
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.1);
    env(og, t, 0.002, vol * 0.5, 0.15); o.connect(og).connect(master); o.start(t); o.stop(t + 0.2);
    setTimeout(() => this.chime(523, 0.05), 180);
  },

  // Sonido feo (PI enojado / el Ruido): un chirrido roto
  glitch(vol = 0.07) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth';
    const f0 = 90 + Math.random() * 400;
    o.frequency.setValueAtTime(f0, t);
    for (let i = 1; i < 6; i++) o.frequency.setValueAtTime(f0 * (0.5 + Math.random() * 2.5), t + i * 0.025);
    const ws = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.sign(x) * Math.min(1, Math.abs(x) * 6); }
    ws.curve = curve;
    env(g, t, 0.002, vol, 0.16);
    o.connect(ws).connect(g).connect(master);
    o.start(t); o.stop(t + 0.2);
    this.static(0.12, vol * 0.8);
  },

  // Gruñido de PI: grave, áspero, corto
  grumble(vol = 0.1) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    const lfo = ctx.createOscillator(); const lg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(52, t + 0.5);
    lfo.frequency.value = 23; lg.gain.value = 20; lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    env(g, t, 0.03, vol, 0.5);
    o.connect(f).connect(g).connect(master);
    o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
  },

  // Ambiente hostil continuo: un zumbido grave, un ruido sucio y un pitido agudo
  // que suben con el nivel (0..1). Devuelve { set(level), stop() }.
  ambience() {
    if (!ensure()) return { set() {}, stop() {} };
    const t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    // zumbido
    const drone = ctx.createGain(); drone.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 49;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 49.6;
    o1.connect(lp); o2.connect(lp); lp.connect(drone).connect(out);
    // ruido sucio (como una tele mal sintonizada)
    const nz = noiseSrc(); const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0;
    nz.connect(nf).connect(ng).connect(out);
    // pitido agudo
    const wh = ctx.createOscillator(); wh.type = 'sine'; wh.frequency.value = 8200;
    const wg = ctx.createGain(); wg.gain.value = 0;
    wh.connect(wg).connect(out);
    [o1, o2, nz, wh].forEach((s) => s.start(t));
    return {
      set(L) {
        if (!ctx) return;
        const n = ctx.currentTime;
        const on = enabled ? 1 : 0;
        out.gain.setTargetAtTime(on * 0.9, n, 0.3);
        drone.gain.setTargetAtTime(Math.min(0.12, L * 0.13), n, 0.6);
        lp.frequency.setTargetAtTime(160 + L * 700, n, 0.6);
        ng.gain.setTargetAtTime(Math.max(0, L - 0.25) * 0.05, n, 0.5);
        wg.gain.setTargetAtTime(Math.max(0, L - 0.55) * 0.012, n, 0.8);
        o2.frequency.setTargetAtTime(49.6 + L * 3, n, 1);
      },
      stop() { const n = ctx.currentTime; out.gain.setTargetAtTime(0, n, 0.3); },
    };
  },

  // Tono suave (cuando algo “se acomoda”)
  chime(freq = 660, vol = 0.06) {
    if (!ok()) return;
    const t = ctx.currentTime;
    [1, 1.5, 2.01].forEach((m, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq * m;
      env(g, t + i * 0.03, 0.01, vol / (i + 1), 1.4);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 1.6);
    });
  },
};
