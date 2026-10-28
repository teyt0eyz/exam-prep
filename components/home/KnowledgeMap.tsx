'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { layoutMap, type MapLayout, type MapSubject } from '@/lib/constellation';
import { useHydrated, useStore } from '@/lib/storage';
import { lessonKey } from '@/lib/subjects';
import type { SceneHandle } from './constellation-scene';

type Mode = 'svg' | 'webgl';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Every lesson is a star, grouped by subject; a star lights up when that lesson
 * is marked read, and the lesson you opened last pulses. The WebGL scene loads
 * lazily once the map is on screen; until then, without WebGL, or with reduced
 * motion, the same layout is drawn as a still SVG.
 */
export function KnowledgeMap({ subjects }: { subjects: MapSubject[] }) {
  const store = useStore();
  const hydrated = useHydrated();
  const layout = useMemo(
    () =>
      layoutMap(
        subjects,
        (subject, slug) => hydrated && !!store.lessonsRead[lessonKey(subject, slug)],
        hydrated ? store.last : undefined,
      ),
    [subjects, store, hydrated],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const layoutRef = useRef<MapLayout>(layout);
  const [mode, setMode] = useState<Mode>('svg');

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !webglAvailable()) return;

    let cancelled = false;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import('./constellation-scene')
        .then(({ createScene }) => {
          const canvas = canvasRef.current;
          if (cancelled || !canvas) return;
          sceneRef.current = createScene(canvas, layoutRef.current);
          setMode('webgl');
        })
        .catch(() => {
          // Stay on the SVG map.
        });
    });
    io.observe(wrap);
    return () => {
      cancelled = true;
      io.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    layoutRef.current = layout;
    sceneRef.current?.update(layout);
  }, [layout]);

  const counts = subjects.map((s) => ({
    ...s,
    read: hydrated ? s.lessons.filter((l) => store.lessonsRead[lessonKey(s.id, l.slug)]).length : 0,
  }));
  const totalRead = counts.reduce((n, s) => n + s.read, 0);
  const total = counts.reduce((n, s) => n + s.lessons.length, 0);

  return (
    <figure className="flex flex-col gap-3">
      <div ref={wrapRef} className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
        <MapSvg layout={layout} hidden={mode === 'webgl'} />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
            mode === 'webgl' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
      <figcaption className="flex flex-col gap-2">
        <p className="text-[13px] leading-5 text-muted">
          แผนที่ความรู้: หนึ่งจุดคือหนึ่งบทเรียน จุดทึบคือบทที่อ่านแล้ว
          {hydrated ? ` (${totalRead} จาก ${total} บท)` : ''}
          {hydrated && store.last ? ' · จุดใหญ่คือบทที่เปิดล่าสุด' : ''}
        </p>
        <ul className="flex flex-wrap gap-x-1 gap-y-0.5" aria-label="ความคืบหน้าแยกวิชา">
          {counts.map((s) => (
            <li key={s.id} data-accent={s.accent}>
              <Link
                href={`/${s.id}/`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted hover:bg-surface-2 hover:text-ink"
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
                {s.short}
                <span className="font-mono text-[12px] text-faint">
                  {hydrated ? `${s.read}/${s.lessons.length}` : `–/${s.lessons.length}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** Flat projection of the same layout: shown first, and kept as the fallback. */
function MapSvg({ layout, hidden }: { layout: MapLayout; hidden: boolean }) {
  const sx = (x: number) => x * 10;
  const sy = (y: number) => -y * 10;
  return (
    <svg
      viewBox="-50 -34 100 68"
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${hidden ? 'opacity-0' : 'opacity-100'}`}
    >
      {layout.links.map(([a, b]) => {
        const sa = layout.stars[a];
        const sb = layout.stars[b];
        if (!sa || !sb) return null;
        const lit = sa.read && sb.read;
        return (
          <line
            key={`${a}-${b}`}
            x1={sx(sa.x)}
            y1={sy(sa.y)}
            x2={sx(sb.x)}
            y2={sy(sb.y)}
            stroke={lit ? `var(--acc-${sa.accent})` : 'var(--line-strong)'}
            strokeWidth={0.18}
            strokeOpacity={0.6}
          />
        );
      })}
      {layout.stars.map((s) => (
        <circle
          key={`${s.subject}/${s.slug}`}
          cx={sx(s.x)}
          cy={sy(s.y)}
          r={s.current ? 1.05 : s.read ? 0.75 : 0.48}
          fill={`var(--acc-${s.accent})`}
          fillOpacity={s.read || s.current ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}
