import type { Store } from './storage';
import { QUIZ_SETS, getSubject, lessonKey, setKey, type Subject } from './subjects';

export interface StepSubject {
  id: string;
  lessons: { slug: string; title: string }[];
}

export interface NextStep {
  kicker: string;
  title: string;
  href: string;
  subject: Subject;
}

const examStart = (s: Subject) => (s.exam ? Date.parse(`${s.exam.date}T${s.exam.start}:00+07:00`) : Infinity);
const examEnd = (s: Subject) => (s.exam ? Date.parse(`${s.exam.date}T${s.exam.end}:00+07:00`) : Infinity);

/** Subjects whose exam has not ended, soonest first. */
export function upcomingSubjects(ids: string[], nowMs: number | null): Subject[] {
  return ids
    .flatMap((id) => {
      const s = getSubject(id);
      return s ? [s] : [];
    })
    .filter((s) => nowMs === null || examEnd(s) > nowMs)
    .sort((a, b) => examStart(a) - examStart(b));
}

/** The one thing to do next, picked only from what the store says is unfinished. */
export function nextStep(store: Store, subjects: StepSubject[], upcoming: Subject[]): NextStep | null {
  const lessonsOf = (id: string) => subjects.find((s) => s.id === id)?.lessons ?? [];
  const unread = (id: string) => lessonsOf(id).filter((l) => !store.lessonsRead[lessonKey(id, l.slug)]);

  const last = store.last;
  const lastSubject = last ? getSubject(last.subject) : undefined;
  if (last && lastSubject) {
    if (!store.lessonsRead[lessonKey(last.subject, last.slug)]) {
      return { kicker: 'อ่านต่อ', title: last.title, href: `/${last.subject}/lesson/${last.slug}/`, subject: lastSubject };
    }
    const lessons = lessonsOf(last.subject);
    const after = lessons.slice(lessons.findIndex((l) => l.slug === last.slug) + 1);
    const next = after.find((l) => !store.lessonsRead[lessonKey(last.subject, l.slug)]);
    if (next) {
      return { kicker: 'บทถัดไป', title: next.title, href: `/${last.subject}/lesson/${next.slug}/`, subject: lastSubject };
    }
  }

  for (const subject of upcoming) {
    const first = unread(subject.id)[0];
    if (first) {
      return {
        kicker: store.last ? `บทที่ยังไม่ได้อ่าน · ${subject.code}` : `เริ่มจากวิชาที่สอบก่อน · ${subject.code}`,
        title: first.title,
        href: `/${subject.id}/lesson/${first.slug}/`,
        subject,
      };
    }
    const set = QUIZ_SETS.find((n) => !store.best[setKey(subject.id, n)]);
    if (set) {
      return { kicker: `ลองทำข้อสอบ · ${subject.code}`, title: `Mock ชุดที่ ${set}`, href: `/${subject.id}/quiz/set-${set}/`, subject };
    }
  }
  return null;
}
