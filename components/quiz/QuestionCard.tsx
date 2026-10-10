'use client';

import { CheckIcon, CrossIcon } from '@/components/ui/icons';
import { CHOICE_LETTERS, type Question } from '@/lib/quiz/types';

interface Props {
  question: Question;
  /** order[displayPosition] = original choice index */
  order: readonly number[];
  /** Original index of the chosen answer. */
  selected: number | undefined;
  onSelect: (originalIndex: number) => void;
  /** Show which choice is right/wrong and stop accepting input. */
  reveal?: boolean;
}

export function QuestionCard({ question, order, selected, onSelect, reveal = false }: Props) {
  return (
    <>
      <span className="self-start rounded-sm bg-accent-soft px-2 py-0.5 text-[12px] font-medium leading-[18px] text-accent">
        {question.topic}
      </span>
      <h2 className="whitespace-pre-wrap text-pretty text-[20px] font-semibold leading-8 lg:text-[24px] lg:leading-[38px]">
        {question.question}
      </h2>

      <div className="flex flex-col gap-2.5 lg:gap-3" role="group" aria-label="ตัวเลือก">
        {order.map((originalIndex, position) => {
          const isSelected = selected === originalIndex;
          const isCorrect = originalIndex === question.answer;
          // Selected/revealed choices get a 2px border; padding shrinks 1px so text doesn't shift.
          let box = 'border border-line bg-surface px-4 py-3 hover:bg-surface-2';
          let dot = 'bg-surface-2 text-muted';
          if (reveal && isCorrect) {
            box = 'border-2 border-ok bg-ok-soft px-[15px] py-[11px]';
            dot = 'bg-ok text-accent-ink';
          } else if (reveal && isSelected) {
            box = 'border-2 border-bad bg-bad-soft px-[15px] py-[11px]';
            dot = 'bg-bad text-accent-ink';
          } else if (isSelected) {
            box = 'border-2 border-accent bg-accent-soft px-[15px] py-[11px]';
            dot = 'bg-accent text-accent-ink';
          }

          return (
            <button
              key={originalIndex}
              type="button"
              aria-pressed={isSelected}
              disabled={reveal}
              onClick={() => onSelect(originalIndex)}
              className={`flex min-h-14 w-full items-center gap-3.5 rounded-[14px] text-left text-ink disabled:cursor-default ${box}`}
            >
              <span
                className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[15px] font-semibold leading-none ${dot}`}
              >
                {CHOICE_LETTERS[position]}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap text-[16px] leading-6 lg:text-[17px] lg:leading-[26px]">
                {question.choices[originalIndex]}
              </span>
              {reveal && isCorrect ? (
                <CheckIcon className="flex-none text-ok" aria-label="คำตอบที่ถูก" />
              ) : reveal && isSelected ? (
                <CrossIcon className="flex-none text-bad" aria-label="คำตอบที่เลือก (ผิด)" />
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
