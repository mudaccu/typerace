// All sounds are generated live with the Web Audio API, so there are no audio files to load.

let ctx = null, master = null, noiseBuf = null, muted = false;
let engine = null, engineFilter = null, engineGain = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// Browsers only allow audio after the user clicks or types.
export function unlock() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
}

function tone(freq, dur, type = "sine", vol = 0.15, when = 0, slideTo = null) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq, q = 1, sweepTo = null) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf;
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur);
}

export const sfx = {
  key: () => noise(0.025, 0.12, 2800 + Math.random() * 1600, 1.5),
  error: () => tone(130, 0.09, "square", 0.05),
  beep: hi => tone(hi ? 880 : 440, hi ? 0.4 : 0.15, "sine", 0.2),
  shift: () => { noise(0.06, 0.18, 900, 2); tone(70, 0.08, "square", 0.04); },
  nitro: () => { noise(0.8, 0.35, 300, 1.2, 3200); tone(80, 0.7, "sawtooth", 0.05, 0, 260); },
  finish: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.14, i * 0.09)),
  unlock: () => [784, 1175, 1568].forEach((f, i) => tone(f, 0.22, "sine", 0.12, i * 0.08)),
};

// The engine hum: pitch follows your live WPM.
export function engineStart() {
  const c = ensure();
  if (!c || engine) return;
  engine = c.createOscillator();
  engine.type = "sawtooth";
  engine.frequency.value = 45;
  engineFilter = c.createBiquadFilter();
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = 350;
  engineGain = c.createGain();
  engineGain.gain.value = 0;
  engine.connect(engineFilter).connect(engineGain).connect(master);
  engine.start();
  engineGain.gain.setTargetAtTime(0.04, c.currentTime, 0.15);
}

export function engineSet(wpm, boosting) {
  if (!engine) return;
  const t = ctx.currentTime;
  engine.frequency.setTargetAtTime(45 + wpm * 0.9 + (boosting ? 45 : 0), t, 0.15);
  engineFilter.frequency.setTargetAtTime(300 + wpm * 7 + (boosting ? 900 : 0), t, 0.15);
}

export function engineStop() {
  if (!engine) return;
  const e = engine;
  engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  setTimeout(() => { try { e.stop(); } catch (_) {} }, 600);
  engine = null;
}
