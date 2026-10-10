'use client';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { badge, h1 } from '@/components/ui/styles';
import { percent } from '@/lib/quiz/score';
import { useStore } from '@/lib/storage';
import { lessonKey, type Subject } from '@/lib/subjects';
import { formatExamDate, formatExamTime } from '@/lib/exam';
import { ExamCountdown } from './ExamCountdown';
import { bestMockPercent } from './SubjectCard';

export function SubjectHeader({ subject, lessonSlugs }: { subject: Subject; lessonSlugs: string[] }) {
  const store = useStore();
  const total = lessonSlugs.length;
  const read = lessonSlugs.filter((slug) => store.lessonsRead[lessonKey(subject.id, slug)]).length;
  const best = bestMockPercent(store, subject.id);

  return (
    <div className="flex flex-col gap-3.5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-7">
      <div className="flex flex-col gap-2.5">
        <span className={`${badge} self-start`}>{subject.code}</span>
        <div>
          <h1 className={h1.replace('text-[26px]', 'text-[28px]').replace('leading-[36px]', 'leading-[38px]')}>
            {subject.title}
          </h1>
          <p className="text-[15px] leading-6 text-muted lg:text-[16px]">{subject.titleTh}</p>
        </div>
        {subject.exam && (
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14px] leading-[22px] text-muted">
            <span>
              สอบ Final {formatExamDate(subject.exam)} ·{' '}
              <span className="whitespace-nowrap">{formatExamTime(subject.exam)} น.</span> ·{' '}
              <span className="whitespace-nowrap">ห้อง {subject.exam.room}</span>
            </span>
            <ExamCountdown exam={subject.exam} />
          </p>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-5 lg:gap-10">
        <div className="flex flex-col gap-2 lg:w-[280px]">
          <div className="flex justify-between text-[14px] leading-[22px]">
            <span className="text-muted">
              อ่านแล้ว {read}/{total} หัวข้อ
            </span>
            <b>{percent(read, total)}%</b>
          </div>
          <ProgressBar value={read} max={total} label={`อ่านแล้ว ${read} จาก ${total} หัวข้อ`} />
        </div>
        <div className="text-right lg:text-left">
          <p className="text-[12px] leading-[18px] text-faint">Mock สูงสุด</p>
          <b className="text-[20px] leading-[30px] lg:text-[24px]">{best === null ? '—' : `${best}%`}</b>
        </div>
      </div>
    </div>
  );
}
