'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { badge, card } from '@/components/ui/styles';
import { percent } from '@/lib/quiz/score';
import { useStore, type Store } from '@/lib/storage';
import { QUIZ_SETS, lessonKey, setKey, type Subject } from '@/lib/subjects';

interface Props {
  subject: Subject;
  lessonSlugs: string[];
}

/** Highest best-score percentage across the subject's sets, or null if none taken. */
export function bestMockPercent(store: Store, subjectId: string): number | null {
  const scores = QUIZ_SETS.flatMap((set) => {
    const best = store.best[setKey(subjectId, set)];
    return best ? [percent(best.correct, best.total)] : [];
  });
  return scores.length > 0 ? Math.max(...scores) : null;
}

export function SubjectCard({ subject, lessonSlugs }: Props) {
  const store = useStore();
  const total = lessonSlugs.length;
  const read = lessonSlugs.filter((slug) => store.lessonsRead[lessonKey(subject.id, slug)]).length;
  const best = bestMockPercent(store, subject.id);
  const bestLabel = best === null ? '—' : `${best}%`;

  return (
    <Link
      href={`/${subject.id}/`}
      data-accent={subject.accent}
      className={`${card} flex h-full flex-col gap-3.5 p-[18px] transition-colors hover:border-faint lg:gap-[22px] lg:p-7`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={badge}>{subject.code}</span>
        <span className="text-[13px] leading-[18px] text-faint lg:hidden">
          Mock สูงสุด <b className="text-[15px] text-ink">{bestLabel}</b>
        </span>
        <ChevronRightIcon className="hidden text-faint lg:block" strokeWidth={2.2} />
      </div>
      <div>
        <h2 className="text-pretty text-[17px] font-semibold leading-[26px] lg:text-[21px] lg:leading-[30px]">
          {subject.title}
        </h2>
        <p className="text-[14px] leading-[22px] text-muted lg:text-[15px] lg:leading-6">
          {subject.titleTh}
        </p>
      </div>
      <div className="mt-auto grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[14px] leading-[22px]">
            <span className="text-muted">
              อ่านแล้ว {read}/{total} หัวข้อ
            </span>
            <b>{percent(read, total)}%</b>
          </div>
          <ProgressBar value={read} max={total} label={`อ่านแล้ว ${read} จาก ${total} หัวข้อ`} />
        </div>
        <div className="hidden text-right lg:block">
          <p className="text-[12px] font-medium leading-[18px] text-faint">Mock สูงสุด</p>
          <p className="text-[24px] font-semibold leading-[30px]">{bestLabel}</p>
        </div>
      </div>
    </Link>
  );
}
