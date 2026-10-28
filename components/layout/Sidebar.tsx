'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { learningProgress } from '@/lib/progress';
import { useHydrated, useStore } from '@/lib/storage';
import { SUBJECTS } from '@/lib/subjects';
import { Brand } from './Brand';

const item =
  'group relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] text-muted transition-colors hover:bg-surface-2 hover:text-ink';
const active = 'bg-surface text-ink font-semibold shadow-card ring-1 ring-line';

/** Desktop navigation (>= lg). Each subject shows its real learning progress as a thin bar. */
export function Sidebar({ lessonSlugs }: { lessonSlugs: Record<string, string[]> }) {
  const pathname = usePathname();
  const store = useStore();
  const hydrated = useHydrated();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col gap-1 overflow-y-auto border-r border-line bg-canvas/80 px-4 py-6 backdrop-blur-sm lg:flex">
      <Brand className="mb-6 px-2" />
      <nav className="flex flex-col gap-1" aria-label="เมนูหลัก">
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className={`${item} ${pathname === '/' ? active : ''}`}>
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1Z" />
            </svg>
          </span>
          ภาพรวม
        </Link>
        <p className="px-3 pb-1 pt-6 text-[12px] font-medium tracking-wide text-faint">วิชา</p>
        {SUBJECTS.map((s) => {
          const isActive = pathname.startsWith(`/${s.id}/`);
          const p = learningProgress(store, s.id, lessonSlugs[s.id] ?? []);
          return (
            <Link
              key={s.id}
              href={`/${s.id}/`}
              data-accent={s.accent}
              aria-current={isActive ? 'page' : undefined}
              className={`${item} ${isActive ? active : ''} flex-col items-stretch justify-center gap-1 py-2`}
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full bg-accent" />
                <span className="min-w-0 flex-1 truncate">{s.short}</span>
                <span className="font-mono text-[11px] text-faint">{hydrated ? `${p.percent}%` : ''}</span>
              </span>
              <span aria-hidden="true" className="ml-[22px] block h-[3px] overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                  style={{ width: `${hydrated ? p.percent : 0}%` }}
                />
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <p className="px-3 text-[12px] leading-[18px] text-faint">ความคืบหน้าเก็บไว้ในเบราว์เซอร์เครื่องนี้</p>
    </aside>
  );
}
