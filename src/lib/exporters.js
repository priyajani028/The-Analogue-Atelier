import { CW, LH, TOP, MARGIN, PAGE_W, PAGE_H, FONT } from './layout';
import { stampSvg, stampMeta } from './stamps';
import { paintPaper } from './papers';

const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

function paperTexture(ctx, w, h, base = '#f7f2e6') {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(120,100,70,${Math.random() * 0.06})`;
    ctx.lineWidth = 0.6;
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * Math.PI;
    const l = 3 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

export async function sheetToPNG(lines, stamps, paper = 'ivory') {
  const s = 2;
  const c = document.createElement('canvas');
  c.width = PAGE_W * s;
  c.height = PAGE_H * s;
  const ctx = c.getContext('2d');
  ctx.scale(s, s);
  paintPaper(ctx, paper, PAGE_W, PAGE_H);
  try {
    await document.fonts.load(FONT);
  } catch {}
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, li) =>
    l.forEach((ch, ci) => {
      if (ch.c === ' ') return;
      ctx.save();
      ctx.translate(MARGIN + ci * CW + CW / 2 + ch.dx, TOP + li * LH + ch.dy + 21);
      ctx.rotate((ch.r * Math.PI) / 180);
      ctx.globalAlpha = ch.o;
      ctx.fillStyle = '#1d1a18';
      ctx.fillText(ch.c, 0, 0);
      ctx.restore();
    })
  );
  for (const st of stamps) {
    try {
      const m = stampMeta(st.type);
      const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stampSvg(st.type)));
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate((st.r * Math.PI) / 180);
      ctx.globalAlpha = st.o;
      ctx.drawImage(img, -m.w / 2, -m.h / 2, m.w, m.h);
      ctx.restore();
    } catch {}
  }
  return c.toDataURL('image/png');
}

export async function polaroidToPNG(src, caption) {
  const W = 900;
  const H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  paperTexture(ctx, W, H, '#f4efe4');
  const img = await loadImg(src);
  ctx.drawImage(img, 50, 50, 800, 800);
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.strokeRect(50.5, 50.5, 799, 799);
  if (caption) {
    try {
      await document.fonts.load('48px "La Belle Aurore"');
    } catch {}
    ctx.font = '48px "La Belle Aurore", cursive';
    ctx.fillStyle = '#2b2622';
    ctx.textAlign = 'center';
    ctx.fillText(caption, W / 2, 975);
  }
  return c.toDataURL('image/jpeg', 0.94);
}

export function download(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** A photo-booth style strip of instants, stacked top to bottom. */
export async function stripToPNG(photos) {
  const W = 640;
  const P = 560;
  const head = 110;
  const cell = P + 90;
  const H = head + photos.length * cell + 70;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  paperTexture(ctx, W, H, '#f4efe4');
  try {
    await Promise.all([document.fonts.load('48px "La Belle Aurore"'), document.fonts.load('italic 40px "Cormorant Garamond"'), document.fonts.load('11px "IBM Plex Mono"')]);
  } catch {}
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2b2622';
  ctx.font = 'italic 40px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Maison Rétro', W / 2, 62);
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#8a7a62';
  const d = new Date();
  ctx.fillText(`INSTANTS · ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`, W / 2, 86);
  for (let i = 0; i < photos.length; i++) {
    const img = await loadImg(photos[i].src);
    const y = head + i * cell;
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillRect(40 + 2, y + 3, P, P);
    ctx.drawImage(img, 40, y, P, P);
    if (photos[i].caption) {
      ctx.font = '34px "La Belle Aurore", cursive';
      ctx.fillStyle = '#2b2622';
      ctx.fillText(photos[i].caption, W / 2, y + P + 52);
    }
  }
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#a3957f';
  ctx.fillText(`Nº ${String(photos.length).padStart(2, '0')} · DEVELOPED BY HAND`, W / 2, H - 30);
  return c.toDataURL('image/jpeg', 0.93);
}
