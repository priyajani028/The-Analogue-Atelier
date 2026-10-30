import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Tilt from '../components/Tilt';
import RoomHead from '../components/RoomHead';
import useFitScale from '../components/useFitScale';
import { sfx } from '../lib/sound';
import { STAMPS, stampSvg } from '../lib/stamps';
import { CW, LH, TOP, MARGIN, COLS, MAX_LINES, PAGE_W, PAGE_H } from '../lib/layout';
import { sheetToPNG, download } from '../lib/exporters';
import { PAPERS } from '../lib/papers';

const STAGE_W = 980;
const STAGE_H = 940;
const STRIKE_X = 490;
const PAPER_LEFT = STRIKE_X - MARGIN - CW / 2;
const BASE = 348;

const KEYROWS = [
  [...'1234567890-'.split('').map((k) => ({ id: k, label: k })), { id: 'back', label: '⌫' }],
  [...'qwertyuiop'.split('').map((k) => ({ id: k, label: k })), { id: 'return', label: 'return', wide: true }],
  "asdfghjkl;'".split('').map((k) => ({ id: k, label: k })),
  'zxcvbnm,.?'.split('').map((k) => ({ id: k, label: k })),
];

const mkChar = (c) => ({
  c,
  dx: (Math.random() - 0.5) * 0.9,
  dy: (Math.random() - 0.5) * 1.4,
  r: (Math.random() - 0.5) * 2.4,
  o: 0.7 + Math.random() * 0.28,
});

const keyId = (e) => {
  if (e.code?.startsWith('Key')) return e.code[3].toLowerCase();
  if (e.code?.startsWith('Digit')) return e.code[5];
  if (e.key === '/' || e.key === '?') return '?';
  return e.key.toLowerCase();
};

// ribbon geometry (body coords)
const GUIDE = { x: STRIKE_X - 30, y: -8 };
const ribbon = (sx, sy) => {
  const dx = GUIDE.x - sx;
  const dy = GUIDE.y - sy;
  return { left: sx, top: sy, width: Math.hypot(dx, dy), transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)` };
};

export function Sheet({ lines, stamps, still }) {
  return (
    <div className="sheet">
      {lines.map((l, li) =>
        l.map((ch, ci) =>
          ch.c === ' ' ? null : (
            <span
              key={`${li}-${ci}`}
              className="ch"
              style={{
                left: MARGIN + ci * CW + ch.dx,
                top: TOP + li * LH + ch.dy,
                opacity: ch.o,
                transform: `rotate(${ch.r}deg)`,
              }}
            >
              {ch.c}
            </span>
          )
        )
      )}
      {stamps.map((s) => (
        <div
          key={s.id}
          className="stamp"
          style={{ left: s.x, top: s.y, opacity: s.o, transform: `translate(-50%,-50%) rotate(${s.r}deg)` }}
        >
          <div className={still ? '' : 'stamp-in'} dangerouslySetInnerHTML={{ __html: stampSvg(s.type) }} />
        </div>
      ))}
    </div>
  );
}

export default function Typewriter() {
  const [lines, setLines] = useState([[]]);
  const [stamps, setStamps] = useState([]);
  const [tool, setTool] = useState(null);
  const [down, setDown] = useState(null);
  const [strike, setStrike] = useState(0);
  const [returning, setReturning] = useState(false);
  const [phase, setPhase] = useState('desk'); // desk | feeding | sheet
  const [spin, setSpin] = useState(0);
  const [paper, setPaper] = useState('ivory');
  const [swap, setSwap] = useState(0);
  const scale = useFitScale(1260, 0.3);

  const st = useRef({ lines, phase });
  st.current.phase = phase;
  st.current.lines = lines;
  const timers = useRef({});

  const flash = useCallback((id) => {
    setDown(id);
    clearTimeout(timers.current.key);
    timers.current.key = setTimeout(() => setDown(null), 110);
  }, []);

  const commit = (n) => {
    st.current.lines = n;
    setLines(n);
  };

  const press = useCallback((c) => {
    if (st.current.phase !== 'desk') return;
    const ls = st.current.lines;
    const cur = ls[ls.length - 1];
    if (cur.length >= COLS) {
      sfx.space();
      return;
    }
    const n = ls.slice();
    n[n.length - 1] = [...cur, mkChar(c)];
    commit(n);
    if (c === ' ') sfx.space();
    else {
      sfx.key();
      setStrike((s) => s + 1);
    }
    setSpin((s) => s + 5);
    if (cur.length + 1 === COLS - 6) setTimeout(sfx.ding, 30);
  }, []);

  const carriageMove = () => {
    setReturning(true);
    clearTimeout(timers.current.ret);
    timers.current.ret = setTimeout(() => setReturning(false), 450);
  };

  const newline = useCallback(() => {
    if (st.current.phase !== 'desk') return;
    const ls = st.current.lines;
    if (ls.length >= MAX_LINES) {
      sfx.ding();
      return;
    }
    sfx.carriage();
    carriageMove();
    commit([...ls, []]);
  }, []);

  const back = useCallback(() => {
    if (st.current.phase !== 'desk') return;
    const n = st.current.lines.slice();
    const cur = n[n.length - 1];
    if (cur.length) n[n.length - 1] = cur.slice(0, -1);
    else if (n.length > 1) {
      n.pop();
      carriageMove();
    } else return;
    sfx.space();
    commit(n);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') return setTool(null);
      if (st.current.phase !== 'desk') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        newline();
        flash('return');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        back();
        flash('back');
      } else if (e.key.length === 1) {
        e.preventDefault();
        press(e.key);
        flash(e.key === ' ' ? ' ' : keyId(e));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, newline, back, flash]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const hit = (k) => {
    if (k.id === 'back') back();
    else if (k.id === 'return') newline();
    else press(k.id);
    flash(k.id);
  };

  const onPaper = (e) => {
    if (!tool || phase !== 'desk') return;
    const { offsetX: x, offsetY: y } = e.nativeEvent;
    setStamps((s) => [...s, { id: Date.now() + Math.random(), type: tool, x, y, r: (Math.random() - 0.5) * 16, o: 0.8 + Math.random() * 0.17 }]);
    sfx.stamp();
  };

  const print = () => {
    if (phase !== 'desk') return;
    setTool(null);
    setPhase('feeding');
    sfx.ratchet(1.4);
    timers.current.feed = setTimeout(() => setPhase('sheet'), 1550);
  };

  const fresh = () => {
    commit([[]]);
    setStamps([]);
    setPhase('desk');
    sfx.carriage();
    carriageMove();
  };

  const line = lines.length - 1;
  const col = lines[line].length;
  const paperTop = BASE - (TOP + (line + 1) * LH);
  const shift = -col * CW;

  return (
    <div className="room tw-room">
      <RoomHead
        num="I"
        eyebrow="Correspondence"
        title={
          <>
            The Writing <em>Desk</em>
          </>
        }
        hint="Simply begin typing · Return for a new line · choose a stamp from the drawer and press it onto the sheet"
      />

      <div className="tw-fit" style={{ height: STAGE_H * scale + 20 }}>
        <Tilt max={3} base={`translateX(-50%) scale(${scale})`} className="tw-stage">
          <div className="tw-desk-shadow" />
          {/* carriage: moves left as you type */}
          <div className={`tw-carriage ${returning ? 'returning' : ''}`} style={{ transform: `translateX(${shift}px)` }}>
            <div className="tw-paperwin">
              <div
                key={swap} className={`tw-paper paper-bg paper-${paper} ${swap ? 'swapped' : ''} ${phase !== 'desk' ? 'feeding' : ''} ${tool ? 'stamping' : ''}`}
                style={{ left: PAPER_LEFT, top: paperTop }}
                onClick={onPaper}
              >
                <Sheet lines={lines} stamps={stamps} />
              </div>
            </div>
            <div className="tw-bail">
              <i style={{ left: PAPER_LEFT - 360 + 60 }} />
              <i style={{ left: PAPER_LEFT - 360 + PAGE_W - 96 }} />
            </div>
            <div className="tw-platen" />
            <div className="tw-knob l" />
            <div className="tw-knob r" />
            <button className="tw-lever" onPointerDown={() => newline()} aria-label="Carriage return" title="Carriage return" />
          </div>

          <div className="tw-scale">
            {[0, 10, 20, 30, 40, 50].map((n) => (
              <span key={n} style={{ left: 30 + n * 12.4 }}>
                {n}
              </span>
            ))}
          </div>
          <div className="tw-pointer" />

          <div className="tw-body">
            <div className="tw-guide" />
            <div className="tw-well">
              {Array.from({ length: 38 }).map((_, i) => (
                <b key={i} style={{ transform: `rotate(${-80 + (i * 160) / 37}deg)` }} />
              ))}
              <div className="tw-hub" />
            </div>
            {strike > 0 && <div className="tw-hammer" key={strike} />}
            <div className="tw-ribbon" style={ribbon(175, 92)} />
            <div className="tw-ribbon" style={ribbon(745, 92)} />
            <div className="tw-spool" style={{ left: 110, top: 27 }}>
              <div className="tw-reel" style={{ transform: `rotate(${spin}deg)` }} />
            </div>
            <div className="tw-spool" style={{ left: 680, top: 27 }}>
              <div className="tw-reel" style={{ transform: `rotate(${-spin}deg)` }} />
            </div>
            <div className="tw-plate">Maison · Nº 7 · De Luxe</div>

            <div className="tw-deck">
              {KEYROWS.map((row, ri) => (
                <div className="tw-row" key={ri} style={{ paddingLeft: ri * 18 }}>
                  {row.map((k) => (
                    <button
                      key={k.id}
                      className={`tw-key ${k.wide ? 'wide' : ''} ${down === k.id ? 'down' : ''}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        hit(k);
                      }}
                    >
                      <span>{k.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="tw-row">
                <button
                  className={`tw-space ${down === ' ' ? 'down' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    press(' ');
                    flash(' ');
                  }}
                  aria-label="Space"
                />
              </div>
            </div>
          </div>
        </Tilt>
      </div>

      <section className="tw-tray-wrap">
        <div className="tray-head">
          <span className="eyebrow">The Paper Cabinet</span>
          <span className="tray-tip">{PAPERS.find((p) => p.id === paper).label} · {PAPERS.find((p) => p.id === paper).note}</span>
        </div>
        <div className="paper-row">
          {PAPERS.map((p) => (
            <button
              key={p.id}
              className={`paper-swatch ${paper === p.id ? 'on' : ''}`}
              onClick={() => {
                if (p.id === paper || phase !== 'desk') return;
                setPaper(p.id);
                setSwap((n) => n + 1);
                sfx.ratchet(0.5);
              }}
            >
              <div className={`paper-mini paper-bg paper-${p.id}`}>
                <i />
                <i />
                <i />
              </div>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="tray-head" style={{ marginTop: 34 }}>
          <span className="eyebrow">The Stamp Drawer</span>
          <span className="tray-tip">{tool ? 'Click anywhere on the sheet to press · Esc to put it away' : 'Pick up a stamp'}</span>
        </div>
        <div className="tray">
          {STAMPS.map((s) => (
            <button
              key={s.id}
              className={`tray-cell ${tool === s.id ? 'on' : ''}`}
              onClick={() => {
                setTool((t) => (t === s.id ? null : s.id));
                sfx.tick();
              }}
            >
              <div className="tray-art" dangerouslySetInnerHTML={{ __html: stampSvg(s.id) }} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="tw-actions">
          <button className="btn" onClick={() => setStamps((s) => s.slice(0, -1))} disabled={!stamps.length}>
            Lift last stamp
          </button>
          <button className="btn" onClick={fresh}>
            Fresh sheet
          </button>
          <button className="btn solid" onClick={print}>
            Pull &amp; Print
          </button>
        </div>
      </section>

      {phase === 'sheet' && <SheetModal paper={paper} lines={lines} stamps={stamps} onBack={() => setPhase('desk')} onFresh={fresh} />}
    </div>
  );
}

function SheetModal({ paper, lines, stamps, onBack, onFresh }) {
  const s = Math.min(1, (window.innerHeight - 140) / PAGE_H, (window.innerWidth - 40) / PAGE_W);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      download(await sheetToPNG(lines, stamps, paper), 'maison-retro-letter.png');
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <div className="modal">
      <div className="modal-inner">
        <div className="sheet-holder" style={{ width: PAGE_W * s, height: PAGE_H * s }}>
          <div className={`paper-bg paper-${paper} print-sheet`} style={{ transform: `scale(${s})` }}>
            <Sheet lines={lines} stamps={stamps} still />
          </div>
        </div>
        <aside className="modal-side">
          <div className="eyebrow">Fresh from the platen</div>
          <h2>
            Your <em>letter</em>
          </h2>
          <p>Every keystroke kept its own little wobble. Print it on real paper, or keep it as an image.</p>
          <div className="stack">
            <button className="btn solid" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn" onClick={save} disabled={busy}>
              {busy ? 'Developing…' : 'Save as image'}
            </button>
            <button className="btn ghost" onClick={onBack}>
              Back to the desk
            </button>
            <button className="btn ghost" onClick={onFresh}>
              Start a fresh sheet
            </button>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
}
