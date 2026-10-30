import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Tilt from '../components/Tilt';
import RoomHead from '../components/RoomHead';
import CameraBody from '../components/CameraBody';
import { sfx } from '../lib/sound';
import { polaroidToPNG, stripToPNG, download } from '../lib/exporters';

const smooth = (x) => x * x * (3 - 2 * x);

/** Instant-film look: faded blacks, warm highlights, soft contrast, vignette, light leak, grain. */
function develop(ctx, S) {
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  const c = S / 2;
  const maxd = Math.hypot(c, c);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      let r = d[i] / 255;
      let g = d[i + 1] / 255;
      let b = d[i + 2] / 255;
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      r = l + (r - l) * 0.8;
      g = l + (g - l) * 0.8;
      b = l + (b - l) * 0.74;
      r = r + 0.3 * (smooth(r) - r);
      g = g + 0.3 * (smooth(g) - g);
      b = b + 0.25 * (smooth(b) - b);
      r = r * 0.93 + 0.07;
      g = g * 0.9 + 0.06;
      b = b * 0.8 + 0.1;
      const v = 1 - Math.pow(Math.hypot(x - c, y - c) / maxd, 2.3) * 0.6;
      const lk = Math.max(0, 1 - Math.hypot(x - S * 1.02, y + S * 0.04) / (S * 0.55));
      r += lk * lk * 0.3;
      g += lk * lk * 0.12;
      const n = (Math.random() - 0.5) * 0.07;
      d[i] = Math.max(0, Math.min(255, (r * v + n) * 255));
      d[i + 1] = Math.max(0, Math.min(255, (g * v + n) * 255));
      d[i + 2] = Math.max(0, Math.min(255, (b * v + n) * 255));
    }
  }
  ctx.putImageData(img, 0, 0);
}

function capture(video) {
  const S = 720;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const m = Math.min(vw, vh);
  x.save();
  x.translate(S, 0);
  x.scale(-1, 1);
  x.drawImage(video, (vw - m) / 2, (vh - m) / 2, m, m, 0, 0, S, S);
  x.restore();
  develop(x, S);
  return c.toDataURL('image/jpeg', 0.9);
}

function Photo({ p, onMove, onFront, onCaption, onRemove, onSelect, ejecting }) {
  const devDelay = `${Math.min(0, -(Date.now() - p.born) / 1000)}s`;
  const onDown = (e) => {
    if (ejecting || e.target.closest('input,button')) return;
    e.preventDefault();
    onFront(p.id);
    const sx = e.clientX;
    const sy = e.clientY;
    const px = p.x;
    const py = p.y;
    const move = (ev) => onMove(p.id, px + ev.clientX - sx, py + ev.clientY - sy);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const save = async () => download(await polaroidToPNG(p.src, p.caption), 'maison-instant.jpg');
  return (
    <div
      className={`photo ${ejecting ? 'ejecting' : 'landed'} ${p.sel ? 'sel' : ''}`}
      style={ejecting ? undefined : { left: p.x, top: p.y, '--rot': `${p.rot}deg` }}
      onPointerDown={onDown}
    >
      <div className="photo-img">
        <img src={p.src} alt="" style={{ animationDelay: devDelay }} draggable={false} />
        <div className="photo-veil" style={{ animationDelay: devDelay }} />
        <div className="photo-sheen" />
        {!ejecting && (
          <div className="photo-tools">
            <button className="pt-sel" onClick={() => onSelect(p.id)} title={p.sel ? 'Remove from strip' : 'Add to strip'}>
              <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
            </button>
            <span />
            <button onClick={save} title="Save this instant">
              <svg viewBox="0 0 16 16"><path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" /></svg>
            </button>
            <button onClick={() => onRemove(p.id)} title="Discard">
              <svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        )}
      </div>
      {ejecting ? (
        <div className="photo-cap" />
      ) : (
        <>
          <input className="photo-cap" value={p.caption} maxLength={28} placeholder="write a little something…" onChange={(e) => onCaption(p.id, e.target.value)} />
        </>
      )}
    </div>
  );
}

export default function Polaroid() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const tableRef = useRef(null);
  const [cam, setCam] = useState('off'); // off | on | denied
  const [flash, setFlash] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [eject, setEject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const busy = useRef(false);
  const [strip, setStrip] = useState(null); // null | 'busy' | dataURL

  const start = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' }, audio: false });
      streamRef.current = s;
      videoRef.current.srcObject = s;
      await videoRef.current.play();
      setCam('on');
    } catch {
      setCam('denied');
    }
  }, []);

  useEffect(() => {
    start();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [start]);

  const land = (p) => {
    const r = tableRef.current.getBoundingClientRect();
    const x = 20 + Math.random() * Math.max(10, r.width - 300);
    const y = 20 + Math.random() * Math.max(10, r.height - 360);
    setPhotos((ps) => [...ps, { ...p, x, y, rot: (Math.random() - 0.5) * 16 }]);
  };

  const shoot = useCallback(() => {
    if (busy.current) return;
    if (cam !== 'on') return start();
    busy.current = true;
    setPressed(true);
    setTimeout(() => setPressed(false), 180);
    sfx.shutter();
    setFlash((f) => f + 1);
    const p = { id: Date.now(), src: capture(videoRef.current), caption: '', born: Date.now() + 300 };
    setTimeout(() => setEject(p), 300);
    setTimeout(() => {
      land(p);
      setEject(null);
      busy.current = false;
    }, 300 + 3000);
  }, [cam, start]);

  useEffect(() => {
    const on = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [shoot]);

  const onMove = (id, x, y) => setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, x, y } : p)));
  const onFront = (id) => setPhotos((ps) => [...ps.filter((p) => p.id !== id), ps.find((p) => p.id === id)]);
  const onCaption = (id, caption) => setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, caption } : p)));
  const onRemove = (id) => setPhotos((ps) => ps.filter((p) => p.id !== id));
  const onSelect = (id) => {
    sfx.tick();
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, sel: !p.sel } : p)));
  };
  const selected = photos.filter((p) => p.sel).sort((a, b) => a.id - b.id);
  const allSel = photos.length > 0 && selected.length === photos.length;
  const makeStrip = async () => {
    if (!selected.length) return;
    setStrip('busy');
    sfx.shutter();
    setStrip(await stripToPNG(selected));
  };

  return (
    <div className="room pol-room">
      <RoomHead
        num="III"
        eyebrow="Instants"
        title={
          <>
            The <em>Darkroom</em>
          </>
        }
        hint="Frame yourself in the lens · press the red shutter or Space · watch it develop, then drag it around the table"
      />

      <div className="pol-layout">
        <div className="pol-camera">
          <Tilt max={7} className="pol-tilt">
            <CameraBody
              pressed={pressed}
              onShutter={shoot}
              lens={
                <>
                  <video ref={videoRef} playsInline muted className={cam === 'on' ? 'live' : ''} />
                  {cam !== 'on' && (
                    <button className="lens-msg" onClick={start}>
                      {cam === 'denied' ? 'Allow camera' : 'Opening…'}
                    </button>
                  )}
                </>
              }
            />
          </Tilt>
          <div className="eject-wrap">{eject && <Photo p={eject} ejecting />}</div>
        </div>

        <div className="pol-table" ref={tableRef}>
          <div className="pol-table-label">
            <span className="eyebrow">The Table</span>
            {!photos.length && <em>Your instants will land here</em>}
          </div>
          {photos.length > 0 && (
            <div className="pol-tools">
              <span className="pol-tip">{selected.length ? `${selected.length} on the strip` : 'Tick the instants you want on a strip'}</span>
              <button className="btn ghost" onClick={() => setPhotos((ps) => ps.map((p) => ({ ...p, sel: !allSel })))}>
                {allSel ? 'Clear' : 'Select all'}
              </button>
              <button className="btn solid" onClick={makeStrip} disabled={!selected.length}>
                Develop strip
              </button>
            </div>
          )}
          {photos.map((p) => (
            <Photo key={p.id} p={p} onMove={onMove} onFront={onFront} onCaption={onCaption} onRemove={onRemove} onSelect={onSelect} />
          ))}
        </div>
      </div>

      {strip &&
        createPortal(
          <div className="modal" onClick={(e) => e.target === e.currentTarget && setStrip(null)}>
            <div className="modal-inner">
              <div className="strip-view">{strip === 'busy' ? <div className="strip-wait">Developing…</div> : <img src={strip} alt="Photo strip" />}</div>
              <aside className="modal-side">
                <div className="eyebrow">From the darkroom</div>
                <h2>
                  Your <em>strip</em>
                </h2>
                <p>{selected.length} instant{selected.length === 1 ? '' : 's'}, stacked like a photo booth, captions and all.</p>
                <div className="stack">
                  <button className="btn solid" disabled={strip === 'busy'} onClick={() => download(strip, 'maison-strip.jpg')}>
                    Download strip
                  </button>
                  <button className="btn ghost" onClick={() => setStrip(null)}>
                    Back to the table
                  </button>
                </div>
              </aside>
            </div>
          </div>,
          document.body
        )}
      {flash > 0 && createPortal(<div className="flash" key={flash} />, document.body)}
    </div>
  );
}
