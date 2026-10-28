import type { AccentKey } from '@/lib/subjects';

/** One subject as the room sees it. Every number comes from the progress store. */
export interface RoomBook {
  id: string;
  code: string;
  short: string;
  titleTh: string;
  accent: AccentKey;
  href: string;
  percent: number;
  lessonsRead: number;
  lessons: number;
  /** Every lesson read and every mock finished. */
  complete: boolean;
  /** Subject of the lesson opened most recently. */
  recent: boolean;
  /** Nothing read or taken yet / some progress / everything done. */
  status: 'new' | 'progress' | 'done';
}

export interface RoomBoard {
  /** Next exam that has not ended, if any. */
  nextExam: { code: string; day: number; month: string; weekday: string; countdown: string } | null;
  lessonsRead: number;
  lessons: number;
  setsDone: number;
  sets: number;
  percent: number;
  /** Correct answers over all finished mock attempts, or null before the first. */
  accuracy: number | null;
}
