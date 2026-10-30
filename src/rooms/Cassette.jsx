import { useEffect, useRef, useState } from 'react';
import Tilt from '../components/Tilt';
import RoomHead from '../components/RoomHead';
import useFitScale from '../components/useFitScale';
import CassetteShell, { TAPE_COLORS } from '../components/CassetteShell';
import { ac, sfx } from '../lib/sound';
import { decodeBlob, tapeProcess, encodeWav } from '../lib/tape';
import { download } from '../lib/exporters';

const MAX = 60;
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function Knob({ label, value, onChange }) {
  const onDown = (e) => {
    e.preventDefault();
    const sy = e.clientY;
    const sv = value;
    const move = (ev) => onChange(Math.max(0, Math.min(1, sv + (sy - ev.clientY) / 160)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="knob-wrap">
      <div className="knob-ticks" />
      <div
        className="knob"
        onPointerDown={onDown}
        onWheel={(e) => onChange(Math.max(0, Math.min(1, value - Math.sign(e.deltaY) * 0.05)))}
        style={{ '--a': `${-135 + value * 270}deg` }}
        title="Drag up or down"
      >
        <div className="knob-cap" />
      </div>
      <label>{label}</label>
    </div>
  );
}

function VU({ needleRef, side }) {
  const ticks = Array.from({ length: 11 }, (_, i) => -48 + i * 9.6);
  return (
    <div className={`vu vu-${side}`}>
      <div className="vu-face">
        <svg viewBox="0 0 140 96">
          <path d="M 22 60 A 58 58 0 0 1 118 60" fill="none" stroke="#2a2420" strokeWidth="1" transform="translate(0 -4)" />
          <path d="M 96 33 A 58 58 0 0 1 118 56" fill="none" stroke="#a3271f" strokeWidth="4" />
          {ticks.map((a, i) => {
            const r = (a * Math.PI) / 180;
            const x1 = 70 + Math.sin(r) * 58;
            const y1 = 92 - Math.cos(r) * 58;
            const x2 = 70 + Math.sin(r) * (i % 2 ? 64 : 68);
            const y2 = 92 - Math.cos(r) * (i % 2 ? 64 : 68);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i > 7 ? '#a3271f' : '#2a2420'} strokeWidth="1.2" />;
          })}
          {[
            ['-20', -48],
            ['-7', -19],
            ['0', 19],
            ['+3', 48],
          ].map(([t, a]) => {
            const r = (a * Math.PI) / 180;
            return (
              <text key={t} x={70 + Math.sin(r) * 78} y={96 - Math.cos(r) * 78} textAnchor="middle" fontSize="8" fontFamily="IBM Plex Mono" fill={a > 30 ? '#a3271f' : '#2a2420'}>
                {t}
              </text>
            );
          })}
        </svg>
        <span className="vu-label">VU</span>
        <div className="vu-needle" ref={needleRef} />
        <div className="vu-pivot" />
        <div className="vu-glass" />
      </div>
    </div>
  );
}

export default function Cassette() {
  const [tapes, setTapes] = useState([]);
  const [cur, setCur] = useState(null);
  const [mode, setMode] = useState('idle'); // idle | rec | processing | play
  const [elapsed, setElapsed] = useState(0);
  const [knobs, setKnobs] = useState({ warmth: 0.6, hiss: 0.35, wow: 0.4, age: 0.45 });
  const [ab, setAb] = useState('tape');
  const [err, setErr] = useState('');
  const needleL = useRef(null);
  const needleR = useRef(null);
  const rt = useRef({});
  const bufs = useRef({});
  const knobsRef = useRef(knobs);
  knobsRef.current = knobs;
  const countRef = useRef(0);
  const scale = useFitScale(900, 0.4);

  const tape = tapes.find((t) => t.id === cur);

  // meters + counter loop
  useEffect(() => {
    let raf;
    let lvl = 0;
    let lvl2 = 0;
    let lastTenth = -1;
    const data = new Float32Array(1024);
    const loop = () => {
      const r = rt.current;
      let target = 0;
      if (r.an) {
        r.an.getFloatTimeDomainData(data);
        let s = 0;
        for (let i = 0; i < data.length; i++) s += data[i] * data[i];
        target = Math.min(1, Math.sqrt(s / data.length) * 4.2);
      }
      lvl += (target - lvl) * (target > lvl ? 0.35 : 0.08);
      lvl2 += (target * 0.94 - lvl2) * (target > lvl2 ? 0.28 : 0.07);
      if (needleL.current) needleL.current.style.transform = `rotate(${-48 + lvl * 96}deg)`;
      if (needleR.current) needleR.current.style.transform = `rotate(${-48 + lvl2 * 96}deg)`;
      if (r.kind) {
        const t = ac().currentTime - r.startAt;
        const tenth = Math.floor(t * 10);
        if (tenth !== lastTenth) {
          lastTenth = tenth;
          setElapsed(t);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => stopAll(), []);

  function stopAll() {
    const r = rt.current;
    if (r.kind === 'rec') {
      clearTimeout(r.timer);
      if (r.mr.state === 'recording') r.mr.stop();
    }
    if (r.kind === 'play') {
      r.src.onended = null;
      try {
        r.src.stop();
      } catch {}
    }
    rt.current = {};
  }

  async function ensureProcessed(id) {
    const b = bufs.current[id];
    const key = JSON.stringify(knobsRef.current);
    if (b.key !== key) {
      b.processed = await tapeProcess(b.raw, knobsRef.current);
      b.key = key;
      if (b.url) URL.revokeObjectURL(b.url);
      b.url = URL.createObjectURL(encodeWav(b.processed));
    }
    return b;
  }

  async function record() {
    if (mode === 'rec') return stop();
    if (mode === 'processing') return;
    stopAll();
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const c = ac();
      const src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        src.disconnect();
        setMode('processing');
        try {
          const raw = await decodeBlob(new Blob(chunks, { type: mr.mimeType }));
          const id = Date.now();
          const n = countRef.current++;
          bufs.current[id] = { raw };
          await ensureProcessed(id);
          setTapes((ts) => [
            ...ts,
            { id, name: `Side ${String(n + 1).padStart(2, '0')}`, color: TAPE_COLORS[n % TAPE_COLORS.length], duration: raw.duration },
          ]);
          setCur(id);
        } catch (e) {
          console.error(e);
          setErr('That recording could not be read — try once more.');
        }
        setMode('idle');
        setElapsed(0);
      };
      mr.start();
      rt.current = { kind: 'rec', mr, an, startAt: c.currentTime, timer: setTimeout(() => stop(), MAX * 1000) };
      sfx.clunk();
      setMode('rec');
    } catch (e) {
      setErr('Microphone access is needed to record. Allow it in your browser and press REC again.');
    }
  }

  async function play() {
    if (!tape || mode === 'rec' || mode === 'processing') return;
    stopAll();
    sfx.clunk();
    setMode('processing');
    const b = await ensureProcessed(cur);
    const buf = ab === 'tape' ? b.processed : b.raw;
    const c = ac();
    const s = c.createBufferSource();
    s.buffer = buf;
    const an = c.createAnalyser();
    an.fftSize = 1024;
    s.connect(an);
    an.connect(c.destination);
    s.onended = () => {
      if (rt.current.src === s) {
        rt.current = {};
        setMode('idle');
        setElapsed(0);
      }
    };
    s.start();
    rt.current = { kind: 'play', src: s, an, startAt: c.currentTime, dur: buf.duration };
    setMode('play');
  }

  function stop() {
    sfx.clunk();
    const wasRec = rt.current.kind === 'rec';
    stopAll();
    if (!wasRec) {
      setMode('idle');
      setElapsed(0);
    }
  }

  async function save() {
    if (!tape || mode === 'rec') return;
    sfx.clunk();
    const b = await ensureProcessed(cur);
    download(b.url, `${tape.name.replace(/[^\w\- ]+/g, '').trim() || 'tape'}.wav`);
  }

  const progress =
    mode === 'rec' ? Math.min(1, elapsed / MAX) : mode === 'play' && rt.current.dur ? Math.min(1, elapsed / rt.current.dur) : 0;
  const total = mode === 'rec' ? MAX : tape ? tape.duration : MAX;

  return (
    <div className="room cas-room">
      <RoomHead
        num="II"
        eyebrow="Recordings"
        title={
          <>
            The Listening <em>Room</em>
          </>
        }
        hint="Press REC and speak — one minute of tape · PLAY to hear it back on worn ferric · turn the dials to age it"
      />

      <div className="cas-fit" style={{ height: 600 * scale + 30 }}>
        <Tilt max={5} base={`translateX(-50%) scale(${scale}) rotateX(10deg)`} className="deck-tilt">
          <div className="deck">
            <div className="deck-handle l" />
            <div className="deck-handle r" />
            <div className="deck-face">
              <i className="screw" style={{ left: 14, top: 14 }} />
              <i className="screw" style={{ right: 14, top: 14 }} />
              <i className="screw" style={{ left: 14, bottom: 14 }} />
              <i className="screw" style={{ right: 14, bottom: 14 }} />
              <div className="deck-title">
                Maison <span>·</span> Cassette-Corder
              </div>

              <VU needleRef={needleL} side="l" />
              <VU needleRef={needleR} side="r" />

              <div className="deck-window">
                <div className={`deck-cassette ${tape || mode === 'rec' ? 'in' : ''}`} key={cur ?? 'blank'}>
                  <CassetteShell
                    color={tape ? tape.color : TAPE_COLORS[countRef.current % TAPE_COLORS.length]}
                    progress={progress}
                    spinning={mode === 'rec' || mode === 'play'}
                  >
                    {tape ? (
                      <input
                        className="cs-name"
                        value={tape.name}
                        maxLength={22}
                        onChange={(e) => setTapes((ts) => ts.map((t) => (t.id === cur ? { ...t, name: e.target.value } : t)))}
                      />
                    ) : (
                      <span className="cs-name">{mode === 'rec' ? 'recording…' : 'blank tape'}</span>
                    )}
                  </CassetteShell>
                </div>
                <div className="deck-glass" />
              </div>

              <div className="deck-row">
                <div className="counter">
                  <div className="counter-digits">{fmt(elapsed)}</div>
                  <div className="counter-total">/ {fmt(total)}</div>
                  <div className="counter-bar">
                    <i style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>

                <div className="pkeys">
                  <button className={`pkey rec ${mode === 'rec' ? 'down' : ''}`} onPointerDown={(e) => e.button === 0 && record()}>
                    <i />
                    <span>rec</span>
                  </button>
                  <button className={`pkey ${mode === 'play' ? 'down' : ''}`} onPointerDown={(e) => e.button === 0 && play()} disabled={!tape}>
                    <i className="play" />
                    <span>play</span>
                  </button>
                  <button className="pkey" onPointerDown={(e) => e.button === 0 && stop()}>
                    <i className="stop" />
                    <span>stop</span>
                  </button>
                  <button className="pkey" onPointerDown={(e) => e.button === 0 && save()} disabled={!tape}>
                    <i className="eject" />
                    <span>keep</span>
                  </button>
                </div>

                <div className="ab">
                  <div className="ab-label">monitor</div>
                  <button className={`ab-switch ${ab}`} onPointerDown={() => { sfx.tick(); setAb((a) => (a === 'tape' ? 'source' : 'tape')); }}>
                    <i />
                  </button>
                  <div className="ab-opts">
                    <span className={ab === 'source' ? 'on' : ''}>source</span>
                    <span className={ab === 'tape' ? 'on' : ''}>tape</span>
                  </div>
                </div>
              </div>

              <div className="deck-knobs">
                <Knob label="warmth" value={knobs.warmth} onChange={(v) => setKnobs((k) => ({ ...k, warmth: v }))} />
                <Knob label="hiss" value={knobs.hiss} onChange={(v) => setKnobs((k) => ({ ...k, hiss: v }))} />
                <Knob label="wow & flutter" value={knobs.wow} onChange={(v) => setKnobs((k) => ({ ...k, wow: v }))} />
                <Knob label="age" value={knobs.age} onChange={(v) => setKnobs((k) => ({ ...k, age: v }))} />
                <div className="leds">
                  <div className={`led red ${mode === 'rec' ? 'on' : ''}`}>
                    <i />
                    rec
                  </div>
                  <div className={`led green ${mode === 'play' ? 'on' : ''}`}>
                    <i />
                    play
                  </div>
                  <div className={`led amber ${mode === 'processing' ? 'on' : ''}`}>
                    <i />
                    tape
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tilt>
      </div>

      <p className="cas-msg">{err || (mode === 'processing' ? 'Laying it down on tape…' : 'Dial changes are pressed onto the tape the next time you press play.')}</p>

      <section className="archive">
        <div className="tray-head">
          <span className="eyebrow">The Archive</span>
          <span className="tray-tip">{tapes.length ? 'Choose a tape to load it into the deck' : 'Your recordings will be shelved here'}</span>
        </div>
        <div className="archive-shelf">
          {tapes.map((t) => (
            <button
              key={t.id}
              className={`archive-tape ${t.id === cur ? 'on' : ''}`}
              onClick={() => {
                if (mode === 'rec') return;
                stopAll();
                setMode('idle');
                setElapsed(0);
                setCur(t.id);
                sfx.clunk();
              }}
            >
              <div className="archive-mini">
                <CassetteShell color={t.color}>
                  <span className="cs-name">{t.name}</span>
                </CassetteShell>
              </div>
              <span>
                {t.name} · {fmt(t.duration)}
              </span>
            </button>
          ))}
          {!tapes.length && <div className="archive-empty" />}
        </div>
      </section>
    </div>
  );
}
