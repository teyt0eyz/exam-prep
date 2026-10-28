'use client';

import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { badge, eyebrow, h2 } from '@/components/ui/styles';
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
      <div>
        <p className={eyebrow}>เส้นทางสู่ Final</p>
        <h2 id="exam-schedule" className={h2}>
          ตารางสอบ Final
        </h2>
      </div>
      <ol className="relative flex flex-col gap-3 before:absolute before:bottom-6 before:left-[11px] before:top-6 before:w-0.5 before:rounded-full before:bg-line">
        {sorted.map(({ subject, lessonSlugs }) => {
          const { exam } = subject;
          const p = learningProgress(store, subject.id, lessonSlugs);
          return (
            <li key={subject.id} data-accent={subject.accent} className="relative pl-8">
              <span
                aria-hidden="true"
                className="absolute left-[5px] top-[22px] h-3.5 w-3.5 rounded-full border-[3px] border-canvas bg-accent shadow-[0_0_0_1px_var(--acc)]"
              />
              <Link
                href={`/${subject.id}/`}
                data-accent={subject.accent}
                className="lift grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 rounded-lg border border-line bg-surface px-4 py-4 shadow-card"
              >
                <p className="flex min-w-0 items-start gap-2 text-[16px] font-semibold leading-6">
                  <span className={`${badge} mt-px flex-none`}>{subject.code}</span>
                  <span className="min-w-0 text-pretty">{subject.short}</span>
                </p>
                <ExamCountdown exam={exam} className="" />
                <p className="col-span-2 text-[13px] leading-5 text-muted">
                  <span className="whitespace-nowrap">{formatExamDate(exam)}</span> ·{' '}
                  <span className="whitespace-nowrap">{formatExamTime(exam)} น.</span> ·{' '}
                  <span className="whitespace-nowrap">ห้อง {exam.room}</span>
                </p>
                <div className="col-span-2 mt-1.5 flex flex-col gap-1.5">
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
      </ol>
    </section>
  );
}
