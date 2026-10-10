import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import type { Question } from './quiz/types';
import { QUIZ_SETS } from './subjects';

// Build-time only (server components / generateStaticParams). Never import from client code.

const CONTENT_DIR = path.join(process.cwd(), 'content');

export interface LessonMeta {
  title: string;
  summary?: string;
  /** Mark content outside the syllabus ("เสริม"). */
  extra?: boolean;
  /** Lessons with the same chapter number are grouped on the subject page. */
  chapter?: { no: number; title: string; /** Shown instead of "บทที่ N", e.g. "บทที่ 1–2" or "ส่วน OOP". */ label?: string };
  /** Estimated reading time. */
  minutes?: number;
  /** Has an interactive simulation. */
  sim?: boolean;
}

/** "บทที่ 5", or the chapter's own label. */
export const chapterLabel = (chapter: NonNullable<LessonMeta['chapter']>) => chapter.label ?? `บทที่ ${chapter.no}`;

export interface Lesson {
  slug: string;
  meta: LessonMeta;
}

interface LessonModule {
  default: ComponentType;
  meta?: Partial<LessonMeta>;
}

/** Lesson slugs for a subject, ordered by filename (prefix files with 01-, 02-, ...). */
export function listLessonSlugs(subject: string): string[] {
  const dir = path.join(CONTENT_DIR, subject);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.slice(0, -'.mdx'.length))
    .sort();
}

export async function loadLesson(subject: string, slug: string) {
  const mod = (await import(`@/content/${subject}/${slug}.mdx`)) as LessonModule;
  const meta: LessonMeta = { ...mod.meta, title: mod.meta?.title ?? slug };
  return { Content: mod.default, meta };
}

export async function listLessons(subject: string): Promise<Lesson[]> {
  return Promise.all(
    listLessonSlugs(subject).map(async (slug) => ({
      slug,
      meta: (await loadLesson(subject, slug)).meta,
    })),
  );
}

const quizPath = (subject: string, set: number) =>
  path.join(CONTENT_DIR, subject, 'quiz', `set-${set}.json`);

/** Which of sets 1-3 exist for a subject. */
export function listQuizSets(subject: string): number[] {
  return QUIZ_SETS.filter((set) => fs.existsSync(quizPath(subject, set)));
}

/** Shape is enforced by `npm run validate:quiz`, which runs before every build. */
export function loadQuizSet(subject: string, set: number): Question[] {
  return JSON.parse(fs.readFileSync(quizPath(subject, set), 'utf8')) as Question[];
}

/** "set-2" -> 2 */
export function parseSetParam(param: string): number | undefined {
  const match = /^set-(\d+)$/.exec(param);
  const n = match ? Number(match[1]) : NaN;
  return (QUIZ_SETS as readonly number[]).includes(n) ? n : undefined;
}
