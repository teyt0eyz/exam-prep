'use client';

import { ProgressRing } from '@/components/ui/ProgressRing';
import { badge, h1 } from '@/components/ui/styles';
import { percent } from '@/lib/quiz/score';
import { useHydrated, useStore } from '@/lib/storage';
import { lessonKey, type Subject } from '@/lib/subjects';
import { formatExamDate, formatExamTime } from '@/lib/exam';
import { ExamCountdown } from './ExamCountdown';
import { bestMockPercent } from '@/lib/progress';

export function SubjectHeader({ subject, lessonSlugs }: { subject: Subject; lessonSlugs: string[] }) {
  const store = useStore();
  const total = lessonSlugs.length;
  const read = lessonSlugs.filter((slug) => store.lessonsRead[lessonKey(subject.id, slug)]).length;
  const best = bestMockPercent(store, subject.id);
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-3.5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-7">
      <div className="flex flex-col gap-2.5">
        <span className={`${badge} self-start`}>{subject.code}</span>
        <div>
          <h1 className={`${h1} animate-rise`}>
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
      <div className="flex items-center gap-5 lg:gap-8">
        <ProgressRing
          percent={hydrated ? percent(read, total) : 0}
          size={88}
          stroke={8}
          label={`อ่านแล้ว ${read} จาก ${total} หัวข้อ`}
        >
          <b className="font-display text-[20px] leading-none">{hydrated ? `${percent(read, total)}%` : '–'}</b>
        </ProgressRing>
        <div>
          <p className="text-[12px] leading-[18px] text-faint">อ่านแล้ว</p>
          <b className="text-[20px] leading-[30px] lg:text-[24px]">
            {hydrated ? read : '–'}
            <span className="text-[14px] font-normal text-faint"> / {total} หัวข้อ</span>
          </b>
        </div>
        <div>
          <p className="text-[12px] leading-[18px] text-faint">Mock สูงสุด</p>
          <b className="text-[20px] leading-[30px] lg:text-[24px]">{!hydrated ? '–' : best === null ? 'ยังไม่ทำ' : `${best}%`}</b>
        </div>
      </div>
    </div>
  );
}
