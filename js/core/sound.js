// Sonido sintetizado con Web Audio: latido, tic-tac, pitidos, ruido de tele.
// No usa archivos: todo se genera en el navegador (liviano y sin licencias).
// Arranca apagado; se habilita con un gesto del usuario (regla de los navegadores).

const KEY = 'pi-sound';
let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = false;
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
