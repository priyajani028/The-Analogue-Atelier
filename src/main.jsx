import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './rooms/typewriter.css';
import './rooms/cassette.css';
import './rooms/polaroid.css';

// Paper/film grain: the original soft SVG turbulence, rasterised once to a PNG so it stays cheap to paint.
(function makeNoise() {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .42  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";
  const svgUrl = `data:image/svg+xml;utf8,${svg}`;
  const root = document.documentElement.style;
  root.setProperty('--noise', `url("${svgUrl}")`);
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 220;
      c.getContext('2d').drawImage(img, 0, 0);
      root.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
    } catch {}
  };
  img.src = svgUrl;
})();

createRoot(document.getElementById('root')).render(<App />);
