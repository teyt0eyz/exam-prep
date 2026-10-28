'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Brand } from '@/components/layout/Brand';
import { MenuButton } from '@/components/layout/MenuButton';
import { PomodoroButton } from '@/components/pomodoro/PomodoroButton';
import { useNow } from '@/components/progress/ExamCountdown';
import { ChevronRightIcon } from '@/components/ui/icons';
import { overallAccuracy } from '@/lib/activity';
import { MONTHS, WEEKDAYS, examCountdown } from '@/lib/exam';
import { nextStep, upcomingSubjects, type StepSubject } from '@/lib/next-step';
import { learningProgress } from '@/lib/progress';
import { percent } from '@/lib/quiz/score';
import { useHydrated, useStore } from '@/lib/storage';
import { BOOK_STYLE } from '@/lib/subject-style';
import { getSubject } from '@/lib/subjects';
import type { RoomBoard, RoomBook } from './types';

const RETURN_KEY = 'examprep:room-opened';

type Support = 'checking' | 'webgl' | 'none';

const Scene = dynamic(() => import('./StudyRoomScene'), {
  ssr: false,
  loading: () => <RoomLoading />,
});

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function session(action: 'take' | 'set', value?: string): string | null {
  try {
    if (action === 'set' && value) window.sessionStorage.setItem(RETURN_KEY, value);
    const v = window.sessionStorage.getItem(RETURN_KEY);
    if (action === 'take') window.sessionStorage.removeItem(RETURN_KEY);
    return v;
  } catch {
    return null;
  }
}

const chrome = 'border border-white/70 bg-white/80 shadow-lift backdrop-blur-md';

/**
 * The home page is the study room, edge to edge. Each subject is a book on the
 * desk; opening one plays a short camera move and cover swing, then goes to the
 * real subject page. Navigation lives in the menu sheet; a keyboard list of the
 * books appears on focus; without WebGL the books stand on a drawn shelf.
 */
export function StudyRoom({ subjects }: { subjects: StepSubject[] }) {
  const store = useStore();
  const hydrated = useHydrated();
  const nowMs = useNow();
  const router = useRouter();

  const [support, setSupport] = useState<Support>('checking');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lite, setLite] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const small = window.matchMedia('(max-width: 1023px), (pointer: coarse)');
    const sync = () => {
      setReducedMotion(rm.matches);
      setLite(small.matches);
    };
    sync();
    rm.addEventListener('change', sync);
    small.addEventListener('change', sync);
    setReturning(session('take'));
    setSupport(webglAvailable() ? 'webgl' : 'none');
    return () => {
      rm.removeEventListener('change', sync);
      small.removeEventListener('change', sync);
    };
  }, []);

  const progress = useMemo(
    () => subjects.map((s) => ({ id: s.id, p: learningProgress(store, s.id, s.lessons.map((l) => l.slug)) })),
    [subjects, store],
  );

  const books: RoomBook[] = useMemo(
    () =>
      progress.flatMap(({ id, p }) => {
        const s = getSubject(id);
        if (!s) return [];
        const pct = hydrated ? p.percent : 0;
        return [
          {
            id,
            code: s.code,
            short: s.short,
            titleTh: s.titleTh,
            accent: s.accent,
            href: `/${id}/`,
            percent: pct,
            lessonsRead: hydrated ? p.lessonsRead : 0,
            lessons: p.lessons,
            complete: hydrated && pct === 100,
            recent: hydrated && store.last?.subject === id,
            status: pct === 100 ? 'done' : pct > 0 ? 'progress' : 'new',
          },
        ];
      }),
    [progress, store, hydrated],
  );

  const upcoming = useMemo(() => upcomingSubjects(subjects.map((s) => s.id), nowMs), [subjects, nowMs]);
  const nearest = upcoming[0];
  const nearestCountdown = nearest?.exam && nowMs !== null ? examCountdown(nearest.exam, nowMs) : null;

  const board: RoomBoard = useMemo(() => {
    const t = progress.reduce(
      (acc, { p }) => ({ lr: acc.lr + p.lessonsRead, l: acc.l + p.lessons, sd: acc.sd + p.setsDone, s: acc.s + p.sets }),
      { lr: 0, l: 0, sd: 0, s: 0 },
    );
    const acc = overallAccuracy(store);
    const [y = 0, m = 1, d = 1] = nearest?.exam ? nearest.exam.date.split('-').map(Number) : [];
    return {
      nextExam:
        nearest?.exam && nearestCountdown
          ? {
              code: nearest.code,
              day: d,
              month: `${MONTHS[m - 1]} ${y + 543}`,
              weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '',
              countdown: nearestCountdown.text,
            }
          : null,
      lessonsRead: hydrated ? t.lr : 0,
      lessons: t.l,
      setsDone: hydrated ? t.sd : 0,
      sets: t.s,
      percent: hydrated ? percent(t.lr + t.sd, t.l + t.s) : 0,
      accuracy: hydrated && acc ? percent(acc.correct, acc.total) : null,
    };
  }, [progress, store, hydrated, nearest, nearestCountdown]);

  const step = hydrated ? nextStep(store, subjects, upcoming) : null;
  const animated = support === 'webgl' && !reducedMotion;

  const go = useCallback(
    (id: string) => {
      session('set', id);
      router.push(`/${id}/`);
    },
    [router],
  );

  const open = useCallback(
    (id: string) => {
      if (opening) return;
      setSelected(id);
      if (!animated) {
        go(id);
        return;
      }
      router.prefetch(`/${id}/`);
      setOpening(id);
    },
    [animated, go, opening, router],
  );

  // Never leave someone waiting on the animation; Esc cancels it.
  useEffect(() => {
    if (!opening) return;
    const t = window.setTimeout(() => go(opening), 2600);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpening(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [opening, go]);

  const onLinkClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open(id);
  };

  const current = books.find((b) => b.id === selected) ?? null;

  return (
    <main className="room-stage fixed inset-0 h-dvh w-screen overflow-hidden">
      <h1 className="sr-only">ห้องอ่านหนังสือ: เลือกหนังสือบนโต๊ะเพื่อเข้าเรียนวิชานั้น</h1>

      {support === 'webgl' ? (
        <div className="absolute inset-0" aria-hidden="true">
          <Scene
            books={books}
            board={board}
            selected={selected}
            opening={opening}
            returning={returning}
            reducedMotion={reducedMotion}
            lite={lite}
            onSelect={(id) => setSelected(id)}
            onOpen={open}
            onOpened={go}
          />
        </div>
      ) : support === 'none' ? (
        <PaperShelf books={books} onLinkClick={onLinkClick} />
      ) : (
        <RoomLoading />
      )}

      {/* Top bar: brand on the left, next exam and the menu on the right */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-5 sm:pt-5">
        <div className={`pointer-events-auto rounded-full py-0.5 pl-1.5 pr-1.5 sm:pl-2 sm:pr-4 ${chrome}`}>
          <Brand className="[&_b]:hidden sm:[&_b]:inline" />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {nearest && nearestCountdown ? (
            <Link
              href={`/${nearest.id}/`}
              data-accent={nearest.accent}
              className={`press flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[13px] leading-4 ${chrome}`}
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-acc-grad" />
              <span>
                <span className="hidden sm:inline">สอบถัดไป </span>
                <b className="font-mono text-accent">{nearest.code}</b>{' '}
                <span className="font-semibold">{nearestCountdown.text.replace('เหลือ', '')}</span>
              </span>
            </Link>
          ) : null}
          <PomodoroButton />
          <MenuButton />
        </div>
      </header>

      {/* Bottom: what to do, or the chosen book */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:pb-6">
        {current && !opening && support === 'webgl' ? (
          <div
            key={current.id}
            data-accent={current.accent}
            className={`animate-rise pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-[22px] p-3 ${chrome}`}
          >
            <span aria-hidden="true" className="h-12 w-2 flex-none rounded-full bg-acc-grad" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-[22px]">
                <span className="font-mono text-[13px] text-accent">{current.code}</span> {current.short}
              </p>
              <p className="truncate text-[12px] leading-[18px] text-muted">{current.titleTh}</p>
              <p className="text-[12px] leading-[18px] text-muted">
                อ่านแล้ว {current.lessonsRead}/{current.lessons} บท · {current.percent}%
              </p>
            </div>
            <Link
              href={current.href}
              onClick={(e) => onLinkClick(e, current.id)}
              className="press inline-flex min-h-11 flex-none items-center rounded-xl bg-acc-grad px-4 text-[14px] font-semibold text-ink shadow-card"
            >
              เปิดหนังสือ
            </Link>
          </div>
        ) : opening ? (
          <p role="status" className={`rounded-full px-4 py-2 text-[13px] text-muted ${chrome}`}>
            กำลังเปิดหนังสือ… <span className="hidden sm:inline">(Esc เพื่อยกเลิก)</span>
          </p>
        ) : (
          <>
            {support === 'webgl' ? (
              <p className={`rounded-full px-4 py-1.5 text-[13px] font-medium text-ink ${chrome}`}>
                เลือกหนังสือบนโต๊ะเพื่อเริ่มอ่าน
              </p>
            ) : null}
            {step ? (
              <Link
                href={step.href}
                data-accent={step.subject.accent}
                className={`press pointer-events-auto flex min-h-11 max-w-full items-center gap-2 rounded-full py-1 pl-1.5 pr-3 ${chrome}`}
              >
                <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-acc-grad text-ink">
                  <ChevronRightIcon width={16} height={16} strokeWidth={2.6} />
                </span>
                <span className="min-w-0 truncate text-[13px] leading-5">
                  <b className="text-accent">{step.kicker}</b> {step.title}
                </span>
              </Link>
            ) : null}
          </>
        )}

        {/* Keyboard path to the books: hidden until something in it has focus. */}
        <nav aria-label="เลือกวิชา" className="sr-only focus-within:not-sr-only pointer-events-auto">
          <ul className={`flex flex-wrap justify-center gap-1.5 rounded-[22px] p-2 ${chrome}`}>
            {books.map((b) => (
              <li key={b.id} data-accent={b.accent}>
                <Link
                  href={b.href}
                  onClick={(e) => onLinkClick(e, b.id)}
                  onFocus={() => support === 'webgl' && setSelected(b.id)}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13px] hover:bg-surface-2"
                >
                  <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-acc-grad" />
                  <b className="font-mono text-accent">{b.code}</b>
                  <span className="sr-only">
                    {b.short} อ่านแล้ว {b.percent}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}

function RoomLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center" role="status">
      <div className="flex flex-col items-center gap-3 text-[14px] text-muted">
        <span aria-hidden="true" className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-grad-brand"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        กำลังจัดห้องอ่านหนังสือ…
      </div>
    </div>
  );
}

/** Without WebGL: the books stand on a drawn shelf, each one a link. */
function PaperShelf({
  books,
  onLinkClick,
}: {
  books: RoomBook[];
  onLinkClick: (e: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-24 pt-20">
      <p className="mb-6 text-[15px] font-medium text-muted">เลือกหนังสือเพื่อเริ่มอ่าน</p>
      <ul className="flex items-end justify-center gap-2 sm:gap-4">
        {books.map((b, i) => {
          const st = BOOK_STYLE[b.accent];
          return (
            <li key={b.id} style={{ transform: `rotate(${[-2, 1, -1, 2, 0][i % 5]}deg)` }}>
              <Link
                href={b.href}
                onClick={(e) => onLinkClick(e, b.id)}
                className="lift flex h-[220px] w-[58px] flex-col items-center justify-between rounded-[8px] px-1 py-3 text-ink shadow-lift sm:h-[300px] sm:w-[86px]"
                style={{ background: `linear-gradient(160deg, ${st.from}, ${st.to})` }}
                aria-label={`${b.code} ${b.short} อ่านแล้ว ${b.percent}%`}
              >
                <span className="font-mono text-[12px] font-bold sm:text-[14px]">{b.code}</span>
                <span className="text-[11px] font-semibold [writing-mode:vertical-rl] sm:text-[13px]">{b.short}</span>
                <span className="text-[11px] font-semibold">{b.percent}%</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className="h-4 w-full max-w-[560px] rounded-md bg-[#e9bb8c] shadow-lift" />
    </div>
  );
}
