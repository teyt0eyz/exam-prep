'use client';

import { useSyncExternalStore } from 'react';
import { chip } from '@/components/ui/styles';
import { examCountdown, type Urgency } from '@/lib/exam';
import type { Exam } from '@/lib/subjects';

const TICK_MS = 30_000;

function subscribe(listener: () => void): () => void {
  const id = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(id);
}
// Rounded to the tick so the snapshot is stable between renders.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/** Current time, refreshed twice a minute. Null on the server and during hydration. */
export function useNow(): number | null {
  return useSyncExternalStore<number | null>(subscribe, getSnapshot, () => null);
}

const tone: Record<Urgency, string> = {
  far: 'bg-accent-soft text-accent',
  near: 'bg-warn-soft text-warn',
  urgent: 'bg-bad-soft text-bad',
  done: 'bg-surface-2 text-muted',
};

/** Chip counting down to the exam: days, then hours and minutes on the day. */
export function ExamCountdown({ exam, className = '' }: { exam: Exam; className?: string }) {
  const now = useNow();
  const countdown = now === null ? null : examCountdown(exam, now);
  return (
    <span
      className={`${chip} whitespace-nowrap font-semibold ${countdown ? tone[countdown.urgency] : 'bg-surface-2 text-faint'} ${className}`}
    >
      {countdown ? countdown.text : 'เหลืออีก – วัน'}
    </span>
  );
}
