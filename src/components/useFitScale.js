import { useEffect, useState } from 'react';

export default function useFitScale(width, min = 0.35) {
  const calc = () => Math.max(min, Math.min(1, (window.innerWidth - 24) / width));
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [width]);
  return s;
}
