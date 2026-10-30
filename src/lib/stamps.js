// Rubber stamps & seals as SVG strings — rendered in the DOM and onto canvas for export.
const NAVY = '#26365f';
const OX = '#7a221d';

const inkFilter = (id, seed = 3) =>
  `<defs><filter id="ink-${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 2.6" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>`;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const today = () => {
  const d = new Date();
  return { dm: `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`, y: String(d.getFullYear()) };
};

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

function postmark() {
  const { dm, y } = today();
  const waves = [38, 52, 66, 80, 94]
    .map((yy) => `<path d="M128 ${yy} q 12 -8 24 0 t 24 0 t 24 0 t 24 0" stroke-width="2.6"/>`)
    .join('');
  return svg(
    232,
    132,
    `${inkFilter('post', 4)}<g filter="url(#ink-post)" fill="none" stroke="${NAVY}">
      <circle cx="66" cy="66" r="58" stroke-width="3"/><circle cx="66" cy="66" r="40" stroke-width="1.4"/>
      <path id="pm-arc" d="M 66 66 m -49 0 a 49 49 0 1 1 98 0 a 49 49 0 1 1 -98 0" stroke="none"/>
      <text font-family="IBM Plex Mono, monospace" font-size="9.5" letter-spacing="1.7" fill="${NAVY}" stroke="none"><textPath href="#pm-arc">MAISON RÉTRO ✦ PARIS ✦ CORRESPONDANCE ✦</textPath></text>
      <text x="66" y="63" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${NAVY}" stroke="none" letter-spacing="1">${dm}</text>
      <text x="66" y="81" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="${NAVY}" stroke="none" letter-spacing="2">${y}</text>
      ${waves}
    </g>`
  );
}

function parAvion() {
  return svg(
    200,
    78,
    `${inkFilter('air', 7)}<g filter="url(#ink-air)">
      <rect x="3" y="3" width="194" height="72" rx="4" fill="none" stroke="${NAVY}" stroke-width="3"/>
      <rect x="10" y="10" width="180" height="58" fill="none" stroke="${NAVY}" stroke-width="1.2"/>
      <text x="100" y="44" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="25" letter-spacing="3" fill="${NAVY}">PAR AVION</text>
      <text x="100" y="60" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="4" fill="${NAVY}">BY AIR MAIL</text>
    </g>`
  );
}

function confidentiel() {
  return svg(
    236,
    70,
    `${inkFilter('conf', 11)}<g filter="url(#ink-conf)" transform="rotate(-0.5 118 35)">
      <rect x="3" y="3" width="230" height="64" fill="none" stroke="${OX}" stroke-width="4"/>
      <rect x="10" y="10" width="216" height="50" fill="none" stroke="${OX}" stroke-width="1.3"/>
      <text x="118" y="45" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="21" letter-spacing="3" fill="${OX}">CONFIDENTIEL</text>
    </g>`
  );
}

function received() {
  const { dm, y } = today();
  return svg(
    176,
    112,
    `${inkFilter('rec', 21)}<g filter="url(#ink-rec)" fill="${OX}">
      <rect x="3" y="3" width="170" height="106" rx="10" fill="none" stroke="${OX}" stroke-width="3"/>
      <text x="88" y="27" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="5">RECEIVED</text>
      <line x1="14" y1="36" x2="162" y2="36" stroke="${OX}" stroke-width="1.4"/>
      <text x="88" y="68" text-anchor="middle" font-family="Georgia, serif" font-size="26" letter-spacing="2">${dm} ${y.slice(2)}</text>
      <line x1="14" y1="80" x2="162" y2="80" stroke="${OX}" stroke-width="1.4"/>
      <text x="88" y="98" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="3">Nº 0042 · MAISON</text>
    </g>`
  );
}

function waxSeal() {
  // irregular wax blob
  const pts = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 52 + Math.sin(i * 2.7) * 3.5 + Math.cos(i * 1.3) * 2.5;
    pts.push(`${(62 + Math.cos(a) * r).toFixed(1)},${(62 + Math.sin(a) * r).toFixed(1)}`);
  }
  return svg(
    124,
    124,
    `<defs>
      <radialGradient id="wax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#b3463b"/><stop offset=".45" stop-color="#7d2019"/><stop offset="1" stop-color="#3e0c09"/></radialGradient>
      <radialGradient id="waxIn" cx="60%" cy="65%" r="70%"><stop offset="0" stop-color="#8a2a22"/><stop offset="1" stop-color="#4f110d"/></radialGradient>
    </defs>
    <polygon points="${pts.join(' ')}" fill="url(#wax)" stroke="#3a0b08" stroke-width="1"/>
    <circle cx="62" cy="62" r="38" fill="url(#waxIn)"/>
    <circle cx="62" cy="62" r="38" fill="none" stroke="#c45a4d" stroke-opacity=".45" stroke-width="1.5"/>
    <circle cx="62" cy="62" r="33" fill="none" stroke="#2e0806" stroke-opacity=".6" stroke-width="1"/>
    <text x="63" y="74" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="34" fill="#2e0806" fill-opacity=".7">MR</text>
    <text x="62" y="72" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="34" fill="#d1786a" fill-opacity=".55">MR</text>
    <ellipse cx="44" cy="36" rx="14" ry="6" fill="#fff" fill-opacity=".18" transform="rotate(-30 44 36)"/>`
  );
}

function postage() {
  const W = 98;
  const H = 120;
  const holes = [];
  for (let x = 6; x <= W; x += 9.2) holes.push(`<circle cx="${x}" cy="0" r="3.3"/><circle cx="${x}" cy="${H}" r="3.3"/>`);
  for (let y = 6; y <= H; y += 9.2) holes.push(`<circle cx="0" cy="${y}" r="3.3"/><circle cx="${W}" cy="${y}" r="3.3"/>`);
  let petals = '';
  for (let i = 0; i < 14; i++) petals += `<ellipse cx="49" cy="44" rx="4.2" ry="13" fill="#f7f1e4" transform="rotate(${(i * 360) / 14} 49 58)"/>`;
  return svg(
    W,
    H,
    `<defs><mask id="perf"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000">${holes.join('')}</g></mask></defs>
    <g mask="url(#perf)">
      <rect width="${W}" height="${H}" fill="#f3ead6"/>
      <rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="#6f8571"/>
      <rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="#2d3a2f" stroke-width=".8"/>
      <path d="M8 ${H - 32} Q 30 ${H - 44} 49 ${H - 36} T ${W - 8} ${H - 40} V ${H - 8} H 8 Z" fill="#56695a"/>
      <line x1="49" y1="62" x2="52" y2="${H - 30}" stroke="#2d3a2f" stroke-width="1.6"/>
      ${petals}
      <circle cx="49" cy="58" r="6.5" fill="#d9a441"/>
      <text x="14" y="24" font-family="Georgia, serif" font-size="15" fill="#f3ead6">50</text>
      <text x="49" y="${H - 14}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="6.4" letter-spacing="1.5" fill="#f3ead6">MAISON POSTE</text>
    </g>`
  );
}

export const STAMPS = [
  { id: 'post', label: 'Postmark', make: postmark, w: 232, h: 132 },
  { id: 'air', label: 'Par Avion', make: parAvion, w: 200, h: 78 },
  { id: 'wax', label: 'Wax Seal', make: waxSeal, w: 124, h: 124 },
  { id: 'stamp', label: 'Postage', make: postage, w: 98, h: 120 },
  { id: 'rec', label: 'Received', make: received, w: 176, h: 112 },
  { id: 'conf', label: 'Confidentiel', make: confidentiel, w: 236, h: 70 },
];

const cache = {};
export function stampSvg(id) {
  if (!cache[id]) cache[id] = STAMPS.find((s) => s.id === id).make();
  return cache[id];
}
export const stampMeta = (id) => STAMPS.find((s) => s.id === id);

const urls = {};
/** Stamp as an image URL — rasterised once by the browser instead of re-filtering live SVG every frame. */
export function stampUrl(id) {
  if (!urls[id]) urls[id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stampSvg(id));
  return urls[id];
}
