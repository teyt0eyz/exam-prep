import type { Store } from './storage';

/** Correct over answered across every finished attempt, or null before the first one. */
export function overallAccuracy(store: Store): { correct: number; total: number } | null {
  const total = store.history.reduce((n, a) => n + a.total, 0);
  if (total === 0) return null;
  return { correct: store.history.reduce((n, a) => n + a.correct, 0), total };
}
