import { useEffect, useRef } from 'react';

const canTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Gently rotates its content toward the pointer, as if leaning over the desk.
 * Writes the transform directly (no React re-render, no CSS-variable cascade)
 * and only animates while the pointer is moving. Disabled on touch devices.
 */
export default function Tilt({ children, max = 6, base = '', className = '', style }) {
  const ref = useRef(null);
  const st = useRef({ cx: 0, cy: 0, tx: 0, ty: 0, raf: 0, base });

  const apply = () => {
    const s = st.current;
    if (ref.current) ref.current.style.transform = `${s.base} rotateX(${(-s.cy * max).toFixed(2)}deg) rotateY(${(s.cx * max).toFixed(2)}deg)`;
  };

  // keep base (e.g. scale) in sync without restarting the loop
  useEffect(() => {
    st.current.base = base;
    apply();
  }, [base]);

  useEffect(() => {
    if (!canTilt() || !max) return;
    const s = st.current;
    const loop = () => {
      s.cx += (s.tx - s.cx) * 0.09;
      s.cy += (s.ty - s.cy) * 0.09;
      apply();
      s.raf = Math.abs(s.tx - s.cx) + Math.abs(s.ty - s.cy) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e) => {
      s.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      s.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!s.raf) s.raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      window.removeEventListener('pointermove', onMove);
    };
  }, [max]);

  return (
    <div ref={ref} className={`tilt ${className}`} style={style}>
      {children}
    </div>
  );
}
