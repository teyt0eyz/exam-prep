'use client';

import { btnInk, btnPrimary, btnSecondary } from '@/components/ui/styles';
import type { Answers, Question } from '@/lib/quiz/types';

interface Props {
  questions: Question[];
  answers: Answers;
  flagged: string[];
  index: number;
  onJump: (index: number) => void;
  confirming: boolean;
  onConfirming: (confirming: boolean) => void;
  onSubmit: () => void;
}

/** "All questions" grid + legend + submit. Used in the mobile sheet and the desktop column. */
export function Navigator({
  questions,
  answers,
  flagged,
  index,
  onJump,
  confirming,
  onConfirming,
  onSubmit,
}: Props) {
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const unanswered = questions.length - answered;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <b className="text-[18px] leading-7 lg:text-[17px]">ข้อสอบทั้งหมด</b>
        <span className="text-[14px] leading-[22px] text-muted">
          ตอบแล้ว {answered}/{questions.length}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2.5">
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const hasFlag = flagged.includes(q.id);
          const current = i === index;
          return (
            <button
              key={q.id}
              type="button"
              aria-current={current ? 'true' : undefined}
              aria-label={`ข้อ ${i + 1}${isAnswered ? ' ตอบแล้ว' : ' ยังไม่ตอบ'}${hasFlag ? ' ทบทวน' : ''}`}
              onClick={() => onJump(i)}
              className={`relative grid h-12 place-items-center rounded-[10px] font-mono text-[15px] font-semibold ${
                isAnswered ? 'bg-accent text-accent-ink' : 'bg-surface text-muted'
              } ${
                current
                  ? 'border-2 border-ink'
                  : isAnswered
                    ? 'border-2 border-transparent'
                    : 'border border-line'
              }`}
            >
              {i + 1}
              {hasFlag ? (
                <span className="absolute right-[5px] top-[5px] h-2 w-2 rounded-[2px] bg-warn" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] leading-5 text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-accent" />
          ตอบแล้ว
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-line" />
          ยังไม่ตอบ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border-2 border-ink" />
          ข้อปัจจุบัน
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-warn" />
          ทบทวน
        </span>
      </div>

      <div className="lg:mt-auto">
        {confirming ? (
          <div>
            <p className="text-[15px] font-medium leading-6">
              {unanswered > 0
                ? `ยังไม่ได้ตอบ ${unanswered} ข้อ — ข้อที่ไม่ตอบจะนับเป็นผิด ยืนยันส่งคำตอบ?`
                : 'ตอบครบทุกข้อแล้ว ยืนยันส่งคำตอบ?'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button type="button" className={btnSecondary} onClick={() => onConfirming(false)}>
                ทำต่อ
              </button>
              <button type="button" className={btnPrimary} onClick={onSubmit}>
                ยืนยันส่ง
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${btnInk} w-full`} onClick={() => onConfirming(true)}>
            ส่งคำตอบ
          </button>
        )}
      </div>
    </>
  );
}
