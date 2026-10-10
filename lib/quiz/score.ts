import type { Answers, Question } from './types';

export interface TopicScore {
  topic: string;
  correct: number;
  total: number;
}

export function countCorrect(questions: readonly Question[], answers: Answers): number {
  return questions.reduce((n, q) => n + (answers[q.id] === q.answer ? 1 : 0), 0);
}

/** Per-topic breakdown, weakest topic first. */
export function scoreByTopic(questions: readonly Question[], answers: Answers): TopicScore[] {
  const byTopic = new Map<string, TopicScore>();
  for (const q of questions) {
    const row = byTopic.get(q.topic) ?? { topic: q.topic, correct: 0, total: 0 };
    row.total += 1;
    if (answers[q.id] === q.answer) row.correct += 1;
    byTopic.set(q.topic, row);
  }
  return [...byTopic.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);
}

export const percent = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 100);

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
