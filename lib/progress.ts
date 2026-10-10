import { percent } from './quiz/score';
import type { Store } from './storage';
import { QUIZ_SETS, lessonKey, setKey } from './subjects';

export interface LearningProgress {
  lessonsRead: number;
  lessons: number;
  setsDone: number;
  sets: number;
  /** Lessons read plus mock sets finished, over everything there is to do. */
  percent: number;
}

export function learningProgress(store: Store, subjectId: string, lessonSlugs: readonly string[]): LearningProgress {
  const lessonsRead = lessonSlugs.filter((slug) => store.lessonsRead[lessonKey(subjectId, slug)]).length;
  const setsDone = QUIZ_SETS.filter((set) => store.best[setKey(subjectId, set)]).length;
  const lessons = lessonSlugs.length;
  const sets = QUIZ_SETS.length;
  return { lessonsRead, lessons, setsDone, sets, percent: percent(lessonsRead + setsDone, lessons + sets) };
}
