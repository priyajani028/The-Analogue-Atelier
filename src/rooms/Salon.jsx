import Tilt from '../components/Tilt';
import CassetteShell, { TAPE_COLORS } from '../components/CassetteShell';
import CameraBody from '../components/CameraBody';
import { sfx } from '../lib/sound';

function MiniTypewriter() {
  return (
    <div className="mtw">
      <div className="mtw-paper">
        <i style={{ width: '70%' }} />
        <i style={{ width: '82%' }} />
        <i style={{ width: '55%' }} />
      </div>
      <div className="mtw-platen" />
      <div className="mtw-body">
        <div className="mtw-well" />
        <div className="mtw-keys">
          {Array.from({ length: 40 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

const ITEMS = [
  { id: 'typewriter', num: 'I', title: 'The Writing Desk', sub: 'type · stamp · print', obj: <MiniTypewriter /> },
  {
    id: 'cassette',
    num: 'II',
    title: 'The Listening Room',
    sub: 'record a minute on tape',
    obj: (
      <div className="mini-cas">
        <CassetteShell color={TAPE_COLORS[1]} spinning>
          <span className="cs-name">for you, side A</span>
        </CassetteShell>
      </div>
    ),
  },
  {
    id: 'polaroid',
    num: 'III',
    title: 'The Darkroom',
    sub: 'instant photographs',
    obj: (
      <div className="mini-cam">
        <CameraBody lens={<div className="mini-lens" />} />
      </div>
    ),
  },
];

export default function Salon({ go }) {
  return (
    <div className="room salon">
      <header className="salon-head">
        <div className="eyebrow">
          Maison Rétro <span className="dash" /> Est. MCMLXII
        </div>
        <h1>
          The Analogue <em>Atelier</em>
        </h1>
        <p>Three instruments for slower moments. Write a letter, keep a voice, hold a moment in your hand.</p>
      </header>

      <Tilt max={5} className="salon-stage">
        {ITEMS.map((it, i) => (
          <button key={it.id} className="plinth" style={{ '--i': i }} onClick={() => go(it.id)} onMouseEnter={() => sfx.tick()}>
            <div className="plinth-light" />
            <div className="plinth-obj">{it.obj}</div>
            <div className="plinth-top" />
            <div className="plinth-block" />
            <div className="plinth-cap">
              <span>Nº {it.num}</span>
              <b>{it.title}</b>
              <i>{it.sub}</i>
            </div>
          </button>
        ))}
      </Tilt>

      <p className="salon-foot">Best enjoyed with the sound on</p>
    </div>
  );
}
