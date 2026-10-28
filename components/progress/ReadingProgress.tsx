'use client';

import { useEffect, useRef } from 'react';

/** Thin accent bar at the top of the viewport: how far through the article you are. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = target.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / span));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px] lg:left-[260px]">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-accent" />
    </div>
  );
}
