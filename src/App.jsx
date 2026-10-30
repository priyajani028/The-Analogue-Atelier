import { useState } from 'react';
import Salon from './rooms/Salon';
import Typewriter from './rooms/Typewriter';
import Cassette from './rooms/Cassette';
import Polaroid from './rooms/Polaroid';
import { sfx } from './lib/sound';

const ROOMS = [
  { id: 'typewriter', num: 'I', name: 'Correspondence' },
  { id: 'cassette', num: 'II', name: 'Recordings' },
  { id: 'polaroid', num: 'III', name: 'Instants' },
];
const VALID = ['home', ...ROOMS.map((r) => r.id)];

export default function App() {
  const initial = VALID.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'home';
  const [room, setRoom] = useState(initial);
  const [leaving, setLeaving] = useState(false);

  const go = (id) => {
    if (id === room || leaving) return;
    sfx.clunk();
    setLeaving(true);
    setTimeout(() => {
      setRoom(id);
      setLeaving(false);
      window.location.hash = id;
      window.scrollTo(0, 0);
    }, 480);
  };

  return (
    <div className="app">
      <nav className="top">
        <button className="brand" onClick={() => go('home')}>
          Maison <em>Rétro</em>
        </button>
        <div className="nav">
          {ROOMS.map((r) => (
            <button key={r.id} className={room === r.id ? 'on' : ''} onClick={() => go(r.id)}>
              <span>{r.num}</span>
              {r.name}
            </button>
          ))}
        </div>
        <div className="top-meta">Paris · MCMLXII</div>
      </nav>

      <main className={`scene ${leaving ? 'leave' : 'enter'}`} key={room}>
        {room === 'home' && <Salon go={go} />}
        {room === 'typewriter' && <Typewriter />}
        {room === 'cassette' && <Cassette />}
        {room === 'polaroid' && <Polaroid />}
      </main>

      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}
