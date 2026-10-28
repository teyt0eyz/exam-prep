import type { Store } from './storage';

// Everything here is derived from what the store actually recorded: the date a
// lesson was marked read and the time a mock attempt was finished.

/** Local calendar day, "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type ActivityEvent =
  | { kind: 'lesson'; at: string; subject: string; slug: string }
  | { kind: 'attempt'; at: string; subject: string; set: number; correct: number; total: number };

/** Lessons read and mock attempts, newest first. */
export function activityEvents(store: Store): ActivityEvent[] {
  const lessons: ActivityEvent[] = Object.entries(store.lessonsRead).map(([key, at]) => {
    const cut = key.indexOf('/');
    return { kind: 'lesson', at, subject: key.slice(0, cut), slug: key.slice(cut + 1) };
  });
  const attempts: ActivityEvent[] = store.history.map((a) => ({
    kind: 'attempt',
    at: a.finishedAt,
    subject: a.subject,
    set: a.set,
    correct: a.correct,
    total: a.total,
  }));
  return [...lessons, ...attempts]
    .filter((e) => !Number.isNaN(Date.parse(e.at)))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export interface ActivitySummary {
  /** Count per day for the last 7 days, oldest first; the last entry is today. */
  week: { day: string; date: Date; count: number }[];
  /** Consecutive days with activity, ending today (or yesterday if nothing yet today). */
  streak: number;
  activeDays: number;
}

export function activitySummary(events: ActivityEvent[], now: Date): ActivitySummary {
  const perDay = new Map<string, number>();
  for (const e of events) {
    const k = dayKey(new Date(e.at));
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const day = dayKey(date);
    return { day, date, count: perDay.get(day) ?? 0 };
  });

  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!perDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (perDay.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { week, streak, activeDays: perDay.size };
}

/** Correct over answered across every finished attempt, or null before the first one. */
export function overallAccuracy(store: Store): { correct: number; total: number } | null {
  const total = store.history.reduce((n, a) => n + a.total, 0);
  if (total === 0) return null;
  return { correct: store.history.reduce((n, a) => n + a.correct, 0), total };
}
