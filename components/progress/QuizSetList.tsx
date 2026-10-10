'use client';

import Link from 'next/link';
import { btnPrimary, btnSecondary, card } from '@/components/ui/styles';
import { percent } from '@/lib/quiz/score';
import { attemptsFor, useStore } from '@/lib/storage';
import { QUIZ_SETS, setKey } from '@/lib/subjects';

interface Props {
  subject: string;
  /** set number -> question count, for sets that exist */
  questionCounts: Record<number, number>;
  /** Exam minutes allowed per question, for the "N นาที" label. */
  minutesPerQuestion: number;
}

const cta = 'min-h-11 flex-none px-4 text-[15px]';

export function QuizSetList({ subject, questionCounts, minutesPerQuestion }: Props) {
  const store = useStore();

  return (
    <ul className="flex flex-col gap-3">
      {QUIZ_SETS.map((set) => {
        const count = questionCounts[set];
        const best = store.best[setKey(subject, set)];
        const tries = attemptsFor(store, subject, set).length;
        const bestText =
          count === undefined
            ? ''
            : best
              ? `สูงสุด ${percent(best.correct, best.total)}% · ทำแล้ว ${tries} ครั้ง`
              : 'ยังไม่เคยทำ';
        return (
          <li
            key={set}
            className={`${card} flex items-center gap-3 p-4 lg:flex-col lg:items-stretch lg:gap-3.5 lg:p-5 ${
              count === undefined ? 'opacity-60' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold leading-6 lg:text-[17px]">ชุดที่ {set}</p>
              <p className="text-[13px] leading-5 text-faint lg:text-[14px]">
                {count === undefined
                  ? 'กำลังจัดทำ'
                  : `${count} ข้อ · ${Math.round(count * minutesPerQuestion)} นาที`}
              </p>
              <p className="mt-0.5 text-[13px] leading-5 text-muted lg:hidden">
                {bestText}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="hidden text-[14px] leading-[22px] text-muted lg:inline">
                {bestText}
              </span>
              {count === undefined ? (
                <span className="flex min-h-11 flex-none items-center px-2 text-[14px] text-faint">ยังไม่เปิด</span>
              ) : (
                <Link
                  href={`/${subject}/quiz/set-${set}/`}
                  className={`${best ? btnSecondary : btnPrimary} ${cta}`}
                >
                  {best ? 'ทำอีกครั้ง' : 'เริ่มทำ'}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
