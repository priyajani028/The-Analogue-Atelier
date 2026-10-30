import { ac } from './sound';

export async function decodeBlob(blob) {
  const arr = await blob.arrayBuffer();
  const c = ac();
  return await new Promise((res, rej) => {
    const p = c.decodeAudioData(arr, res, rej);
    if (p && p.then) p.then(res, rej);
  });
}

function satCurve(n = 2048) {
  const k = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    k[i] = Math.tanh(2.2 * x) / Math.tanh(2.2) + 0.04 * x * x;
  }
  return k;
}

function peak(buf) {
  let p = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > p) p = a;
    }
  }
  return p || 1;
}

/**
 * Render a voice recording as if it lived on an old cassette:
 * band-limited, warm, saturated, with wow & flutter, hiss, hum, crackle and dropouts.
 */
export async function tapeProcess(input, { warmth = 0.6, hiss = 0.35, wow = 0.4, age = 0.45 }) {
  const sr = 22050;
  const len = Math.ceil((input.duration + 0.6) * sr);
  const oc = new OfflineAudioContext(1, len, sr);

  const src = oc.createBufferSource();
  src.buffer = input;
  // tape motor coming up to speed
  src.playbackRate.setValueAtTime(0.8, 0.15);
  src.playbackRate.linearRampToValueAtTime(1, 0.5);

  const inGain = oc.createGain();
  inGain.gain.value = Math.min(8, 0.9 / peak(input));

  const hp = oc.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 90 + age * 140;

  const low = oc.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 220;
  low.gain.value = warmth * 4;

  const mid = oc.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1100;
  mid.Q.value = 0.8;
  mid.gain.value = 2 + warmth * 3;

  const lp = oc.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 7200 - warmth * 4300;
  lp.Q.value = 0.9;

  const pre = oc.createGain();
  pre.gain.value = 1.3 + age * 2.2;
  const sh = oc.createWaveShaper();
  sh.curve = satCurve();
  sh.oversample = '2x';
  const post = oc.createGain();
  post.gain.value = 0.75 / (1 + age * 0.6);

  // wow & flutter via modulated delay
  const dl = oc.createDelay(0.1);
  dl.delayTime.value = 0.014;
  const lfo = oc.createOscillator();
  lfo.frequency.value = 0.55;
  const lg = oc.createGain();
  lg.gain.value = 0.004 * wow;
  lfo.connect(lg).connect(dl.delayTime);
  const fl = oc.createOscillator();
  fl.frequency.value = 6.5;
  const fg = oc.createGain();
  fg.gain.value = 0.0004 * wow;
  fl.connect(fg).connect(dl.delayTime);

  // dropouts
  const drop = oc.createGain();
  const dur = len / sr;
  let t = 0.8;
  while (t < dur) {
    t += (2 + Math.random() * 6) / (0.3 + age);
    if (Math.random() < age && t < dur - 0.3) {
      const d = 0.04 + Math.random() * 0.14;
      drop.gain.setValueAtTime(1, t);
      drop.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.35, t + d * 0.3);
      drop.gain.linearRampToValueAtTime(1, t + d);
    }
  }

  src.connect(inGain).connect(hp).connect(low).connect(mid).connect(lp).connect(pre).connect(sh).connect(post).connect(dl).connect(drop).connect(oc.destination);

  // hiss + crackle
  const nb = oc.createBuffer(1, len, sr);
  const nd = nb.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b = 0.97 * b + 0.03 * w;
    nd[i] = w * 0.6 + b * 2;
  }
  const clicks = Math.floor(dur * (1 + age * 6));
  for (let i = 0; i < clicks; i++) {
    const p = Math.floor(Math.random() * len);
    nd[p] += (Math.random() - 0.5) * 10 * age;
  }
  const ns = oc.createBufferSource();
  ns.buffer = nb;
  const nf = oc.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 4200;
  nf.Q.value = 0.4;
  const ng = oc.createGain();
  ng.gain.value = hiss * 0.03;
  ns.connect(nf).connect(ng).connect(oc.destination);

  const hum = oc.createOscillator();
  hum.frequency.value = 60;
  const hg = oc.createGain();
  hg.gain.value = age * 0.004;
  hum.connect(hg).connect(oc.destination);

  src.start(0.15);
  lfo.start();
  fl.start();
  ns.start();
  hum.start();

  const out = await oc.startRendering();
  const g = 0.9 / peak(out);
  const d = out.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] *= g;
  return out;
}

export function encodeWav(buf) {
  const ch = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const ab = new ArrayBuffer(44 + ch.length * 2);
  const v = new DataView(ab);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + ch.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, ch.length * 2, true);
  for (let i = 0; i < ch.length; i++) {
    const s = Math.max(-1, Math.min(1, ch[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([ab], { type: 'audio/wav' });
}
