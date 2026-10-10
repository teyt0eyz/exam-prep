'use client';

import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { badge, card, h2 } from '@/components/ui/styles';
import { formatExamDate, formatExamTime } from '@/lib/exam';
import { learningProgress } from '@/lib/progress';
import { useStore } from '@/lib/storage';
import type { Exam, Subject } from '@/lib/subjects';
import { ExamCountdown } from './ExamCountdown';

export interface ExamScheduleItem {
  subject: Subject & { exam: Exam };
  lessonSlugs: string[];
}

/** Final exams in date order: learning progress and days left for each subject. */
export function ExamSchedule({ items }: { items: ExamScheduleItem[] }) {
  const store = useStore();
  const sorted = [...items].sort((a, b) =>
    `${a.subject.exam.date}T${a.subject.exam.start}`.localeCompare(`${b.subject.exam.date}T${b.subject.exam.start}`),
  );

  return (
    <section aria-labelledby="exam-schedule" className="flex flex-col gap-3">
      <h2 id="exam-schedule" className={h2}>
        ตารางสอบ Final
      </h2>
      <ul className={`${card} divide-y divide-line overflow-hidden`}>
        {sorted.map(({ subject, lessonSlugs }) => {
          const { exam } = subject;
          const p = learningProgress(store, subject.id, lessonSlugs);
          return (
            <li key={subject.id}>
              <Link
                href={`/${subject.id}/`}
                data-accent={subject.accent}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 px-4 py-4 transition-colors hover:bg-surface-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-x-8 lg:gap-y-1 lg:px-6"
              >
                <p className="flex min-w-0 items-start gap-2 text-[16px] font-semibold leading-6 lg:col-start-1 lg:row-start-1">
                  <span className={`${badge} mt-px flex-none`}>{subject.code}</span>
                  <span className="min-w-0 text-pretty">{subject.short}</span>
                </p>
                <ExamCountdown exam={exam} className="lg:col-start-3 lg:row-span-2 lg:row-start-1" />
                <p className="col-span-2 text-[13px] leading-5 text-muted lg:col-span-1 lg:col-start-1 lg:row-start-2">
                  <span className="whitespace-nowrap">{formatExamDate(exam)}</span> ·{' '}
                  <span className="whitespace-nowrap">{formatExamTime(exam)} น.</span> ·{' '}
                  <span className="whitespace-nowrap">ห้อง {exam.room}</span>
                </p>
                <div className="col-span-2 mt-1.5 flex flex-col gap-1.5 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
                  <div className="flex justify-between gap-3 text-[13px] leading-5">
                    <span className="text-muted">
                      บทเรียน {p.lessonsRead}/{p.lessons} · Mock {p.setsDone}/{p.sets}
                    </span>
                    <b>{p.percent}%</b>
                  </div>
                  <ProgressBar
                    value={p.lessonsRead + p.setsDone}
                    max={p.lessons + p.sets}
                    label={`ความคืบหน้าการเรียนรู้ ${subject.title} ${p.percent}%`}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
