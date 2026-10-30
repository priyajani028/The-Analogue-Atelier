import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './rooms/typewriter.css';
import './rooms/cassette.css';
import './rooms/polaroid.css';

// Paper/film grain as a small cached PNG — far cheaper to paint than an SVG turbulence filter.
(function makeNoise() {
  const S = 180;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const img = x.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 140;
    img.data[i + 1] = 127;
    img.data[i + 2] = 107;
    img.data[i + 3] = Math.random() * 120;
  }
  x.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
})();

createRoot(document.getElementById('root')).render(<App />);
