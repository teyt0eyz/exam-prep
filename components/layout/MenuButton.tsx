'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ExamSchedule } from '@/components/progress/ExamSchedule';
import { learningProgress } from '@/lib/progress';
import { useHydrated, useStore } from '@/lib/storage';
import { SUBJECTS } from '@/lib/subjects';
import { Brand } from './Brand';
import { useLessonSlugs } from './NavData';

/**
 * Site navigation, hidden until asked for: a round button that opens a sheet with
 * the study room, every subject with its real progress, and the exam schedule.
 */
export function MenuButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const lessonSlugs = useLessonSlugs();
  const store = useStore();
  const hydrated = useHydrated();
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key !== 'Tab' || !panel.current) return;
      // Keep focus inside the sheet.
      const items = [...panel.current.querySelectorAll<HTMLElement>('a, button')];
      const first = items[0];
      const last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const btn = button.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      btn?.focus();
    };
  }, [open]);

  const exams = SUBJECTS.flatMap((s) =>
    s.exam ? [{ subject: { ...s, exam: s.exam }, lessonSlugs: lessonSlugs[s.id] ?? [] }] : [],
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="เปิดเมนู"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`press grid h-11 w-11 flex-none place-items-center rounded-full border border-white/70 bg-white/80 text-ink shadow-lift backdrop-blur-md hover:bg-white ${className}`}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h12M4 10h12M4 14h8" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="เมนู">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-scrim backdrop-blur-[2px]"
          />
          <div
            ref={panel}
            className="menu-sheet absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col gap-6 overflow-y-auto bg-canvas px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] shadow-float sm:rounded-l-[28px]"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                aria-label="ปิดเมนู"
                onClick={() => setOpen(false)}
                className="press grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2"
              >
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            </div>

            <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
              <Link
                href="/"
                aria-current={pathname === '/' ? 'page' : undefined}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[16px] font-semibold hover:bg-surface-2 aria-[current=page]:bg-surface aria-[current=page]:shadow-card"
              >
                <span aria-hidden="true" className="h-6 w-6 rounded-lg bg-grad-brand" />
                ห้องอ่านหนังสือ
              </Link>
              <p className="px-3 pb-1 pt-4 text-[12px] font-semibold tracking-wide text-faint">วิชา</p>
              {SUBJECTS.map((s) => {
                const p = learningProgress(store, s.id, lessonSlugs[s.id] ?? []);
                const current = pathname.startsWith(`/${s.id}/`);
                return (
                  <Link
                    key={s.id}
                    href={`/${s.id}/`}
                    data-accent={s.accent}
                    aria-current={current ? 'page' : undefined}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2 aria-[current=page]:bg-surface aria-[current=page]:shadow-card"
                  >
                    <span aria-hidden="true" className="h-9 w-2 flex-none rounded-full bg-acc-grad" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <b className="font-mono text-[12px] text-accent">{s.code}</b>
                        <span className="truncate text-[15px] font-medium">{s.short}</span>
                      </span>
                      <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <span className="block h-full rounded-full bg-acc-grad" style={{ width: `${hydrated ? p.percent : 0}%` }} />
                      </span>
                    </span>
                    <span className="w-10 text-right font-mono text-[12px] text-muted">{hydrated ? `${p.percent}%` : '–'}</span>
                  </Link>
                );
              })}
            </nav>

            <ExamSchedule items={exams} />

            <p className="mt-auto text-[12px] leading-[18px] text-faint">
              ความคืบหน้าและประวัติการทำข้อสอบเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
