'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';
import { useStore } from '@/lib/storage';
import { getSubject } from '@/lib/subjects';

/** "Continue from last time": the most recently opened lesson, if any. */
export function ContinueCard() {
  const last = useStore().last;
  const subject = last ? getSubject(last.subject) : undefined;
  if (!last || !subject) return null;

  return (
    <Link
      href={`/${last.subject}/lesson/${last.slug}/`}
      data-accent={subject.accent}
      className="flex min-h-11 items-center gap-3 rounded-lg bg-accent-soft px-4 py-3.5 lg:max-w-md"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-[18px] text-accent">
          เรียนต่อจากล่าสุด · {subject.code}
        </span>
        <span className="block text-[16px] font-semibold leading-6">{last.title}</span>
      </span>
      <ChevronRightIcon className="flex-none text-accent" strokeWidth={2.2} />
    </Link>
  );
}
