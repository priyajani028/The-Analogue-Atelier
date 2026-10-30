// Synthesised mechanical sounds — no audio files needed.
let ctx;
let noiseBuf;

export function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise() {
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function burst({ t = 0, dur = 0.04, freq = 2500, q = 1, gain = 0.4, type = 'bandpass' }) {
  const c = ac();
  const now = c.currentTime + t;
  const s = c.createBufferSource();
  s.buffer = noise();
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(now, Math.random());
  s.stop(now + dur + 0.02);
}

function tone({ t = 0, freq = 440, to, dur = 0.3, gain = 0.2, type = 'sine' }) {
  const c = ac();
  const now = c.currentTime + t;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (to) o.frequency.exponentialRampToValueAtTime(to, now + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(c.destination);
  o.start(now);
  o.stop(now + dur + 0.05);
}

export const sfx = {
  key() {
    const v = 0.85 + Math.random() * 0.3;
    burst({ dur: 0.03, freq: 3200 * v, q: 0.8, gain: 0.32 });
    tone({ freq: 190 * v, to: 60, dur: 0.06, gain: 0.22, type: 'triangle' });
    burst({ t: 0.02, dur: 0.025, freq: 1400, q: 2, gain: 0.16 });
  },
  space() {
    burst({ dur: 0.05, freq: 900, q: 0.7, gain: 0.22 });
    tone({ freq: 110, to: 50, dur: 0.08, gain: 0.18, type: 'triangle' });
  },
  ding() {
    tone({ freq: 2093, dur: 1.4, gain: 0.16 });
    tone({ freq: 4186, dur: 0.8, gain: 0.04 });
    tone({ freq: 3140, dur: 1, gain: 0.035 });
  },
  carriage() {
    for (let i = 0; i < 9; i++) burst({ t: i * 0.035, dur: 0.02, freq: 2600, q: 3, gain: 0.15 });
    burst({ dur: 0.35, freq: 600, q: 0.5, gain: 0.07, type: 'lowpass' });
    burst({ t: 0.34, dur: 0.08, freq: 800, q: 1, gain: 0.36 });
    tone({ t: 0.34, freq: 90, to: 45, dur: 0.12, gain: 0.28, type: 'triangle' });
  },
  stamp() {
    tone({ freq: 120, to: 40, dur: 0.18, gain: 0.5 });
    burst({ dur: 0.08, freq: 500, q: 0.6, gain: 0.4, type: 'lowpass' });
    burst({ t: 0.01, dur: 0.04, freq: 2000, q: 1, gain: 0.1 });
  },
  ratchet(dur = 1) {
    const n = Math.floor(dur / 0.05);
    for (let i = 0; i < n; i++) burst({ t: i * 0.05, dur: 0.025, freq: 2200 + Math.random() * 400, q: 2.5, gain: 0.14 });
  },
  clunk() {
    burst({ dur: 0.06, freq: 700, q: 0.8, gain: 0.42 });
    tone({ freq: 140, to: 60, dur: 0.1, gain: 0.32, type: 'triangle' });
    burst({ t: 0.05, dur: 0.03, freq: 2400, q: 2, gain: 0.14 });
  },
  shutter() {
    // soft leaf-shutter: a crisp tick, a muted clack, then a quiet film-transport purr
    burst({ dur: 0.012, freq: 5200, q: 0.7, gain: 0.22, type: 'highpass' });
    burst({ t: 0.06, dur: 0.035, freq: 1500, q: 1.2, gain: 0.16 });
    tone({ t: 0.06, freq: 95, to: 55, dur: 0.09, gain: 0.12, type: 'sine' });
    const c = ac();
    const now = c.currentTime + 0.22;
    const s = c.createBufferSource();
    s.buffer = noise();
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.25);
    g.gain.setValueAtTime(0.05, now + 1.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
    const am = c.createGain();
    am.gain.value = 0.75;
    const lfo = c.createOscillator();
    lfo.frequency.value = 24;
    const lg = c.createGain();
    lg.gain.value = 0.25;
    lfo.connect(lg).connect(am.gain);
    s.connect(f).connect(am).connect(g).connect(c.destination);
    s.start(now);
    lfo.start(now);
    s.stop(now + 2.2);
    lfo.stop(now + 2.2);
  },
  tick() {
    tone({ freq: 1800, dur: 0.04, gain: 0.025 });
  },
};
