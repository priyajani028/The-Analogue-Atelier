import { TOP, LH, MARGIN } from './layout';

export const PAPERS = [
  { id: 'ivory', label: 'Ivory Laid', note: 'cotton, 120gsm' },
  { id: 'ruled', label: 'Ruled Note', note: 'feint & margin' },
  { id: 'airmail', label: 'Airmail', note: 'onionskin' },
  { id: 'telegram', label: 'Télégramme', note: 'post office form' },
  { id: 'parchment', label: 'Parchment', note: 'aged, foxed' },
  { id: 'kraft', label: 'Kraft', note: 'brown wrapping' },
];

const BASE = {
  ivory: '#f7f2e6',
  ruled: '#fbfaf5',
  airmail: '#e9eef3',
  telegram: '#f1e2a8',
  parchment: '#ecdcb6',
  kraft: '#c6a57a',
};

function fibers(ctx, w, h, n, alpha, color = '120,100,70') {
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = `rgba(${color},${Math.random() * alpha})`;
    ctx.lineWidth = 0.6;
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * Math.PI;
    const l = 3 + Math.random() * 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

/** Paint a paper type onto a canvas (used for image export). */
export function paintPaper(ctx, type, w, h) {
  ctx.fillStyle = BASE[type] || BASE.ivory;
  ctx.fillRect(0, 0, w, h);
  if (type === 'ivory') {
    ctx.fillStyle = 'rgba(120,100,70,.035)';
    for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
    fibers(ctx, w, h, 260, 0.06);
  }
  if (type === 'ruled') {
    ctx.fillStyle = 'rgba(70,110,170,.35)';
    for (let y = TOP + 25; y < h - 30; y += LH) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = 'rgba(200,60,60,.45)';
    ctx.fillRect(MARGIN - 14, 0, 1, h);
    fibers(ctx, w, h, 120, 0.04);
  }
  if (type === 'airmail') {
    fibers(ctx, w, h, 200, 0.05, '60,80,110');
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.rect(14, 14, w - 28, h - 28);
    ctx.clip('evenodd');
    const cols = ['#c0392b', '#f4f1ea', '#2c4a8a', '#f4f1ea'];
    for (let i = -h; i < w + h; i += 9) {
      ctx.fillStyle = cols[Math.floor(i / 9 + h) % 4];
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 9, 0);
      ctx.lineTo(i + 9 + h, h);
      ctx.lineTo(i + h, h);
      ctx.fill();
    }
    ctx.restore();
  }
  if (type === 'telegram') {
    fibers(ctx, w, h, 160, 0.06);
    ctx.fillStyle = '#2b2a26';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('TÉLÉGRAMME', w / 2, 78);
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('POSTES · TÉLÉGRAPHES · MAISON RÉTRO', w / 2, 100);
    ctx.fillRect(40, 116, w - 80, 2);
    ctx.fillRect(40, 121, w - 80, 1);
    ctx.textAlign = 'left';
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText('Nº 0042', 44, 145);
    ctx.textAlign = 'right';
    ctx.fillText('ORIGINE · PARIS', w - 44, 145);
  }
  if (type === 'parchment') {
    fibers(ctx, w, h, 300, 0.08, '110,75,30');
    for (let i = 0; i < 26; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 4 + Math.random() * 10);
      g.addColorStop(0, 'rgba(140,90,40,.18)');
      g.addColorStop(1, 'rgba(140,90,40,0)');
      ctx.save();
      ctx.translate(Math.random() * w, Math.random() * h);
      ctx.fillStyle = g;
      ctx.fillRect(-15, -15, 30, 30);
      ctx.restore();
    }
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.65);
    v.addColorStop(0, 'rgba(120,70,20,0)');
    v.addColorStop(1, 'rgba(110,60,15,.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (type === 'kraft') {
    fibers(ctx, w, h, 700, 0.12, '80,55,25');
    fibers(ctx, w, h, 200, 0.1, '230,210,170');
  }
}
