import { useEffect, useRef } from 'react';

/** Follows the pointer and gently rotates its content in 3D, as if leaning over the desk. */
export default function Tilt({ children, max = 6, base = '', className = '', style }) {
  const ref = useRef(null);
  useEffect(() => {
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf;
    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      if (ref.current) {
        ref.current.style.setProperty('--rx', `${(-cy * max).toFixed(3)}deg`);
        ref.current.style.setProperty('--ry', `${(cx * max).toFixed(3)}deg`);
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [max]);
  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      style={{ ...style, transform: `${base} rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))` }}
    >
      {children}
    </div>
  );
}
