export const TAPE_COLORS = [
  { bg: '#3f7d63', lo: '#2c5847' },
  { bg: '#c9573c', lo: '#963c2a' },
  { bg: '#c99a3e', lo: '#94702a' },
  { bg: '#2f3e5c', lo: '#1f2a40' },
  { bg: '#7a2620', lo: '#511713' },
];

/** A cassette drawn in CSS. progress 0→1 moves tape from left reel to right. */
export default function CassetteShell({ color = TAPE_COLORS[0], progress = 0, spinning = false, fast = false, children, side = 'A' }) {
  const lr = 17 + 36 * (1 - progress);
  const rr = 17 + 36 * progress;
  return (
    <div className={`cs ${spinning ? 'spinning' : ''} ${fast ? 'fast' : ''}`} style={{ '--lab': color.bg, '--lab-lo': color.lo }}>
      <i className="cs-screw" style={{ left: 9, top: 9 }} />
      <i className="cs-screw" style={{ right: 9, top: 9 }} />
      <i className="cs-screw" style={{ left: 9, bottom: 9 }} />
      <i className="cs-screw" style={{ right: 9, bottom: 9 }} />
      <div className="cs-label">
        <div className="cs-lo" />
        <div className="cs-stripes l" />
        <div className="cs-stripes r" />
        <div className="cs-write">
          <b>{side}</b>
          {children}
        </div>
        <div className="cs-c60">C60 · Type I</div>
      </div>
      <div className="cs-window">
        <div className="cs-pack" style={{ left: 46 - lr, top: 31 - lr, width: lr * 2, height: lr * 2 }} />
        <div className="cs-pack" style={{ left: 164 - rr, top: 31 - rr, width: rr * 2, height: rr * 2 }} />
        <div className="cs-mid" />
        <div className="cs-hub" style={{ left: 28 }} />
        <div className="cs-hub" style={{ left: 146 }} />
        <div className="cs-glare" />
      </div>
      <div className="cs-bottom">
        <i style={{ left: '22%' }} />
        <i className="sq" style={{ left: '34%' }} />
        <i className="dot" style={{ left: '50%' }} />
        <i className="sq" style={{ left: '62%' }} />
        <i style={{ left: '74%' }} />
      </div>
    </div>
  );
}
