'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SUBJECTS } from '@/lib/subjects';
import { Brand } from './Brand';
import { ThemeToggleRow } from './ThemeToggle';

const item = 'flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] hover:bg-surface-2';
const active = 'bg-surface-2 font-semibold';

/** Desktop navigation (>= lg). On smaller screens each page has its own top bar. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-4 py-6 lg:flex">
      <Brand className="mb-5 px-3" />
      <nav className="flex flex-col gap-1" aria-label="เมนูหลัก">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={`${item} ${pathname === '/' ? active : ''}`}
        >
          หน้าหลัก
        </Link>
        <p className="px-3 pb-1.5 pt-5 text-[12px] font-medium leading-[18px] text-faint">วิชา</p>
        {SUBJECTS.map((s) => {
          const isActive = pathname.startsWith(`/${s.id}/`);
          return (
            <Link
              key={s.id}
              href={`/${s.id}/`}
              aria-current={isActive ? 'page' : undefined}
              className={`${item} ${isActive ? active : ''} ${s.isDemo ? 'text-muted' : ''}`}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 flex-none rounded-[3px]"
                style={{ background: s.isDemo ? 'var(--ink-3)' : `var(--acc-${s.accent})` }}
              />
              {s.short}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <ThemeToggleRow />
    </aside>
  );
}
