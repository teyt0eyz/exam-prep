'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';
import { Reveal } from '@/components/ui/Reveal';
import type { Lesson } from '@/lib/content';
import { useStore } from '@/lib/storage';
import { lessonKey } from '@/lib/subjects';

interface Chapter {
  no?: number;
  title?: string;
  label?: string;
  lessons: Lesson[];
}

/** Consecutive lessons with the same chapter number form one group. */
function groupByChapter(lessons: Lesson[]): Chapter[] {
  const chapters: Chapter[] = [];
  for (const lesson of lessons) {
    const current = chapters.at(-1);
    if (current && current.no === lesson.meta.chapter?.no) current.lessons.push(lesson);
    else chapters.push({ ...lesson.meta.chapter, lessons: [lesson] });
  }
  return chapters;
}

const statusIcon =
  'grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[14px] font-bold leading-none';

export function LessonList({ subject, lessons }: { subject: string; lessons: Lesson[] }) {
  const store = useStore();
  const isRead = (slug: string) => Boolean(store.lessonsRead[lessonKey(subject, slug)]);

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-5">
      {groupByChapter(lessons).map((chapter, i) => (
        <Reveal
          as="section"
          key={chapter.no ?? `group-${i}`}
          delay={(i % 2) * 60}
          className="glass flex flex-col rounded-[20px] px-4 pb-2 pt-4 lg:px-5 lg:pb-3 lg:pt-5"
        >
          {chapter.no !== undefined ? (
            <div className="flex items-baseline justify-between gap-3 pb-1.5 lg:pb-2">
              <div>
                <p className="text-[12px] font-medium leading-[18px] text-faint">{chapter.label ?? `บทที่ ${chapter.no}`}</p>
                <h3 className="text-[17px] font-semibold leading-[26px]">{chapter.title}</h3>
              </div>
              <span className="flex-none whitespace-nowrap font-mono text-[13px] text-faint">
                {chapter.lessons.filter((l) => isRead(l.slug)).length}/{chapter.lessons.length}
              </span>
            </div>
          ) : null}
          {/* A rail joins the status dots so a chapter reads as a path; done stretches are green. */}
          <ul className="relative">
            {chapter.lessons.map((lesson) => {
              const read = isRead(lesson.slug);
              const inProgress =
                !read && store.last?.subject === subject && store.last.slug === lesson.slug;
              return (
                <li key={lesson.slug} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-[12px] top-0 w-0.5 ${read ? 'bg-ok/45' : 'bg-line'}`}
                  />
                  <Link
                    href={`/${subject}/lesson/${lesson.slug}/`}
                    className={`relative -mx-2.5 flex min-h-14 items-center gap-3.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2 ${
                      inProgress ? 'bg-accent-soft hover:bg-accent-soft' : ''
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`${statusIcon} ${
                        read
                          ? 'bg-ok text-accent-ink'
                          : inProgress
                            ? 'border-2 border-accent bg-surface text-[20px] text-accent'
                            : 'border-2 border-line-strong bg-surface'
                      }`}
                    >
                      {read ? '✓' : inProgress ? '•' : ''}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[16px] leading-6 lg:text-[15px] lg:leading-[22px] ${
                          inProgress ? 'font-semibold' : ''
                        }`}
                      >
                        {lesson.meta.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-[13px] leading-5 text-faint">
                        {lesson.meta.minutes ? <span>{lesson.meta.minutes} นาที</span> : null}
                        {read ? <span>อ่านแล้ว</span> : inProgress ? <span>กำลังอ่าน</span> : null}
                        {lesson.meta.sim ? (
                          <span className="rounded-[5px] border border-line px-1.5 text-[12px] text-muted">
                            Simulation
                          </span>
                        ) : null}
                        {lesson.meta.extra ? (
                          <span className="rounded-[5px] bg-warn-soft px-1.5 text-[12px] text-warn">เสริม</span>
                        ) : null}
                      </span>
                    </span>
                    <ChevronRightIcon
                      className="flex-none text-faint lg:hidden"
                      width={18}
                      height={18}
                      strokeWidth={2.2}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}
